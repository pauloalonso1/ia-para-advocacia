import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    pushName?: string;
  };
}

// CRM Status progression
const CRM_STATUSES = [
  "Novo Contato",
  "Em Atendimento",
  "Qualificado",
  "Não Qualificado",
  "Convertido",
  "Arquivado"
];

// Status mapping for notifications
const STATUS_NOTIFICATION_MAP: Record<string, { key: string; emoji: string; label: string }> = {
  "Novo Contato": { key: "notify_new_lead", emoji: "🆕", label: "Novo Lead" },
  "Em Atendimento": { key: "notify_new_lead", emoji: "💬", label: "Em Atendimento" },
  "Qualificado": { key: "notify_qualified_lead", emoji: "⭐", label: "Lead Qualificado" },
  "Convertido": { key: "notify_contract_signed", emoji: "✅", label: "Convertido" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const payload = await req.json();

    // Handle MESSAGES_UPDATE event (delivery/read status)
    if (payload.event === "messages.update" || payload.event === "MESSAGES_UPDATE") {
      console.log("📨 Message status update received");
      const updates = Array.isArray(payload.data) ? payload.data : [payload.data];
      
      for (const update of updates) {
        const messageId = update?.key?.id;
        const status = update?.status || update?.update?.status;
        if (!messageId || status === undefined) continue;

        // Map Evolution status codes to readable status
        // 1=pending, 2=sent(server), 3=delivered, 4=read, 5=played
        const statusMap: Record<number, string> = { 1: "pending", 2: "sent", 3: "delivered", 4: "read", 5: "read" };
        const mappedStatus = typeof status === "number" ? (statusMap[status] || "sent") : String(status);

        await supabase
          .from("conversation_history")
          .update({ message_status: mappedStatus })
          .eq("external_message_id", messageId);

        console.log(`✅ Updated message ${messageId} to status: ${mappedStatus}`);
      }

      return new Response(JSON.stringify({ status: "status_updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle PRESENCE_UPDATE event (typing indicator)
    if (payload.event === "presence.update" || payload.event === "PRESENCE_UPDATE") {
      console.log("👤 Presence update received");
      // We broadcast presence via Supabase Realtime channel
      const remoteJid = payload.data?.id || payload.data?.remoteJid;
      const presences = payload.data?.presences || payload.data?.participants;
      
      if (remoteJid) {
        const phone = remoteJid.replace("@s.whatsapp.net", "");
        const isTyping = presences 
          ? Object.values(presences).some((p: any) => p?.lastKnownPresence === "composing")
          : false;

        // Broadcast typing status via Realtime
        await supabase.channel("typing-indicators").send({
          type: "broadcast",
          event: "typing",
          payload: { phone, isTyping },
        });

        console.log(`⌨️ ${phone} typing: ${isTyping}`);
      }

      return new Response(JSON.stringify({ status: "presence_handled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract message content (original MESSAGES_UPSERT flow)
    const messageBody =
      payload.data?.message?.conversation ||
      payload.data?.message?.extendedTextMessage?.text;

    if (!messageBody || payload.data?.key?.fromMe) {
      return new Response(JSON.stringify({ status: "ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientPhone = payload.data.key.remoteJid.replace("@s.whatsapp.net", "");
    const clientName = payload.data.pushName || "Cliente";
    const instanceName = payload.instance;
    const incomingMessageId = payload.data.key.id || null;

    console.log(`📩 Message from ${clientPhone}: ${messageBody}`);

    // Resolve the owner and Evolution API credentials from the database (per-user, multi-tenant)
    const { data: instanceSettings } = await supabase
      .from("evolution_api_settings")
      .select("user_id, api_url, api_key")
      .eq("instance_name", instanceName)
      .maybeSingle();

    const ownerId = instanceSettings?.user_id;
    const EVOLUTION_API_URL = instanceSettings?.api_url;
    const EVOLUTION_API_KEY = instanceSettings?.api_key;

    if (!ownerId || !EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.log(`❌ No owner/credentials found for instance: ${instanceName}`);
      return new Response(JSON.stringify({ status: "no_owner" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate: if this message was already processed, skip
    if (incomingMessageId) {
      const { data: existingMsg } = await supabase
        .from("conversation_history")
        .select("id")
        .eq("external_message_id", incomingMessageId)
        .maybeSingle();

      if (existingMsg) {
        console.log(`⏭️ Message ${incomingMessageId} already processed, skipping`);
        return new Response(JSON.stringify({ status: "duplicate" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Find case by phone AND owner
    let { data: existingCase } = await supabase
      .from("cases")
      .select("*, active_agent:agents(*), current_step:agent_script_steps(*)")
      .eq("client_phone", clientPhone)
      .eq("user_id", ownerId)
      .maybeSingle();

    const previousStatus = existingCase?.status;

    // If no case exists, find default agent and create case
    if (!existingCase) {
      console.log("🆕 Creating new case for:", clientPhone);
      
      // Find the first active default agent
      const { data: defaultAgent } = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", ownerId)
        .eq("is_active", true)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();

      const agent = defaultAgent || (await supabase
        .from("agents")
        .select("*")
        .eq("user_id", ownerId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle()).data;

      if (!agent) {
        console.log("❌ No active agents found");
        return new Response(JSON.stringify({ status: "no_agents" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get first step
      const { data: firstStep } = await supabase
        .from("agent_script_steps")
        .select("*")
        .eq("agent_id", agent.id)
        .order("step_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      // Create new case
      const { data: newCase, error: caseError } = await supabase
        .from("cases")
        .insert({
          user_id: agent.user_id,
          client_phone: clientPhone,
          client_name: clientName,
          active_agent_id: agent.id,
          current_step_id: firstStep?.id || null,
          status: "Novo Contato",
          unread_count: 1,
          last_message: messageBody,
          last_message_at: new Date().toISOString(),
        })
        .select("*, active_agent:agents(*), current_step:agent_script_steps(*)")
        .single();

      if (caseError) throw caseError;
      existingCase = newCase;

      console.log("✅ Case created:", newCase.id);

      // Create contact if it doesn't exist
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("user_id", agent.user_id)
        .eq("phone", clientPhone)
        .maybeSingle();

      if (!existingContact) {
        const { data: newContact, error: contactError } = await supabase
          .from("contacts")
          .insert({
            user_id: agent.user_id,
            name: clientName,
            phone: clientPhone,
            source: "WhatsApp",
            tags: ["Lead"],
          })
          .select()
          .single();

        if (contactError) {
          console.error("❌ Error creating contact:", contactError);
        } else {
          console.log("✅ Contact created:", newContact.id);
        }
      } else {
        console.log("📇 Contact already exists:", existingContact.id);
      }

      // Send notification for new lead
      await sendStatusNotification(
        supabase,
        EVOLUTION_API_URL,
        EVOLUTION_API_KEY,
        instanceName,
        agent.user_id,
        clientName,
        clientPhone,
        "Novo Contato"
      );

      // Get rules and send welcome + first step
      const { data: rules } = await supabase
        .from("agent_rules")
        .select("*")
        .eq("agent_id", agent.id)
        .maybeSingle();

      // Send welcome message if available
      if (rules?.welcome_message) {
        const welcomeMsgId = await sendWhatsAppMessage(
          EVOLUTION_API_URL,
          EVOLUTION_API_KEY,
          instanceName,
          clientPhone,
          rules.welcome_message
        );

        await supabase.from("conversation_history").insert({
          case_id: newCase.id,
          role: "assistant",
          content: rules.welcome_message,
          external_message_id: welcomeMsgId,
          message_status: "sent",
        });
      }

      // Send first step message
      if (firstStep) {
        // Delay slightly for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const stepMsgId = await sendWhatsAppMessage(
          EVOLUTION_API_URL,
          EVOLUTION_API_KEY,
          instanceName,
          clientPhone,
          firstStep.message_to_send
        );

        await supabase.from("conversation_history").insert({
          case_id: newCase.id,
          role: "assistant",
          content: firstStep.message_to_send,
          external_message_id: stepMsgId,
          message_status: "sent",
        });
      }

      // Save the incoming message
      await supabase.from("conversation_history").insert({
        case_id: newCase.id,
        role: "client",
        content: messageBody,
        external_message_id: incomingMessageId,
      });

      return new Response(JSON.stringify({ status: "new_case_created" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if agent is active for this case or if paused
    if (!existingCase.active_agent_id || existingCase.is_agent_paused) {
      const reason = !existingCase.active_agent_id ? "no active agent" : "agent paused";
      console.log(`⏸️ ${reason} for case, manual mode`);
      // Save message but don't respond automatically
      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "client",
        content: messageBody,
        external_message_id: incomingMessageId,
      });
      
      // Update unread count and last message
      await supabase
        .from("cases")
        .update({ 
          unread_count: (existingCase.unread_count || 0) + 1,
          last_message: messageBody,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCase.id);
        
      return new Response(JSON.stringify({ status: "manual_mode", reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save incoming message and update last_message
    await supabase.from("conversation_history").insert({
      case_id: existingCase.id,
      role: "client",
      content: messageBody,
      external_message_id: incomingMessageId,
    });
    
    // Update last message info and increment unread count
    await supabase
      .from("cases")
      .update({ 
        unread_count: (existingCase.unread_count || 0) + 1,
        last_message: messageBody,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingCase.id);

    // Reset follow-up counter when client responds
    await supabase
      .from("case_followups")
      .update({ 
        followup_count: 0, 
        last_followup_at: null,
        next_followup_at: null,
        is_paused: false 
      })
      .eq("case_id", existingCase.id);

    // Update status to "Em Atendimento" if still "Novo Contato"
    if (existingCase.status === "Novo Contato") {
      await supabase
        .from("cases")
        .update({ status: "Em Atendimento" })
        .eq("id", existingCase.id);
      existingCase.status = "Em Atendimento";
    }

    // Get agent details
    const agentId = existingCase.active_agent_id;
    const userId = existingCase.user_id;

    // Get rules, steps, FAQs, and history
    const [rulesResult, stepsResult, faqsResult, historyResult] = await Promise.all([
      supabase.from("agent_rules").select("*").eq("agent_id", agentId).maybeSingle(),
      supabase
        .from("agent_script_steps")
        .select("*")
        .eq("agent_id", agentId)
        .order("step_order", { ascending: true }),
      supabase.from("agent_faqs").select("*").eq("agent_id", agentId),
      supabase
        .from("conversation_history")
        .select("*")
        .eq("case_id", existingCase.id)
        .order("created_at", { ascending: true })
        .limit(30),
    ]);

    const rules = rulesResult.data;
    const steps = stepsResult.data || [];
    const faqs = faqsResult.data || [];
    const history = historyResult.data || [];

    console.log(`📋 Agent config - Rules: ${!!rules}, Steps: ${steps.length}, FAQs: ${faqs.length}`);

    // First check if it's an FAQ
    if (faqs.length > 0) {
      const faqMatch = await checkFAQ(LOVABLE_API_KEY, messageBody, faqs);
      if (faqMatch) {
        console.log("📖 FAQ matched");
        const faqMsgId = await sendWhatsAppMessage(
          EVOLUTION_API_URL,
          EVOLUTION_API_KEY,
          instanceName,
          clientPhone,
          faqMatch
        );

        await supabase.from("conversation_history").insert({
          case_id: existingCase.id,
          role: "assistant",
          content: faqMatch,
          external_message_id: faqMsgId,
          message_status: "sent",
        });

        return new Response(JSON.stringify({ status: "faq_answered" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Process with AI
    const currentStep = existingCase.current_step;
    const currentStepIndex = steps.findIndex((s: any) => s.id === currentStep?.id);
    const nextStep = currentStepIndex >= 0 ? steps[currentStepIndex + 1] : steps[0];

    console.log(`📍 Current step: ${currentStepIndex + 1}/${steps.length}`);

    // Check if user has Google Calendar connected
    const { data: calendarToken } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const hasCalendarConnected = !!calendarToken;
    console.log(`📅 Calendar connected: ${hasCalendarConnected}`);

    const aiResponse = await processWithAI(
      LOVABLE_API_KEY,
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      rules,
      currentStep,
      nextStep,
      messageBody,
      history,
      steps,
      existingCase.client_name || clientName,
      clientPhone,
      hasCalendarConnected,
      userId,
      agentId
    );

    console.log(`🤖 AI Response action: ${aiResponse.action}, new_status: ${aiResponse.new_status || 'none'}`);

    // Handle status change if detected
    if (aiResponse.new_status && aiResponse.new_status !== previousStatus) {
      await supabase
        .from("cases")
        .update({ status: aiResponse.new_status })
        .eq("id", existingCase.id);

      console.log(`📊 Status changed: ${previousStatus} -> ${aiResponse.new_status}`);

      // Send notification for status change
      await sendStatusNotification(
        supabase,
        EVOLUTION_API_URL,
        EVOLUTION_API_KEY,
        instanceName,
        userId,
        existingCase.client_name || clientName,
        clientPhone,
        aiResponse.new_status
      );
    }

    // If should proceed to next step, send only the next step message (not AI response to avoid duplication)
    if (aiResponse.action === "PROCEED" && nextStep) {
      console.log(`➡️ Proceeding to step ${nextStep.step_order}`);
      
      await supabase
        .from("cases")
        .update({ current_step_id: nextStep.id })
        .eq("id", existingCase.id);

      // Send next step message (replace {nome} placeholder)
      const nextMessage = nextStep.message_to_send.replace(
        /\{nome\}/gi, 
        existingCase.client_name || clientName
      );

      const proceedMsgId = await sendWhatsAppMessage(
        EVOLUTION_API_URL,
        EVOLUTION_API_KEY,
        instanceName,
        clientPhone,
        nextMessage
      );

      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "assistant",
        content: nextMessage,
        external_message_id: proceedMsgId,
        message_status: "sent",
      });
    } else {
      // Only send AI response when staying on current step
      const stayMsgId = await sendWhatsAppMessage(
        EVOLUTION_API_URL,
        EVOLUTION_API_KEY,
        instanceName,
        clientPhone,
        aiResponse.response_text
      );

      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "assistant",
        content: aiResponse.response_text,
        external_message_id: stayMsgId,
        message_status: "sent",
      });
    }

    return new Response(JSON.stringify({ status: "processed", action: aiResponse.action }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendStatusNotification(
  supabase: any,
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  userId: string,
  clientName: string,
  clientPhone: string,
  newStatus: string
): Promise<void> {
  try {
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!settings || !settings.is_enabled) {
      return;
    }

    const statusConfig = STATUS_NOTIFICATION_MAP[newStatus];
    if (!statusConfig) return;

    const shouldNotify = settings[statusConfig.key];
    if (!shouldNotify) return;

    const message = `${statusConfig.emoji} *${statusConfig.label}*\n\n👤 *Cliente:* ${clientName}\n📱 *Telefone:* ${clientPhone}\n📊 *Status:* ${newStatus}\n⏰ *Horário:* ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;

    await sendWhatsAppMessage(evolutionUrl, evolutionKey, instanceName, settings.notification_phone, message);
    console.log(`📬 Notification sent for status: ${newStatus}`);
  } catch (error) {
    console.error("Notification error:", error);
  }
}

async function checkFAQ(
  apiKey: string,
  message: string,
  faqs: { question: string; answer: string }[]
): Promise<string | null> {
  const faqList = faqs.map((f, i) => `${i + 1}. Pergunta: "${f.question}"`).join("\n");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `Você é um analisador de FAQ. Analise se a mensagem do cliente corresponde a alguma pergunta frequente.
Responda APENAS com o número da FAQ correspondente ou "0" se nenhuma corresponder.`,
        },
        {
          role: "user",
          content: `Mensagem do cliente: "${message}"\n\nFAQs disponíveis:\n${faqList}\n\nResponda apenas com o número (1, 2, 3...) ou 0:`,
        },
      ],
      temperature: 0.1,
      max_tokens: 10,
    }),
  });

  if (!response.ok) {
    console.error("FAQ check failed:", response.status);
    return null;
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content?.trim();
  const faqIndex = parseInt(answer) - 1;

  if (faqIndex >= 0 && faqIndex < faqs.length) {
    return faqs[faqIndex].answer;
  }

  return null;
}

// Helper: search RAG knowledge base for relevant context
async function searchRAGContext(
  supabase: any,
  apiKey: string,
  userId: string,
  agentId: string,
  query: string
): Promise<string> {
  try {
    // Generate embedding for the query using the same method as rag-ingest
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an embedding generator. Given text, produce a 768-dimensional numerical vector representation.
Return ONLY a JSON array of 768 floating point numbers between -1 and 1, nothing else.
The vector should capture the semantic meaning of the text.
Different texts with similar meaning should produce similar vectors.`
          },
          { role: "user", content: query.slice(0, 2000) }
        ],
        temperature: 0,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      console.error("RAG embedding error:", response.status);
      return "";
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    let embedding: number[];
    try {
      let jsonStr = content;
      if (content.includes("```")) {
        const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) jsonStr = match[1].trim();
      }
      embedding = JSON.parse(jsonStr);
      if (!Array.isArray(embedding) || embedding.length !== 768) {
        console.error("Invalid embedding size from RAG search");
        return "";
      }
    } catch {
      console.error("Failed to parse RAG search embedding");
      return "";
    }

    // Search using the match function
    const { data: results, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: JSON.stringify(embedding),
      match_user_id: userId,
      match_agent_id: agentId,
      match_threshold: 0.5,
      match_count: 3,
    });

    if (error || !results || results.length === 0) {
      return "";
    }

    console.log(`🧠 RAG found ${results.length} relevant chunks`);
    
    const ragContext = results
      .map((r: any, i: number) => `[${i + 1}] ${r.content}`)
      .join("\n\n");

    return ragContext;
  } catch (e) {
    console.error("RAG search error:", e);
    return "";
  }
}

async function processWithAI(
  apiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  rules: any,
  currentStep: any,
  nextStep: any,
  clientMessage: string,
  history: any[],
  allSteps: any[],
  clientName: string,
  clientPhone: string,
  hasCalendarConnected: boolean,
  userId: string,
  agentId: string
): Promise<{ response_text: string; action: "PROCEED" | "STAY"; new_status?: string }> {
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // --- Calendar deterministic completion (fix: model sometimes loops on availability) ---
  // If the user already picked a time and later sends the email (or vice-versa),
  // we auto-complete the booking instead of relying on the LLM to call the right tool.
  if (hasCalendarConnected) {
    const TZ = "America/Sao_Paulo";
    const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/;

    const extractEmail = (text: string): string | null => {
      const m = text.match(emailRegex);
      return m?.[0]?.toLowerCase() ?? null;
    };

    const normalizeTime = (hour: number, minute: number) =>
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    const parseSelection = (text: string): { date?: string; time?: string; weekday?: string } | null => {
      const lower = text.toLowerCase();
      const dateMatch = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);

      // Accept: 09:00, 9:00, 9h30, 9h, 09h
      let time: string | undefined;
      const timeMatch = lower.match(/\b([01]?\d|2[0-3])\s*(?:(:|h)\s*([0-5]\d))\b|\b([01]?\d|2[0-3])\s*h\b/);
      if (timeMatch) {
        const hourStr = timeMatch[1] ?? timeMatch[4];
        const minuteStr = timeMatch[3] ?? "00";
        const hour = Number(hourStr);
        const minute = Number(minuteStr);
        if (!Number.isNaN(hour) && hour >= 0 && hour <= 23 && !Number.isNaN(minute) && minute >= 0 && minute <= 59) {
          time = normalizeTime(hour, minute);
        }
      }

      const weekdayCandidates: Array<{ key: string; words: string[] }> = [
        { key: "domingo", words: ["domingo", "dom"] },
        { key: "segunda", words: ["segunda", "seg"] },
        { key: "terça", words: ["terça", "terca", "ter"] },
        { key: "quarta", words: ["quarta", "qua"] },
        { key: "quinta", words: ["quinta", "qui"] },
        { key: "sexta", words: ["sexta", "sex"] },
        { key: "sábado", words: ["sábado", "sabado", "sáb", "sab"] },
      ];

      let weekday: string | undefined;
      for (const c of weekdayCandidates) {
        if (c.words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(lower))) {
          weekday = c.key;
          break;
        }
      }

      const date = dateMatch?.[1];
      if (!date && !time && !weekday) return null;
      return { date: date ?? undefined, time, weekday };
    };

    const formatDateKeySP = (d: Date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);

    const formatTimeSP = (d: Date) =>
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d);

    const formatWeekdaySP = (d: Date) =>
      new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long" }).format(d).toLowerCase();

    const hasPresentedSlots = history.some(
      (h) =>
        h.role !== "client" &&
        /hor[aá]rios\s*:/i.test(String(h.content || "")) &&
        /\(20\d{2}-\d{2}-\d{2}\)/.test(String(h.content || ""))
    );

    const emailInMessage = extractEmail(clientMessage);
    const emailInHistory =
      (history.map((h) => extractEmail(String(h.content || ""))).find(Boolean) as string | undefined) ?? null;
    const email = emailInMessage ?? emailInHistory;

    const selectionFromMessage = emailRegex.test(clientMessage) ? null : parseSelection(clientMessage);

    const selectionFromHistory = (() => {
      for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i];
        if (h.role !== "client") continue;
        const content = String(h.content || "");
        if (emailRegex.test(content)) continue;
        const sel = parseSelection(content);
        if (sel?.time) return sel;
      }
      return null;
    })();

    const selection = selectionFromMessage ?? selectionFromHistory;

    const shouldAutoBook =
      hasPresentedSlots &&
      !!email &&
      !!selection?.time &&
      (
        // Sequence A: user selected a time earlier and is now sending the email
        !!emailInMessage ||
        // Sequence B: user sent email earlier and is now selecting a time
        !!selectionFromMessage
      );

    if (shouldAutoBook) {
      try {
        // Fetch slots and pick the earliest matching option for the chosen weekday/date+time
        const slots = await getCalendarAvailability(supabase, userId, 14);

        const desiredTime = selection!.time!;
        const desiredDate = selection!.date;
        const desiredWeekday = selection!.weekday; // ex: "quinta"

        const candidates = slots
          .map((s) => ({ raw: s, d: new Date(s.start) }))
          .filter(({ d }) => {
            const slotTime = formatTimeSP(d);
            if (slotTime !== desiredTime) return false;
            if (desiredDate) return formatDateKeySP(d) === desiredDate;
            if (desiredWeekday) return formatWeekdaySP(d).startsWith(desiredWeekday);
            // If no date/weekday was provided, we can't safely disambiguate. Require at least weekday/date.
            return false;
          })
          .sort((a, b) => a.d.getTime() - b.d.getTime());

        const chosen = candidates[0];

        if (!chosen) {
          return {
            response_text:
              "Não encontrei esse horário livre no calendário. Pode escolher um dos horários que enviei (de preferência indicando o dia), por favor?",
            action: "STAY",
          };
        }

        // Default duration from settings
        const { data: scheduleSettings } = await supabase
          .from("schedule_settings")
          .select("appointment_duration_minutes")
          .eq("user_id", userId)
          .maybeSingle();

        const duration = scheduleSettings?.appointment_duration_minutes || 60;

        const dateKey = formatDateKeySP(chosen.d);
        const timeStr = formatTimeSP(chosen.d);
        const summary = `Consulta - ${clientName}`;

        console.log(
          `📅 Auto-booking: date=${dateKey}, time=${timeStr}, summary=${summary}, duration=${duration}, email=${email}`
        );

        const eventResult = await createCalendarEvent(supabase, userId, dateKey, timeStr, summary, duration, email);

        if (!eventResult.success) {
          return {
            response_text: `Desculpe, não consegui concluir o agendamento agora (${eventResult.error}). Quer tentar outro horário?`,
            action: "STAY",
          };
        }

        // Save email to contact record
        await updateContactEmail(supabase, userId, clientPhone, email);

        return {
          response_text: `Perfeito, ${clientName}! Agendei sua consulta para *${dateKey}* às *${timeStr}*. Vou enviar o convite no e-mail *${email}*.`,
          action: "STAY",
          new_status: "Qualificado",
        };
      } catch (e) {
        console.error("Auto-booking error:", e);
        // Fall back to normal AI flow
      }
    }

    // If user sends only email but we don't have a clear time selection, ask for the chosen time.
    if (hasPresentedSlots && !!emailInMessage && !selectionFromHistory?.time) {
      return {
        response_text:
          "Obrigado! Agora me diga qual horário você escolheu (ex: *quinta às 09:00*), para eu confirmar o agendamento e te enviar o convite.",
        action: "STAY",
      };
    }
  }
  
  // Build context about the script
  const scriptContext = allSteps.map((s, i) => 
    `Etapa ${i + 1}: "${s.situation || 'Sem descrição'}" - Mensagem: "${s.message_to_send}"`
  ).join("\n");

  const currentStepInfo = currentStep 
    ? `\n\n📍 ETAPA ATUAL (${currentStep.step_order}/${allSteps.length}):
- Situação: "${currentStep.situation || 'Sem descrição'}"  
- Mensagem que você enviou: "${currentStep.message_to_send}"
- Objetivo: Coletar a informação desta etapa antes de avançar`
    : "\n\nVocê está no início do atendimento.";

  const nextStepInfo = nextStep
    ? `\n\n➡️ PRÓXIMA ETAPA (${nextStep.step_order}/${allSteps.length}):
- Situação: "${nextStep.situation || 'Sem descrição'}"
- Mensagem a enviar: "${nextStep.message_to_send}"`
    : "\n\n⚠️ Esta é a ÚLTIMA etapa do roteiro.";

  // Build conversation memory summary from history
  const conversationMemory = history.length > 0
    ? `\n\n💬 MEMÓRIA DA CONVERSA (informações já coletadas):
${history.map((h) => `${h.role === 'client' ? '👤 Cliente' : '🤖 Você'}: ${h.content}`).join('\n')}`
    : "";

  // Calendar context if available
  const today = new Date();
  const currentDateStr = today.toISOString().split('T')[0];
  const currentYear = today.getFullYear();
  
  const calendarContext = hasCalendarConnected 
    ? `\n\n📅 AGENDAMENTO DISPONÍVEL:
- Data atual: ${currentDateStr} (ano: ${currentYear})
- Você TEM ACESSO ao calendário do escritório para agendar consultas.

FLUXO DE AGENDAMENTO (siga em ordem):
1. Se o cliente quer agendar mas você NÃO MOSTROU os horários ainda: use check_calendar_availability
2. Se você JÁ MOSTROU os horários e o cliente ESCOLHEU um (ex: "10:00", "segunda às 14h", "amanhã de manhã"): 
   - PRIMEIRO peça o email se ainda não tem
   - DEPOIS use create_calendar_event com a data YYYY-MM-DD e horário HH:MM
3. NUNCA chame check_calendar_availability se já mostrou os horários e o cliente escolheu um!

IMPORTANTE:
- Ao criar eventos, use sempre o ano ${currentYear} nas datas
- Quando o cliente responde com um horário específico, isso é uma ESCOLHA - use create_calendar_event!
- Exemplos de escolha: "10:00", "quarta 10h", "amanhã às 9", "prefiro às 14:00"`
    : "";

  // RAG: Search knowledge base for relevant context
  let ragContext = "";
  try {
    ragContext = await searchRAGContext(supabase, apiKey, userId, agentId, clientMessage);
    if (ragContext) {
      console.log(`🧠 RAG context injected (${ragContext.length} chars)`);
    }
  } catch (e) {
    console.error("RAG context error:", e);
  }

  const knowledgeBaseContext = ragContext
    ? `\n\n📚 BASE DE CONHECIMENTO (informações relevantes encontradas):
${ragContext}

IMPORTANTE: Use as informações acima para fundamentar suas respostas quando relevantes. Cite os dados da base de conhecimento de forma natural na conversa.`
    : "";

  const systemPrompt = `Você é um assistente virtual de atendimento jurídico/profissional chamado pelo escritório. Seu objetivo é conduzir o cliente através de um roteiro de qualificação de forma natural e empática.

${rules?.system_prompt || "Seja profissional, educado e objetivo nas respostas."}

📋 REGRAS DO ATENDIMENTO:
${rules?.agent_rules || "- Seja cordial e profissional\n- Responda de forma clara e objetiva\n- Mantenha o foco no roteiro"}

🚫 AÇÕES PROIBIDAS:
${rules?.forbidden_actions || "- Não forneça informações falsas\n- Não faça promessas que não pode cumprir\n- Não seja invasivo"}

📝 ROTEIRO COMPLETO:
${scriptContext}
${currentStepInfo}
${nextStepInfo}
${conversationMemory}
${calendarContext}
${knowledgeBaseContext}

👤 INFORMAÇÕES DO CLIENTE:
- Nome: ${clientName}
- IMPORTANTE: Use o nome "${clientName}" para se referir ao cliente sempre que apropriado.
- IMPORTANTE: Lembre-se de TODAS as informações que o cliente já compartilhou durante a conversa acima.

🎯 INSTRUÇÕES:
1. Se o cliente respondeu adequadamente à pergunta da etapa atual, use action "PROCEED"
2. Se o cliente fez uma pergunta ou deu resposta vaga, use action "STAY"
3. Se for a última etapa e o cliente concordou, mude new_status para "Qualificado"
4. Se o cliente demonstrar desinteresse, mude new_status para "Não Qualificado"
5. SEMPRE use o nome do cliente quando fizer sentido na conversa
6. NUNCA peça informações que o cliente já forneceu na conversa
7. Se o cliente pedir para agendar, USE as ferramentas de calendário (check_calendar_availability e create_calendar_event)`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-15).map((h) => ({
      role: h.role === "client" ? ("user" as const) : ("assistant" as const),
      content: h.content,
    })),
    { role: "user" as const, content: clientMessage },
  ];

  // Define tools - include calendar tools if connected
  const tools: any[] = [
    {
      type: "function",
      function: {
        name: "send_response",
        description: "Envia a resposta para o cliente e decide se avança no roteiro",
        parameters: {
          type: "object",
          properties: {
            response_text: {
              type: "string",
              description: "A mensagem a ser enviada para o cliente"
            },
            action: {
              type: "string",
              enum: ["PROCEED", "STAY"],
              description: "PROCEED para avançar à próxima etapa, STAY para permanecer na atual"
            },
            new_status: {
              type: "string",
              enum: ["Qualificado", "Não Qualificado", "Convertido", ""],
              description: "Novo status do lead se houver mudança, ou vazio"
            }
          },
          required: ["response_text", "action"],
          additionalProperties: false
        }
      }
    }
  ];

  // Add ZapSign tool - check if user has ZapSign configured
  const { data: zapsignSettings } = await supabase
    .from("zapsign_settings")
    .select("*")
    .eq("user_id", userId)
    .eq("is_enabled", true)
    .maybeSingle();

  const hasZapSign = !!zapsignSettings;
  
  if (hasZapSign) {
    tools.push({
      type: "function",
      function: {
        name: "send_zapsign_document",
        description: `Envia um documento para assinatura digital via ZapSign. Use quando:
- O cliente precisa assinar um contrato ou documento
- O atendimento chegou na etapa de envio de contrato
- O status do lead indica que é hora de enviar documentos (ex: Qualificado, Convertido)
O documento será enviado automaticamente para o WhatsApp do cliente.`,
        parameters: {
          type: "object",
          properties: {
            template_id: {
              type: "string",
              description: "ID/token do template da ZapSign. Se não souber, use 'default' para enviar o primeiro template disponível."
            },
            signer_name: {
              type: "string",
              description: "Nome do signatário (use o nome do cliente)"
            }
          },
          required: ["signer_name"],
          additionalProperties: false
        }
      }
    });
  }

  // Add calendar tools if connected
  if (hasCalendarConnected) {
    // Check if conversation history suggests we already showed slots
    // Only check assistant messages for the explicit date pattern (YYYY-MM-DD) to avoid false positives
    const alreadyShowedSlots = history.some(
      (h) =>
        h.role === "assistant" &&
        /hor[aá]rios?\s*(?:disponíveis|:)/i.test(String(h.content || "")) &&
        /\(20\d{2}-\d{2}-\d{2}\)/.test(String(h.content || ""))
    );
    
    // Check if we have an email in the conversation OR current message
    const emailRegex = /[\w.+-]+@[\w-]+\.[\w.-]+/;
    const hasEmailInMessage = emailRegex.test(clientMessage);
    const hasEmailInHistory = history.some(h => emailRegex.test(h.content));
    const hasEmail = hasEmailInMessage || hasEmailInHistory;
    
    // Check if current message looks like a time selection
    const looksLikeTimeSelection = /\d{1,2}[:\s]?\d{0,2}|manhã|tarde|amanhã|segunda|terça|quarta|quinta|sexta/i.test(clientMessage);
    
    console.log(`📅 Context check: showedSlots=${alreadyShowedSlots}, hasEmail=${hasEmail}, hasEmailInMessage=${hasEmailInMessage}, timeSelection=${looksLikeTimeSelection}`);
    
    // Only add check_calendar_availability if we haven't shown slots yet
    // This prevents the AI from calling it repeatedly in a loop
    if (!alreadyShowedSlots) {
      tools.push({
        type: "function",
        function: {
          name: "check_calendar_availability",
          description: "Verifica os horários disponíveis para agendamento. USE SOMENTE quando o cliente pedir para agendar e você AINDA NÃO MOSTROU os horários. NUNCA use se já mostrou horários antes.",
          parameters: {
            type: "object",
            properties: {
              days_ahead: {
                type: "number",
                description: "Quantos dias à frente verificar disponibilidade (padrão: 7)"
              }
            },
            required: [],
            additionalProperties: false
          }
        }
      });
    }
    
    // Always add create_calendar_event if calendar is connected
    tools.push({
      type: "function",
      function: {
        name: "create_calendar_event",
        description: `CRIA O AGENDAMENTO no calendário. Use quando:
1. Você JÁ MOSTROU os horários disponíveis ao cliente
2. O cliente ESCOLHEU um horário específico (ex: '10:00', 'quinta 11:30', 'amanhã às 9')
3. Você TEM o email do cliente (da mensagem atual ou do histórico)

${hasEmail ? `EMAIL DISPONÍVEL: Sim - use o email do cliente que já está na conversa.` : `EMAIL: Ainda não temos. Peça o email ANTES de criar o evento.`}
${looksLikeTimeSelection ? `SELEÇÃO DE HORÁRIO: O cliente parece estar escolhendo um horário agora. CRIE O EVENTO se tiver o email!` : ''}`,
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Data do agendamento no formato YYYY-MM-DD (use a data que corresponde ao dia da semana escolhido)"
            },
            time: {
              type: "string",
              description: "Horário no formato HH:MM (ex: 14:00, 09:30)"
            },
            summary: {
              type: "string",
              description: "Título da reunião (ex: Consulta - Nome do Cliente)"
            },
            duration_minutes: {
              type: "number",
              description: "Duração em minutos (padrão: 30 ou conforme configuração)"
            },
            client_email: {
              type: "string",
              description: "Email do cliente para enviar convite. OBRIGATÓRIO para criar o evento."
            }
          },
          required: ["date", "time", "summary", "client_email"],
          additionalProperties: false
        }
      }
    });
  }

  // First AI call
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      temperature: 0.7,
      max_tokens: 500,
      tools,
      tool_choice: "auto"
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Handle tool calls
  const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
  console.log(`🔧 Tool calls received: ${toolCalls.length}`);

  // Process calendar tool calls if any
  for (const toolCall of toolCalls) {
    const funcName = toolCall.function?.name;
    const funcArgs = toolCall.function?.arguments;
    
    if (!funcName || !funcArgs) continue;
    
    console.log(`🔧 Processing tool: ${funcName}`);
    
    if (funcName === "check_calendar_availability") {
      try {
        const args = JSON.parse(funcArgs);
        const daysAhead = args.days_ahead || 7;
        
        // Get available slots
        const slots = await getCalendarAvailability(supabase, userId, daysAhead);
        console.log(`📅 Found ${slots.length} available slots`);
        
        // Make second AI call with slots info - show ALL available slots up to 20
        const today = new Date();
        const currentYear = today.getFullYear();
        
        console.log(`📅 Total slots available: ${slots.length}`);
        
        // Group slots by date for better presentation
        const slotsByDate = new Map<string, { start: string; end: string }[]>();
        slots.slice(0, 20).forEach(s => {
          const date = new Date(s.start);
          const dateKey = date.toISOString().split('T')[0];
          if (!slotsByDate.has(dateKey)) {
            slotsByDate.set(dateKey, []);
          }
          slotsByDate.get(dateKey)!.push(s);
        });
        
        let slotsText = "";
        slotsByDate.forEach((daySlots, dateKey) => {
          const sampleDate = new Date(daySlots[0].start);
          const dateStr = sampleDate.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: '2-digit', 
            month: '2-digit',
            year: 'numeric'
          });
          
          const times = daySlots.map(s => {
            const d = new Date(s.start);
            return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          }).join(', ');
          
          slotsText += `📆 ${dateStr} (${dateKey}):\n   Horários: ${times}\n\n`;
        });
        
        console.log(`📅 Slots text to AI:\n${slotsText}`);
        
        const followUpMessages = [
          ...messages,
          { role: "assistant" as const, content: "", tool_calls: [toolCall] },
          { 
            role: "tool" as const, 
            tool_call_id: toolCall.id,
            content: `Horários disponíveis encontrados (ano atual: ${currentYear}):\n\n${slotsText}\nVocê DEVE apresentar TODOS estes horários ao cliente de forma organizada por dia. Deixe o cliente escolher. Quando ele escolher, use create_calendar_event com a data no formato YYYY-MM-DD (mostrada entre parênteses ao lado de cada dia) e o horário escolhido.`
          }
        ];
        
        const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: followUpMessages,
            temperature: 0.7,
            max_tokens: 500,
            tools: [{
              type: "function",
              function: {
                name: "send_response",
                description: "Envia a resposta para o cliente",
                parameters: {
                  type: "object",
                  properties: {
                    response_text: { type: "string", description: "A mensagem a ser enviada" },
                    action: { type: "string", enum: ["PROCEED", "STAY"], description: "Ação" },
                    new_status: { type: "string", description: "Novo status se houver" }
                  },
                  required: ["response_text", "action"],
                  additionalProperties: false
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "send_response" } }
          }),
        });
        
        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          const finalToolCall = followUpData.choices?.[0]?.message?.tool_calls?.[0];
          if (finalToolCall?.function?.arguments) {
            const parsed = JSON.parse(finalToolCall.function.arguments);
            return {
              response_text: parsed.response_text || "Temos vários horários disponíveis! Qual prefere?",
              action: "STAY" as const,
              new_status: undefined,
            };
          }
        }
      } catch (e) {
        console.error("Calendar availability error:", e);
      }
    }
    
    if (funcName === "create_calendar_event") {
      try {
        const args = JSON.parse(funcArgs);
        
        // Get user's schedule settings for default duration
        const { data: scheduleSettings } = await supabase
          .from("schedule_settings")
          .select("appointment_duration_minutes")
          .eq("user_id", userId)
          .maybeSingle();
        
        const defaultDuration = scheduleSettings?.appointment_duration_minutes || 60;
        const duration = args.duration_minutes || defaultDuration;
        const clientEmail = args.client_email || null;
        
        console.log(`📅 Creating event with args: date=${args.date}, time=${args.time}, summary=${args.summary}, duration=${duration}min, email=${clientEmail || 'none'}`);
        
        const eventResult = await createCalendarEvent(
          supabase, 
          userId, 
          args.date, 
          args.time, 
          args.summary,
          duration,
          clientEmail
        );
        
        if (eventResult.success) {
          console.log(`✅ Event created successfully`);
          
          // Make second AI call to confirm
          const followUpMessages = [
            ...messages,
            { role: "assistant" as const, content: "", tool_calls: [toolCall] },
            { 
              role: "tool" as const, 
              tool_call_id: toolCall.id,
              content: `Agendamento criado com sucesso!\nData: ${args.date}\nHorário: ${args.time}\nTítulo: ${args.summary}\n\nConfirme o agendamento para o cliente de forma amigável.`
            }
          ];
          
          const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: followUpMessages,
              temperature: 0.7,
              max_tokens: 500,
              tools: [tools[0]],
              tool_choice: { type: "function", function: { name: "send_response" } }
            }),
          });
          
          if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json();
            const finalToolCall = followUpData.choices?.[0]?.message?.tool_calls?.[0];
            if (finalToolCall?.function?.arguments) {
              const parsed = JSON.parse(finalToolCall.function.arguments);
              return {
                response_text: parsed.response_text || `Perfeito! Sua consulta foi agendada para ${args.date} às ${args.time}. Até lá!`,
                action: "STAY" as const,
                new_status: "Qualificado",
              };
            }
          }
          
          return {
            response_text: `Perfeito, ${clientName}! Sua consulta foi agendada para ${args.date} às ${args.time}. Você receberá uma confirmação. Até lá! 📅`,
            action: "STAY" as const,
            new_status: "Qualificado",
          };
        } else {
          console.error(`❌ Event creation failed: ${eventResult.error}`);
          // Return error message to user
          return {
            response_text: `Desculpe, houve um problema ao agendar. Erro: ${eventResult.error}. Podemos tentar novamente?`,
            action: "STAY" as const,
            new_status: undefined,
          };
        }
      } catch (e) {
        console.error("Calendar event creation error:", e);
        return {
          response_text: "Desculpe, houve um erro técnico ao agendar. Pode tentar novamente?",
          action: "STAY" as const,
          new_status: undefined,
        };
      }
    }
    
    // Handle ZapSign document sending
    if (funcName === "send_zapsign_document" && zapsignSettings) {
      try {
        const args = JSON.parse(funcArgs);
        const signerName = args.signer_name || clientName;
        let templateId = args.template_id;

        const ZAPSIGN_API_URL = zapsignSettings.sandbox_mode
          ? "https://sandbox.api.zapsign.com.br/api/v1"
          : "https://api.zapsign.com.br/api/v1";

        // If no specific template, get the first available one
        if (!templateId || templateId === "default") {
          const templatesResp = await fetch(`${ZAPSIGN_API_URL}/templates/`, {
            headers: { Authorization: `Bearer ${zapsignSettings.api_token}` },
          });
          if (templatesResp.ok) {
            const templatesData = await templatesResp.json();
            const templates = templatesData?.results || templatesData || [];
            if (Array.isArray(templates) && templates.length > 0) {
              templateId = templates[0].token;
            }
          }
        }

        if (!templateId) {
          console.error("❌ No ZapSign templates available");
          return {
            response_text: `${signerName}, gostaria de enviar o contrato para assinatura, mas ainda não temos um modelo configurado. Vou verificar internamente e retorno em breve!`,
            action: "STAY" as const,
            new_status: undefined,
          };
        }

        // Create document from template
        const payload = {
          template_id: templateId,
          signer_name: signerName,
          signers: [{
            name: signerName,
            phone_country: "55",
            phone_number: clientPhone.replace(/\D/g, ""),
            auth_mode: "assinaturaTela",
            send_automatic_whatsapp: true,
          }],
          data: [{ de: "{{nome}}", para: signerName }],
        };

        const docResp = await fetch(`${ZAPSIGN_API_URL}/models/create-doc/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${zapsignSettings.api_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!docResp.ok) {
          const errText = await docResp.text();
          console.error("❌ ZapSign create doc error:", docResp.status, errText);
          return {
            response_text: `${signerName}, tive um problema ao gerar o contrato. Vou tentar novamente em instantes!`,
            action: "STAY" as const,
            new_status: undefined,
          };
        }

        const docData = await docResp.json();
        console.log(`✅ ZapSign document created: ${docData.token || docData.open_id}`);

        // Make follow-up AI call to confirm to the client
        const followUpMessages = [
          ...messages,
          { role: "assistant" as const, content: "", tool_calls: [toolCall] },
          {
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: `Documento de assinatura criado e enviado com sucesso via ZapSign para o WhatsApp do cliente ${signerName}. O cliente receberá o link para assinatura digital automaticamente no WhatsApp.`,
          },
        ];

        const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: followUpMessages,
            temperature: 0.7,
            max_tokens: 300,
            tools: [tools[0]],
            tool_choice: { type: "function", function: { name: "send_response" } },
          }),
        });

        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          const finalToolCall = followUpData.choices?.[0]?.message?.tool_calls?.[0];
          if (finalToolCall?.function?.arguments) {
            const parsed = JSON.parse(finalToolCall.function.arguments);
            return {
              response_text: parsed.response_text || `${signerName}, enviei o contrato para assinatura no seu WhatsApp! 📄✍️`,
              action: "STAY" as const,
              new_status: parsed.new_status || undefined,
            };
          }
        }

        return {
          response_text: `${signerName}, acabei de enviar o contrato para assinatura digital no seu WhatsApp! Você receberá o link em instantes. É só clicar e assinar. 📄✍️`,
          action: "STAY" as const,
          new_status: "Convertido",
        };
      } catch (e) {
        console.error("ZapSign tool error:", e);
        return {
          response_text: "Desculpe, houve um erro ao enviar o documento. Vou tentar novamente em breve!",
          action: "STAY" as const,
          new_status: undefined,
        };
      }
    }

    // Handle send_response tool call
    if (funcName === "send_response") {
      try {
        const parsed = JSON.parse(funcArgs);
        console.log("🤖 Tool call response:", JSON.stringify(parsed));
        return {
          response_text: parsed.response_text || "Desculpe, pode repetir?",
          action: parsed.action === "PROCEED" ? "PROCEED" : "STAY",
          new_status: parsed.new_status || undefined,
        };
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }
  }

  // Fallback: try to parse content as JSON
  const content = data.choices?.[0]?.message?.content?.trim();
  console.log("🤖 Raw AI response:", content);

  if (content) {
    try {
      let jsonContent = content;
      if (content.includes("```")) {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1].trim();
        }
      }
      
      const parsed = JSON.parse(jsonContent);
      return {
        response_text: parsed.response_text || "Desculpe, pode repetir?",
        action: parsed.action === "PROCEED" ? "PROCEED" : "STAY",
        new_status: parsed.new_status || undefined,
      };
    } catch (_e) {
      console.log("⚠️ Failed to parse AI JSON");
    }
  }

  // Final fallback - generic response
  console.log("⚠️ Using fallback response");
  return {
    response_text: "Obrigado pela informação! Para dar continuidade ao atendimento, pode me contar mais sobre sua situação?",
    action: "STAY",
  };
}

// Helper function to get calendar availability
async function getCalendarAvailability(
  supabase: any, 
  userId: string, 
  daysAhead: number
): Promise<{ start: string; end: string }[]> {
  try {
    // Get user's schedule settings
    const { data: scheduleSettings } = await supabase
      .from("schedule_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Use custom settings or defaults
    const workStartHour = scheduleSettings?.work_start_hour ?? 9;
    const workEndHour = scheduleSettings?.work_end_hour ?? 18;
    const lunchStartHour = scheduleSettings?.lunch_start_hour ?? null;
    const lunchEndHour = scheduleSettings?.lunch_end_hour ?? null;
    const appointmentDuration = scheduleSettings?.appointment_duration_minutes ?? 60;
    const workDays: number[] = scheduleSettings?.work_days ?? [1, 2, 3, 4, 5]; // Default Mon-Fri

    console.log(`📅 Schedule settings: ${workStartHour}h-${workEndHour}h, lunch: ${lunchStartHour}-${lunchEndHour}, duration: ${appointmentDuration}min, days: ${workDays.join(',')}`);

    const { data: tokenData } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!tokenData) return [];

    const accessToken = await refreshTokenIfNeeded(supabase, userId, tokenData);
    if (!accessToken) return [];

    const start = new Date();
    const end = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    // Get existing events
    const eventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const eventsData = await eventsResponse.json();
    const busySlots = (eventsData.items || []).map((event: any) => ({
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
    }));

    // Generate available slots based on user settings
    const availableSlots: { start: string; end: string }[] = [];
    const currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);

    const slotDurationMs = appointmentDuration * 60 * 1000;

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      
      // Check if this day is a work day
      if (workDays.includes(dayOfWeek)) {
        // Generate slots for work hours
        let currentHour = workStartHour;
        let currentMinute = 0;
        
        while (currentHour < workEndHour) {
          // Check if this slot falls during lunch break
          const isLunchTime = lunchStartHour !== null && lunchEndHour !== null &&
            currentHour >= lunchStartHour && currentHour < lunchEndHour;
          
          if (!isLunchTime) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(currentHour, currentMinute, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

            // Only add if slot is in the future and doesn't exceed work hours
            if (slotStart > new Date() && slotEnd.getHours() <= workEndHour) {
              const isBusy = busySlots.some((busy: any) => {
                const busyStart = new Date(busy.start);
                const busyEnd = new Date(busy.end);
                return slotStart < busyEnd && slotEnd > busyStart;
              });

              if (!isBusy) {
                availableSlots.push({
                  start: slotStart.toISOString(),
                  end: slotEnd.toISOString(),
                });
              }
            }
          }
          
          // Move to next slot
          currentMinute += appointmentDuration;
          if (currentMinute >= 60) {
            currentHour += Math.floor(currentMinute / 60);
            currentMinute = currentMinute % 60;
          }
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`📅 Generated ${availableSlots.length} available slots`);
    return availableSlots;
  } catch (error) {
    console.error("Error getting calendar availability:", error);
    return [];
  }
}

// Helper function to create calendar event
async function createCalendarEvent(
  supabase: any,
  userId: string,
  date: string,
  time: string,
  summary: string,
  durationMinutes: number,
  attendeeEmail?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: tokenData } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!tokenData) return { success: false, error: "Calendar not connected" };

    const accessToken = await refreshTokenIfNeeded(supabase, userId, tokenData);
    if (!accessToken) return { success: false, error: "Failed to get access token" };

    // Parse date and time
    let [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    
    // Validate year - if it's in the past, assume current year
    const currentYear = new Date().getFullYear();
    if (year < currentYear) {
      console.log(`⚠️ Year ${year} is in the past, correcting to ${currentYear}`);
      year = currentYear;
    }
    
    // Format as local datetime string for São Paulo timezone
    // Use format without timezone offset, let Google Calendar handle it with the timeZone parameter
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}:00`;
    
    // Calculate end time
    const endHour = hour + Math.floor(durationMinutes / 60);
    const endMinute = (minute || 0) + (durationMinutes % 60);
    const finalEndHour = endHour + Math.floor(endMinute / 60);
    const finalEndMinute = endMinute % 60;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(finalEndHour).padStart(2, '0')}:${String(finalEndMinute).padStart(2, '0')}:00`;

    console.log(`📅 Creating event: ${startDateStr} to ${endDateStr} (São Paulo timezone)${attendeeEmail ? `, attendee: ${attendeeEmail}` : ''}`);

    const calendarEvent: any = {
      summary,
      start: {
        dateTime: startDateStr,
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endDateStr,
        timeZone: "America/Sao_Paulo",
      },
    };

    // Add attendee if email is provided - Google Calendar will send invite automatically
    if (attendeeEmail) {
      calendarEvent.attendees = [{ email: attendeeEmail }];
      calendarEvent.sendUpdates = "all"; // Send email notification to attendees
      console.log(`📧 Will send calendar invite to: ${attendeeEmail}`);
    }

    const createResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error("Calendar event creation failed:", errorData);
      return { success: false, error: errorData.error?.message || "Failed to create event" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Helper function to refresh token if needed
async function refreshTokenIfNeeded(
  supabase: any,
  userId: string,
  tokenData: any
): Promise<string | null> {
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("Google OAuth credentials not configured");
    return null;
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();

  // If token is still valid (with 5 minute buffer)
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return tokenData.access_token;
  }

  // Refresh the token
  console.log("Refreshing access token...");
  const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokenData.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const refreshData = await refreshResponse.json();

  if (!refreshResponse.ok || refreshData.error) {
    console.error("Failed to refresh token:", refreshData);
    return null;
  }

  // Update tokens in database
  const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);
  await supabase
    .from("google_calendar_tokens")
    .update({
      access_token: refreshData.access_token,
      expires_at: newExpiresAt.toISOString(),
    })
    .eq("user_id", userId);

  return refreshData.access_token;
}

async function sendWhatsAppMessage(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string,
  text: string
): Promise<string | null> {
  const url = `${apiUrl}/message/sendText/${instanceName}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: phone,
      text: text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("WhatsApp send error:", response.status, errorText);
    throw new Error(`WhatsApp send failed: ${response.status}`);
  }

  const data = await response.json();
  const messageId = data?.key?.id || null;
  console.log(`✅ Message sent to ${phone}, id: ${messageId}`);
  return messageId;
}

// Helper function to update contact email when client provides it
async function updateContactEmail(
  supabase: any,
  userId: string,
  clientPhone: string,
  email: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("contacts")
      .update({ email })
      .eq("user_id", userId)
      .eq("phone", clientPhone);

    if (error) {
      console.error("❌ Error updating contact email:", error);
    } else {
      console.log(`📧 Contact email updated: ${email} for phone ${clientPhone}`);
    }
  } catch (e) {
    console.error("Error updating contact email:", e);
  }
}
