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
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
      audioMessage?: {
        mimetype?: string;
        seconds?: number;
      };
      imageMessage?: {
        mimetype?: string;
        caption?: string;
      };
      documentMessage?: {
        mimetype?: string;
        fileName?: string;
        caption?: string;
      };
      documentWithCaptionMessage?: {
        message?: {
          documentMessage?: {
            mimetype?: string;
            fileName?: string;
            caption?: string;
          };
        };
      };
    };
    messageType?: string;
    pushName?: string;
  };
}

// CRM Status progression — ordered for auto-advance
const CRM_STATUSES = [
  "Novo Contato",
  "Em Atendimento",
  "Qualificado",
  "Não Qualificado",
  "Convertido",
  "Arquivado"
];

// Get the next funnel stage based on current status
function getNextFunnelStage(currentStatus: string | null): string | null {
  const progression: Record<string, string> = {
    "Novo Contato": "Em Atendimento",
    "Em Atendimento": "Qualificado",
    "Qualificado": "Convertido",
  };
  return progression[currentStatus || "Novo Contato"] || null;
}

// Status mapping for notifications
const STATUS_NOTIFICATION_MAP: Record<string, { key: string; emoji: string; label: string }> = {
  "Novo Contato": { key: "notify_new_lead", emoji: "🆕", label: "Novo Lead" },
  "Em Atendimento": { key: "notify_new_lead", emoji: "💬", label: "Em Atendimento" },
  "Qualificado": { key: "notify_qualified_lead", emoji: "⭐", label: "Lead Qualificado" },
  "Convertido": { key: "notify_contract_signed", emoji: "✅", label: "Convertido" },
};

// Helper: call AI chat completions with automatic fallback from OpenAI to Lovable AI Gateway
async function callAIChatCompletions(
  openaiApiKey: string | null,
  lovableApiKey: string | null,
  body: Record<string, any>
): Promise<any> {
  // Try OpenAI first if key is available
  if (openaiApiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        return await response.json();
      }

      const errorText = await response.text();
      console.warn(`⚠️ OpenAI API error ${response.status}: ${errorText.slice(0, 200)}`);
      // If 429 or 5xx, fall through to Lovable AI
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`OpenAI API error: ${response.status} - ${errorText.slice(0, 200)}`);
      }
      console.log("🔄 Falling back to Lovable AI Gateway...");
    } catch (e: any) {
      if (e.message?.startsWith("OpenAI API error:")) throw e;
      console.warn("⚠️ OpenAI request failed, trying Lovable AI:", e.message);
    }
  }

  // Fallback to Lovable AI Gateway (Gemini)
  if (!lovableApiKey) {
    throw new Error("No AI API key available (OpenAI failed and LOVABLE_API_KEY not configured)");
  }

  // Map OpenAI model to Gemini equivalent
  const modelMap: Record<string, string> = {
    "gpt-4o-mini": "google/gemini-2.5-flash",
    "gpt-4o": "google/gemini-2.5-flash",
  };
  const lovableModel = modelMap[body.model] || "google/gemini-2.5-flash";

  const lovableBody = { ...body, model: lovableModel };
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(lovableBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Lovable AI Gateway error ${response.status}: ${errorText.slice(0, 200)}`);
    throw new Error(`Lovable AI Gateway error: ${response.status}`);
  }

  console.log("✅ Lovable AI Gateway response received");
  return await response.json();
}

// Helper: call AI embeddings with fallback
async function callAIEmbeddings(
  openaiApiKey: string | null,
  lovableApiKey: string | null,
  input: string,
  dimensions: number = 768
): Promise<number[] | null> {
  // Try OpenAI first
  if (openaiApiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: input.slice(0, 8000),
          dimensions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const embedding = data.data?.[0]?.embedding;
        if (Array.isArray(embedding) && embedding.length === dimensions) return embedding;
      } else {
        console.warn(`⚠️ OpenAI embeddings error ${response.status}`);
      }
    } catch (e: any) {
      console.warn("⚠️ OpenAI embeddings failed:", e.message);
    }
  }

  // Fallback: Lovable AI Gateway with Gemini embedding
  if (!lovableApiKey) return null;

  try {
    // Use Gemini chat to generate a pseudo-embedding via Lovable AI
    // Since Lovable AI Gateway doesn't expose embeddings endpoint directly,
    // we skip embeddings when OpenAI fails (RAG will be unavailable but chat continues)
    console.warn("⚠️ Embeddings not available via Lovable AI Gateway, skipping RAG search");
    return null;
  } catch (e) {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || null;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || null;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }
    if (!OPENAI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error("No AI API key configured (need OPENAI_API_KEY or LOVABLE_API_KEY)");
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
    const textBody =
      payload.data?.message?.conversation ||
      payload.data?.message?.extendedTextMessage?.text;

    // Detect media messages
    const audioMsg = payload.data?.message?.audioMessage;
    const imageMsg = payload.data?.message?.imageMessage;
    const docMsg = payload.data?.message?.documentMessage ||
      payload.data?.message?.documentWithCaptionMessage?.message?.documentMessage;
    const hasMedia = !!(audioMsg || imageMsg || docMsg);

    if (!textBody && !hasMedia || payload.data?.key?.fromMe) {
      return new Response(JSON.stringify({ status: "ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientPhone = payload.data.key.remoteJid.replace("@s.whatsapp.net", "");
    const clientName = payload.data.pushName || "Cliente";
    const instanceName = payload.instance;
    const incomingMessageId = payload.data.key.id || null;

    // If media message, download and process with Gemini
    let messageBody = textBody || "";
    let incomingMediaUrl: string | null = null;
    let incomingMediaType: string | null = null;
    if (hasMedia && !textBody) {
      console.log(`📎 Media message detected: audio=${!!audioMsg}, image=${!!imageMsg}, doc=${!!docMsg}`);
      
      try {
        // Resolve tenant first to get Evolution API credentials
        const { data: mediaInstanceSettings } = await supabase
          .from("evolution_api_settings")
          .select("api_url, api_key")
          .eq("instance_name", instanceName)
          .maybeSingle();

        if (mediaInstanceSettings) {
          const mediaBase64 = await downloadMediaFromEvolution(
            mediaInstanceSettings.api_url,
            mediaInstanceSettings.api_key,
            instanceName,
            payload.data
          );

          if (mediaBase64) {
            const mediaMimeType = audioMsg?.mimetype || imageMsg?.mimetype || docMsg?.mimetype || "application/octet-stream";
            const mediaCaption = imageMsg?.caption || docMsg?.caption || "";
            
            // Build data URL for displaying in chat (only for images to avoid huge DB entries)
            incomingMediaType = audioMsg ? "audio" : imageMsg ? "image" : "document";
            if (incomingMediaType === "image") {
              incomingMediaUrl = `data:${mediaMimeType};base64,${mediaBase64}`;
            }
            
            messageBody = await processMediaWithAI(
              OPENAI_API_KEY,
              LOVABLE_API_KEY,
              mediaBase64,
              mediaMimeType,
              incomingMediaType,
              mediaCaption,
              docMsg?.fileName
            );
            
            console.log(`✅ Media transcribed/described: ${messageBody.slice(0, 100)}...`);
          } else {
            messageBody = audioMsg 
              ? "[Áudio recebido - não foi possível processar]"
              : imageMsg 
                ? "[Imagem recebida - não foi possível processar]"
                : "[Documento recebido - não foi possível processar]";
          }
        }
      } catch (mediaError) {
        console.error("❌ Media processing error:", mediaError);
        messageBody = "[Mídia recebida - erro ao processar]";
      }
    }

    console.log(`📩 Message from ${clientPhone}: ${messageBody.slice(0, 200)}`);

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
      
      // Check if there's a funnel agent assignment for "Novo Contato"
      const { data: funnelAgent } = await supabase
        .from("funnel_agent_assignments")
        .select("agent_id")
        .eq("user_id", ownerId)
        .eq("stage_name", "Novo Contato")
        .maybeSingle();

      let agent = null;

      if (funnelAgent?.agent_id) {
        // Use funnel-assigned agent
        const { data: fAgent } = await supabase
          .from("agents")
          .select("*")
          .eq("id", funnelAgent.agent_id)
          .eq("is_active", true)
          .maybeSingle();
        agent = fAgent;
        if (agent) console.log(`🔄 Using funnel agent for Novo Contato: ${agent.name}`);
      }

      if (!agent) {
        // Fallback: find default agent
        const { data: defaultAgent } = await supabase
          .from("agents")
          .select("*")
          .eq("user_id", ownerId)
          .eq("is_active", true)
          .eq("is_default", true)
          .limit(1)
          .maybeSingle();

        agent = defaultAgent || (await supabase
          .from("agents")
          .select("*")
          .eq("user_id", ownerId)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle()).data;
      }

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
        media_url: incomingMediaUrl,
        media_type: incomingMediaType,
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
        media_url: incomingMediaUrl,
        media_type: incomingMediaType,
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
      media_url: incomingMediaUrl,
      media_type: incomingMediaType,
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
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const rules = rulesResult.data;
    const steps = stepsResult.data || [];
    const faqs = faqsResult.data || [];
    const history = (historyResult.data || []).reverse(); // Reverse to chronological order (fetched desc for recency)

    console.log(`📋 Agent config - Rules: ${!!rules}, Steps: ${steps.length}, FAQs: ${faqs.length}`);

    // First check if it's an FAQ
    if (faqs.length > 0) {
      const faqMatch = await checkFAQ(OPENAI_API_KEY, LOVABLE_API_KEY, messageBody, faqs);
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
    
    // CRITICAL: Distinguish "script completed" (current_step_id is null but steps exist)
    // from "script not started" (no steps at all)
    const isScriptCompleted = !currentStep && steps.length > 0;
    const nextStep = isScriptCompleted 
      ? undefined  // Script already done — do NOT restart from step 0
      : (currentStepIndex >= 0 ? steps[currentStepIndex + 1] : steps[0]);

    console.log(`📍 Current step: ${currentStepIndex + 1}/${steps.length}, scriptCompleted: ${isScriptCompleted}`);

    // ===== RETROACTIVE CATEGORY-BASED AGENT SWITCH =====
    // If the script is already completed but we're still on the same (reception) agent,
    // try to detect the legal area and switch to the specialist agent NOW
    if (isScriptCompleted) {
      try {
        const categoryAgentId = await detectAndMatchCategoryAgent(
          OPENAI_API_KEY,
          LOVABLE_API_KEY,
          supabase,
          userId,
          agentId,
          history,
          messageBody
        );

        if (categoryAgentId && categoryAgentId !== agentId) {
          console.log(`🔄 Retroactive category switch: switching from ${agentId} to ${categoryAgentId}`);

          const switchUpdate: Record<string, any> = {
            active_agent_id: categoryAgentId,
            is_agent_paused: false,
            current_step_id: null,
          };

          // Get first step of new agent's script
          const { data: newFirstStep } = await supabase
            .from("agent_script_steps")
            .select("id")
            .eq("agent_id", categoryAgentId)
            .order("step_order", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (newFirstStep) {
            switchUpdate.current_step_id = newFirstStep.id;
          }

          // Advance funnel stage
          const nextStage = getNextFunnelStage(existingCase.status);
          if (nextStage) {
            switchUpdate.status = nextStage;
          }

          await supabase
            .from("cases")
            .update(switchUpdate)
            .eq("id", existingCase.id);

          // Send the new agent's welcome/first step message
          const [newAgentRulesRes, newAgentFirstStepRes] = await Promise.all([
            supabase.from("agent_rules").select("welcome_message").eq("agent_id", categoryAgentId).maybeSingle(),
            supabase.from("agent_script_steps").select("message_to_send").eq("agent_id", categoryAgentId).order("step_order", { ascending: true }).limit(1).maybeSingle(),
          ]);

          const greeting = newAgentFirstStepRes.data?.message_to_send || newAgentRulesRes.data?.welcome_message;
          if (greeting) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const greetingText = greeting.replace(/\{nome\}/gi, existingCase.client_name || clientName);
            const greetingMsgId = await sendWhatsAppMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, clientPhone, greetingText);
            await supabase.from("conversation_history").insert({
              case_id: existingCase.id,
              role: "assistant",
              content: greetingText,
              external_message_id: greetingMsgId,
              message_status: "sent",
            });
            console.log(`✉️ New specialist agent sent first message`);
          }

          return new Response(JSON.stringify({ status: "agent_switched_by_category" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.error("❌ Retroactive category switch error:", e);
        // Continue with normal flow if switch fails
      }
    }

    // Check if user has Google Calendar connected
    const { data: calendarToken } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const hasCalendarConnected = !!calendarToken;
    console.log(`📅 Calendar connected: ${hasCalendarConnected}`);

    const aiResponse = await processWithAI(
      OPENAI_API_KEY,
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
      agentId,
      isScriptCompleted
    );

    console.log(`🤖 AI Response action: ${aiResponse.action}, new_status: ${aiResponse.new_status || 'none'}`);

    // Handle status change if detected
    if (aiResponse.new_status && aiResponse.new_status !== previousStatus) {
      const statusUpdate: Record<string, any> = { status: aiResponse.new_status };

      // Check funnel agent assignment for auto-switch
      const { data: funnelAssignment } = await supabase
        .from("funnel_agent_assignments")
        .select("agent_id")
        .eq("user_id", userId)
        .eq("stage_name", aiResponse.new_status)
        .maybeSingle();

      if (funnelAssignment?.agent_id) {
        statusUpdate.active_agent_id = funnelAssignment.agent_id;
        statusUpdate.is_agent_paused = false;
        statusUpdate.current_step_id = null; // Reset script for new agent

        // Get first step of the new agent's script
        const { data: newFirstStep } = await supabase
          .from("agent_script_steps")
          .select("id")
          .eq("agent_id", funnelAssignment.agent_id)
          .order("step_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (newFirstStep) {
          statusUpdate.current_step_id = newFirstStep.id;
        }

        console.log(`🔄 Funnel auto-switch: agent changed to ${funnelAssignment.agent_id} for stage "${aiResponse.new_status}"`);
      }

      await supabase
        .from("cases")
        .update(statusUpdate)
        .eq("id", existingCase.id);

      console.log(`📊 Status changed: ${previousStatus} -> ${aiResponse.new_status}`);

      // Generate case description when qualified
      if (aiResponse.new_status === "Qualificado" || aiResponse.new_status === "Convertido") {
        generateCaseDescription(
          supabase, OPENAI_API_KEY, LOVABLE_API_KEY, existingCase.id, existingCase.client_name || clientName, history
        ).catch(e => console.error("Case description generation error:", e));
      }

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
    } else if (aiResponse.action === "PROCEED" && !nextStep && !isScriptCompleted) {
      // ===== SCRIPT COMPLETED — AUTO-ADVANCE FUNNEL =====
      console.log(`🏁 Script completed for agent ${agentId}. Marking as done and attempting funnel auto-advance...`);

      // CRITICAL: Set current_step_id to null to mark script as COMPLETED
      await supabase
        .from("cases")
        .update({ current_step_id: null })
        .eq("id", existingCase.id);

      // Send the AI's closing response first
      const closingMsgId = await sendWhatsAppMessage(
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
        external_message_id: closingMsgId,
        message_status: "sent",
      });

      // ===== CATEGORY-BASED AGENT SWITCH =====
      // Identify the client's legal area from conversation and match to a specialist agent
      let categoryAgentId: string | null = null;
      try {
        categoryAgentId = await detectAndMatchCategoryAgent(
          OPENAI_API_KEY,
          LOVABLE_API_KEY,
          supabase,
          userId,
          agentId,
          history,
          messageBody
        );
      } catch (e) {
        console.error("❌ Category agent detection error:", e);
      }

      // Determine the next funnel stage
      const nextFunnelStage = aiResponse.new_status || getNextFunnelStage(existingCase.status);

      if (nextFunnelStage && nextFunnelStage !== existingCase.status) {
        console.log(`📊 Auto-advancing funnel: ${existingCase.status} → ${nextFunnelStage}`);

        const statusUpdate: Record<string, any> = {
          status: nextFunnelStage,
          updated_at: new Date().toISOString(),
        };

        // Priority: category-based agent > funnel stage assignment
        let switchAgentId: string | null = categoryAgentId;

        if (!switchAgentId) {
          // Fallback: check funnel stage assignment
          const { data: nextAssignment } = await supabase
            .from("funnel_agent_assignments")
            .select("agent_id")
            .eq("user_id", userId)
            .eq("stage_name", nextFunnelStage)
            .maybeSingle();

          switchAgentId = nextAssignment?.agent_id || null;
        }

        if (switchAgentId && switchAgentId !== agentId) {
          // Switch to the new agent
          statusUpdate.active_agent_id = switchAgentId;
          statusUpdate.is_agent_paused = false;
          statusUpdate.current_step_id = null;

          // Get first step of new agent's script
          const { data: newFirstStep } = await supabase
            .from("agent_script_steps")
            .select("id")
            .eq("agent_id", switchAgentId)
            .order("step_order", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (newFirstStep) {
            statusUpdate.current_step_id = newFirstStep.id;
          }

          console.log(`🔄 Auto-switch: agent changed to ${switchAgentId} (category: ${!!categoryAgentId}, funnel: ${!categoryAgentId}) for stage "${nextFunnelStage}"`);
          // Send first message from new agent after a brief delay
          const { data: newAgentRules } = await supabase
            .from("agent_rules")
            .select("welcome_message")
            .eq("agent_id", switchAgentId)
            .maybeSingle();

          const { data: newAgentFirstStep } = await supabase
            .from("agent_script_steps")
            .select("message_to_send")
            .eq("agent_id", switchAgentId)
            .order("step_order", { ascending: true })
            .limit(1)
            .maybeSingle();

          // Determine what the new agent should say first
          const newAgentGreeting = newAgentFirstStep?.message_to_send || newAgentRules?.welcome_message;

          if (newAgentGreeting) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const greetingMsg = newAgentGreeting.replace(
              /\{nome\}/gi,
              existingCase.client_name || clientName
            );

            const greetingMsgId = await sendWhatsAppMessage(
              EVOLUTION_API_URL,
              EVOLUTION_API_KEY,
              instanceName,
              clientPhone,
              greetingMsg
            );

            await supabase.from("conversation_history").insert({
              case_id: existingCase.id,
              role: "assistant",
              content: greetingMsg,
              external_message_id: greetingMsgId,
              message_status: "sent",
            });

            console.log(`✉️ New agent sent first message for stage "${nextFunnelStage}"`);
          }
        }

        await supabase
          .from("cases")
          .update(statusUpdate)
          .eq("id", existingCase.id);

        // Send notification for status change
        await sendStatusNotification(
          supabase,
          EVOLUTION_API_URL,
          EVOLUTION_API_KEY,
          instanceName,
          userId,
          existingCase.client_name || clientName,
          clientPhone,
          nextFunnelStage
        );

        // Generate case description when qualified via funnel auto-advance
        if (nextFunnelStage === "Qualificado" || nextFunnelStage === "Convertido") {
          generateCaseDescription(
            supabase, OPENAI_API_KEY, LOVABLE_API_KEY, existingCase.id, existingCase.client_name || clientName, history
          ).catch(e => console.error("Case description generation error:", e));
        }
      }
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

    // Save contact memory in background (every 5th message to avoid excessive API calls)
    const messageCount = history.length + 2; // +2 for new client msg + assistant response
    if (messageCount % 5 === 0) {
      const recentContext = history.slice(-6).map((m: any) => `${m.role}: ${m.content}`).join("\n");
      const fullContext = `${recentContext}\nclient: ${messageBody}\nassistant: ${aiResponse.response_text}`;
      
      // Fire and forget - don't block the response
      saveContactMemory(
        supabase, OPENAI_API_KEY, LOVABLE_API_KEY, userId, clientPhone, agentId, fullContext
      ).catch(e => console.error("Memory save error:", e));
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
  apiKey: string | null,
  lovableApiKey: string | null,
  message: string,
  faqs: { question: string; answer: string }[]
): Promise<string | null> {
  const faqList = faqs.map((f, i) => `${i + 1}. Pergunta: "${f.question}"`).join("\n");

  try {
    const data = await callAIChatCompletions(apiKey, lovableApiKey, {
      model: "gpt-4o-mini",
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
    });

    const answer = data.choices?.[0]?.message?.content?.trim();
    const faqIndex = parseInt(answer) - 1;

    if (faqIndex >= 0 && faqIndex < faqs.length) {
      return faqs[faqIndex].answer;
    }
  } catch (e) {
    console.error("FAQ check failed:", e);
  }

  return null;
}

// Helper: search RAG knowledge base for relevant context
async function searchRAGContext(
  supabase: any,
  apiKey: string | null,
  lovableApiKey: string | null,
  userId: string,
  agentId: string,
  query: string,
  clientPhone?: string
): Promise<string> {
  try {
    // Generate embedding
    const embedding = await callAIEmbeddings(apiKey, lovableApiKey, query, 768);
    if (!embedding) {
      console.warn("⚠️ Could not generate embedding for RAG search, skipping");
      return "";
    }

    // Search knowledge base AND contact memories in parallel
    const [knowledgeResults, memoryResults] = await Promise.all([
      supabase.rpc("match_knowledge_chunks", {
        query_embedding: JSON.stringify(embedding),
        match_user_id: userId,
        match_agent_id: agentId,
        match_threshold: 0.5,
        match_count: 3,
      }),
      clientPhone ? supabase.rpc("match_contact_memories", {
        query_embedding: JSON.stringify(embedding),
        match_user_id: userId,
        match_phone: clientPhone,
        match_agent_id: agentId,
        match_threshold: 0.5,
        match_count: 3,
      }).then((res: any) => res, () => ({ data: null, error: null })) : Promise.resolve({ data: null, error: null }),
    ]);

    const chunks = knowledgeResults.data || [];
    const memories = memoryResults.data || [];

    let contextParts: string[] = [];

    if (chunks.length > 0) {
      console.log(`🧠 RAG found ${chunks.length} relevant knowledge chunks`);
      const ragContext = chunks
        .map((r: any, i: number) => `[Doc ${i + 1}] ${r.content}`)
        .join("\n\n");
      contextParts.push(`📚 Base de Conhecimento:\n${ragContext}`);
    }

    if (memories.length > 0) {
      console.log(`💭 Found ${memories.length} contact memories`);
      const memContext = memories
        .map((r: any, i: number) => `[Mem ${i + 1}] ${r.content}`)
        .join("\n");
      contextParts.push(`💭 Memórias do Contato:\n${memContext}`);
    }

    return contextParts.join("\n\n---\n\n");
  } catch (e) {
    console.error("RAG search error:", e);
    return "";
  }
}

// Generate AI case description when lead is qualified
async function generateCaseDescription(
  supabase: any,
  apiKey: string | null,
  lovableApiKey: string | null,
  caseId: string,
  clientName: string,
  history: any[]
) {
  try {
    console.log(`📝 Generating case description for case ${caseId}...`);

    const conversationText = history
      .slice(-30)
      .map((m: any) => `${m.role === "user" ? "Cliente" : "Assistente"}: ${m.content}`)
      .join("\n");

    const data = await callAIChatCompletions(apiKey, lovableApiKey, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `Você é um assistente jurídico. Gere uma descrição concisa do caso com base na conversa abaixo.

FORMATO OBRIGATÓRIO:
- Máximo 3 parágrafos curtos
- Parágrafo 1: Tipo de caso e demanda principal do cliente
- Parágrafo 2: Dados relevantes coletados (valores, datas, documentos mencionados)
- Parágrafo 3: Status atual e próximos passos recomendados

Seja objetivo e profissional. Use linguagem jurídica quando apropriado.`
        },
        {
          role: "user",
          content: `Cliente: ${clientName}\n\nConversa:\n${conversationText}\n\nGere a descrição do caso.`
        }
      ],
    });

    const description = data.choices?.[0]?.message?.content;

    if (description) {
      await supabase
        .from("cases")
        .update({ case_description: description })
        .eq("id", caseId);

      console.log(`✅ Case description saved for case ${caseId}`);
    }
  } catch (error) {
    console.error("Error generating case description:", error);
  }
}

// Detect client's legal area from conversation and find a matching specialist agent by category
async function detectAndMatchCategoryAgent(
  apiKey: string | null,
  lovableApiKey: string | null,
  supabase: any,
  userId: string,
  currentAgentId: string,
  history: any[],
  lastMessage: string
): Promise<string | null> {
  // Get available agent categories (excluding the current agent)
  const { data: availableAgents } = await supabase
    .from("agents")
    .select("id, name, category")
    .eq("user_id", userId)
    .eq("is_active", true)
    .neq("id", currentAgentId)
    .not("category", "is", null);

  if (!availableAgents || availableAgents.length === 0) {
    console.log("⚠️ No specialist agents with categories found for category-based switch");
    return null;
  }

  const categories = [...new Set(availableAgents.map((a: any) => a.category))];
  console.log(`🔍 Detecting legal area from conversation. Available categories: ${categories.join(", ")}`);

  // Use AI to identify the legal area from the conversation
  const conversationSnippet = history
    .slice(-20)
    .map((m: any) => `${m.role === "client" ? "Cliente" : "Assistente"}: ${m.content}`)
    .join("\n");

  const data = await callAIChatCompletions(apiKey, lovableApiKey, {
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 30,
    messages: [
      {
        role: "system",
        content: `Você é um classificador jurídico. Analise a conversa e identifique a área do direito do caso do cliente.

CATEGORIAS DISPONÍVEIS:
${categories.join("\n")}

Responda APENAS com o nome EXATO de UMA categoria da lista acima. Se nenhuma se aplicar, responda "NENHUMA".`
      },
      {
        role: "user",
        content: `Conversa:\n${conversationSnippet}\nÚltima mensagem do cliente: ${lastMessage}\n\nQual a área jurídica deste caso?`
      }
    ],
  });

  const detectedCategory = data.choices?.[0]?.message?.content?.trim();
  console.log(`🏷️ Detected legal category: "${detectedCategory}"`);

  if (!detectedCategory || detectedCategory === "NENHUMA") {
    return null;
  }

  // Find an agent matching the detected category
  const matchingAgent = availableAgents.find(
    (a: any) => a.category?.toLowerCase() === detectedCategory.toLowerCase()
  );

  if (matchingAgent) {
    console.log(`✅ Found specialist agent: "${matchingAgent.name}" (category: ${matchingAgent.category})`);
    return matchingAgent.id;
  }

  console.log(`⚠️ No agent found for category "${detectedCategory}"`);
  return null;
}

async function processWithAI(
  apiKey: string | null,
  lovableApiKey: string | null,
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
  agentId: string,
  isScriptCompleted: boolean = false
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

    // Only check recent messages (last 10) for slot presentation to allow re-scheduling
    const recentForSlots = history.slice(-10);
    const hasPresentedSlots = recentForSlots.some(
      (h) =>
        h.role !== "client" &&
        /hor[aá]rios\s*:/i.test(String(h.content || "")) &&
        (/\(20\d{2}-\d{2}-\d{2}\)/.test(String(h.content || "")) ||
         /\d{2}\/\d{2}\/20\d{2}/.test(String(h.content || "")) ||
         /\d{1,2}:\d{2}/.test(String(h.content || "")))
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
  
  // ===== EXTRACT COLLECTED DATA FROM HISTORY =====
  // Parse conversation to find already-collected info so the agent NEVER re-asks
  const emailRegex2 = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  const collectedData: Record<string, string> = {};
  
  for (const h of history) {
    const content = String(h.content || "");
    // Extract emails from client messages
    if (h.role === "client") {
      const emailMatch = content.match(emailRegex2);
      if (emailMatch) collectedData["email"] = emailMatch[0].toLowerCase();
    }
    // Extract confirmed data from assistant messages (e.g., "Já anotei seu e-mail (x@y.com)")
    if (h.role === "assistant") {
      const confirmedEmail = content.match(/e-?mail[^(]*\(([^)]+@[^)]+)\)/i);
      if (confirmedEmail) collectedData["email"] = confirmedEmail[1].toLowerCase();
    }
  }

  const collectedDataContext = Object.keys(collectedData).length > 0
    ? `\n\n✅ DADOS JÁ COLETADOS (NUNCA peça novamente!):\n${Object.entries(collectedData).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
    : "";

  // Build context about the script
  const scriptContext = allSteps.map((s, i) => 
    `Etapa ${i + 1}: "${s.situation || 'Sem descrição'}" - Mensagem: "${s.message_to_send}"`
  ).join("\n");

  const currentStepInfo = isScriptCompleted
    ? `\n\n✅ ROTEIRO CONCLUÍDO:
- Todas as etapas do roteiro já foram finalizadas.
- NÃO repita nenhuma pergunta do roteiro.
- Converse de forma natural e livre com o cliente.
- Se o cliente fizer uma nova pergunta, responda diretamente.
- Se o cliente se despedir, despeça-se de forma profissional.`
    : currentStep 
      ? `\n\n📍 ETAPA ATUAL (${currentStep.step_order}/${allSteps.length}):
- Situação: "${currentStep.situation || 'Sem descrição'}"  
- Mensagem que você enviou: "${currentStep.message_to_send}"
- Objetivo: Coletar a informação desta etapa antes de avançar`
      : "\n\nVocê está no início do atendimento.";

  const nextStepInfo = isScriptCompleted
    ? "" // No next step info when script is completed
    : nextStep
      ? `\n\n➡️ PRÓXIMA ETAPA (${nextStep.step_order}/${allSteps.length}):
- Situação: "${nextStep.situation || 'Sem descrição'}"
- Mensagem a enviar: "${nextStep.message_to_send}"`
      : "\n\n⚠️ Esta é a ÚLTIMA etapa do roteiro.";

  // Build conversation memory - use last 30 messages for context
  const recentHistory = history.slice(-30);
  const conversationMemory = recentHistory.length > 0
    ? `\n\n💬 HISTÓRICO RECENTE (${recentHistory.length} últimas mensagens):
${recentHistory.map((h) => `${h.role === 'client' ? '👤 Cliente' : '🤖 Você'}: ${h.content}`).join('\n')}`
    : "";

  // Calendar context if available - use São Paulo timezone
  const SP_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowSP = new Date(Date.now() - SP_OFFSET_MS);
  const currentDateStr = nowSP.toISOString().split('T')[0];
  const currentYear = nowSP.getUTCFullYear();
  const currentMonth = nowSP.getUTCMonth() + 1;
  const currentDay = nowSP.getUTCDate();
  const currentHourSP = nowSP.getUTCHours();
  const currentMinuteSP = nowSP.getUTCMinutes();
  const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const currentDayOfWeek = diasSemana[nowSP.getUTCDay()];
  
  const calendarContext = hasCalendarConnected 
    ? `\n\n📅 AGENDAMENTO DISPONÍVEL:
- HOJE É: ${currentDayOfWeek}, ${String(currentDay).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')}/${currentYear} (${currentDateStr}), ${String(currentHourSP).padStart(2, '0')}:${String(currentMinuteSP).padStart(2, '0')} horário de Brasília
- ATENÇÃO: Use SEMPRE esta data como referência. "Amanhã" = dia ${String(currentDay + 1).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')}/${currentYear}. "Sexta-feira" = verifique o calendário para encontrar a próxima sexta-feira a partir de HOJE.
- Você TEM ACESSO ao calendário do escritório para agendar consultas.

FLUXO DE AGENDAMENTO (siga em ordem):
1. Se o cliente quer agendar mas você NÃO MOSTROU os horários ainda: use check_calendar_availability IMEDIATAMENTE (NÃO diga "um momento" ou "vou verificar" antes - chame a ferramenta direto!)
2. Se você JÁ MOSTROU os horários e o cliente ESCOLHEU um (ex: "10:00", "segunda às 14h", "amanhã de manhã"): 
   - Se já tem email nos DADOS COLETADOS acima, use create_calendar_event DIRETO com o email!
   - Se NÃO tem email, peça o email UMA ÚNICA VEZ
3. NUNCA chame check_calendar_availability se já mostrou os horários e o cliente escolheu um!

⚠️ REGRA CRÍTICA:
- NUNCA responda com "um momento", "só um instante", "vou verificar" sem chamar uma ferramenta ao mesmo tempo!
- Quando o cliente pede para agendar, chame check_calendar_availability DIRETO, sem mensagens intermediárias.
- Se você chamar uma ferramenta de calendário, NÃO chame send_response ao mesmo tempo. A resposta será gerada após o resultado da ferramenta.

IMPORTANTE:
- Ao criar eventos, use sempre o ano ${currentYear} nas datas
- Use APENAS datas FUTURAS (a partir de ${currentDateStr}). NUNCA agende em datas passadas!
- Quando o cliente responde com um horário específico, isso é uma ESCOLHA - use create_calendar_event!
- CONFIRA que a data do evento corresponde ao dia da semana correto antes de responder`
    : "";

  // RAG: Search knowledge base for relevant context
  let ragContext = "";
  try {
    ragContext = await searchRAGContext(supabase, apiKey, lovableApiKey, userId, agentId, clientMessage, clientPhone);
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

  const systemPrompt = `Você é um assistente virtual de atendimento jurídico/profissional de ALTO NÍVEL. Você representa um escritório de advocacia e deve se comportar com a excelência, precisão e profissionalismo esperados de um advogado sênior.

${rules?.system_prompt || "Seja profissional, educado e objetivo nas respostas."}

🏆 PADRÃO DE EXCELÊNCIA:
- Seja CONCISO e DIRETO. Evite mensagens longas e repetitivas.
- Transmita confiança e competência em cada resposta.
- Use linguagem profissional mas acessível (evite juridiquês desnecessário).
- Demonstre empatia genuína pela situação do cliente.
- NUNCA use emojis em excesso (máximo 1-2 por mensagem quando apropriado).

📋 REGRAS DO ATENDIMENTO:
${rules?.agent_rules || "- Seja cordial e profissional\n- Responda de forma clara e objetiva\n- Mantenha o foco no roteiro"}

🚫 PROIBIÇÕES ABSOLUTAS:
${rules?.forbidden_actions || "- Não forneça informações falsas\n- Não faça promessas que não pode cumprir\n- Não seja invasivo"}
- NUNCA peça uma informação que já foi fornecida (consulte DADOS COLETADOS e HISTÓRICO)
- NUNCA repita a mesma pergunta, mesmo com palavras diferentes
- NUNCA diga "como posso ajudá-lo?" se o cliente já explicou o que quer
- NUNCA INVENTE horários disponíveis! Quando o cliente pedir para agendar, SEMPRE use a ferramenta check_calendar_availability para buscar os horários REAIS do Google Calendar. Se você não tem a ferramenta disponível, diga que vai verificar a agenda.
- Se o cliente disser "já te mandei/já falei/já informei", PROCURE a informação no histórico e use-a
- Se não encontrar a informação, peça desculpas UMA VEZ e peça para confirmar

📝 ROTEIRO COMPLETO:
${scriptContext}
${currentStepInfo}
${nextStepInfo}
${collectedDataContext}
${conversationMemory}
${calendarContext}
${knowledgeBaseContext}

👤 INFORMAÇÕES DO CLIENTE:
- Nome: ${clientName}
- Telefone: ${clientPhone}

🎯 INSTRUÇÕES DE DECISÃO:
1. Se o cliente respondeu adequadamente à pergunta da etapa atual → action "PROCEED"
2. Se o cliente fez uma pergunta ou deu resposta vaga → action "STAY"  
3. Se for a última etapa e o cliente concordou → new_status "Qualificado"
4. Se o cliente demonstrar desinteresse → new_status "Não Qualificado"
5. SEMPRE use o nome do cliente de forma natural
6. Se o cliente pedir para agendar → USE as ferramentas de calendário
7. Mantenha respostas com no MÁXIMO 3-4 linhas (exceto quando listando horários)`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-25).map((h) => ({
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
    // Check if conversation history suggests we already showed slots RECENTLY
    // Only check last 10 messages to allow re-scheduling in long conversations
    const recentMessages = history.slice(-10);
    const alreadyShowedSlots = recentMessages.some(
      (h) =>
        h.role === "assistant" &&
        /hor[aá]rios?\s*(?:disponíveis|que temos|:)/i.test(String(h.content || "")) &&
        (/\(20\d{2}-\d{2}-\d{2}\)/.test(String(h.content || "")) ||
         /\d{2}\/\d{2}\/20\d{2}/.test(String(h.content || "")) ||
         /\d{1,2}:\d{2}/.test(String(h.content || "")))
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
  const data = await callAIChatCompletions(apiKey, lovableApiKey, {
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
    max_tokens: 500,
    tools,
    tool_choice: "auto"
  });
  
  // Handle tool calls
  const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
  console.log(`🔧 Tool calls received: ${toolCalls.length}`);

  // Prioritize calendar/action tools over send_response
  // This prevents "um momento" responses from short-circuiting the calendar flow
  const prioritizedToolCalls = [...toolCalls].sort((a, b) => {
    const priority = (name: string) => {
      if (name === "check_calendar_availability") return 0;
      if (name === "create_calendar_event") return 1;
      if (name === "send_zapsign_document") return 2;
      if (name === "send_response") return 10; // lowest priority
      return 5;
    };
    return priority(a.function?.name || "") - priority(b.function?.name || "");
  });

  // If we have a calendar tool AND send_response, skip send_response
  const hasCalendarTool = prioritizedToolCalls.some(tc => 
    tc.function?.name === "check_calendar_availability" || 
    tc.function?.name === "create_calendar_event"
  );

  for (const toolCall of prioritizedToolCalls) {
    const funcName = toolCall.function?.name;
    const funcArgs = toolCall.function?.arguments;
    
    if (!funcName || !funcArgs) continue;
    
    // Skip send_response if a calendar tool is also present
    if (funcName === "send_response" && hasCalendarTool) {
      console.log(`⏭️ Skipping send_response because calendar tool is present`);
      continue;
    }
    
    console.log(`🔧 Processing tool: ${funcName}`);
    
    if (funcName === "check_calendar_availability") {
      try {
        const args = JSON.parse(funcArgs);
        const daysAhead = args.days_ahead || 7;
        
        // Get available slots
        const slots = await getCalendarAvailability(supabase, userId, daysAhead);
        console.log(`📅 Found ${slots.length} available slots`);
        
        // Make second AI call with slots info - show ALL available slots up to 20
        const spNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const currentYear = spNow.getUTCFullYear();
        
        console.log(`📅 Total slots available: ${slots.length}`);
        
        // Group slots by date for better presentation (using São Paulo time)
        const slotsByDate = new Map<string, { start: string; end: string }[]>();
        slots.slice(0, 20).forEach(s => {
          // Convert UTC to São Paulo for grouping
          const spDate = new Date(new Date(s.start).getTime() - 3 * 60 * 60 * 1000);
          const dateKey = spDate.toISOString().split('T')[0];
          if (!slotsByDate.has(dateKey)) {
            slotsByDate.set(dateKey, []);
          }
          slotsByDate.get(dateKey)!.push(s);
        });
        
        const diasSemanaSlots = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
        let slotsText = "";
        slotsByDate.forEach((daySlots, dateKey) => {
          // Format in São Paulo time
          const spDate = new Date(new Date(daySlots[0].start).getTime() - 3 * 60 * 60 * 1000);
          const dayName = diasSemanaSlots[spDate.getUTCDay()];
          const day = String(spDate.getUTCDate()).padStart(2, '0');
          const month = String(spDate.getUTCMonth() + 1).padStart(2, '0');
          const year = spDate.getUTCFullYear();
          const dateStr = `${dayName}, ${day}/${month}/${year}`;
          
          const times = daySlots.map(s => {
            const d = new Date(new Date(s.start).getTime() - 3 * 60 * 60 * 1000);
            return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
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
            content: `HOJE É ${currentDateStr} (${currentDayOfWeek}). Horários disponíveis encontrados (ano atual: ${currentYear}):\n\n${slotsText}\nVocê DEVE apresentar TODOS estes horários ao cliente de forma organizada por dia. Deixe o cliente escolher. Quando ele escolher, use create_calendar_event com a data no formato YYYY-MM-DD (mostrada entre parênteses ao lado de cada dia) e o horário escolhido. NUNCA invente datas - use SOMENTE as datas listadas acima.`
          }
        ];
        
        const followUpData = await callAIChatCompletions(apiKey, lovableApiKey, {
            model: "gpt-4o-mini",
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
          });
        
        {
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
          
          const followUpData = await callAIChatCompletions(apiKey, lovableApiKey, {
              model: "gpt-4o-mini",
              messages: followUpMessages,
              temperature: 0.7,
              max_tokens: 500,
              tools: [tools[0]],
              tool_choice: { type: "function", function: { name: "send_response" } }
            });
          
          {
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

        const followUpData = await callAIChatCompletions(apiKey, lovableApiKey, {
            model: "gpt-4o-mini",
            messages: followUpMessages,
            temperature: 0.7,
            max_tokens: 300,
            tools: [tools[0]],
            tool_choice: { type: "function", function: { name: "send_response" } },
          });

        {
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

  // Fallback: try to parse content as JSON or use as plain text
  const content = data.choices?.[0]?.message?.content?.trim();
  console.log("🤖 Raw AI response:", content);

  if (content) {
    // First try to parse as JSON
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
      // Not JSON - use the raw text directly as the response
      // This handles the case when Gemini/Lovable AI returns plain text instead of tool calls
      console.log("ℹ️ AI returned plain text (not JSON/tool_call), using directly as response");
      
      // Try to detect action hints in the text
      const textLower = content.toLowerCase();
      let shouldProceed = textLower.includes('"action":"proceed"') || 
                           textLower.includes('"action": "proceed"') ||
                           textLower.includes("action: proceed") ||
                           textLower.includes("«proceed»");
      
      // Enhanced PROCEED detection for last step / finalization scenarios
      // When the AI mentions forwarding to specialist, concluding the script, etc.
      if (!shouldProceed && !nextStep) {
        const finalizationKeywords = [
          "encaminhar", "encaminhando", "especialista responsável",
          "próximo especialista", "vou transferir", "transferindo",
          "concluímos", "finalizar", "roteiro completo", "roteiro concluído",
          "próxima etapa", "confirmar o que entendi", "deixe-me confirmar",
          "resumo do seu caso", "resumo do atendimento"
        ];
        const hasFinalizationIntent = finalizationKeywords.some(kw => textLower.includes(kw));
        if (hasFinalizationIntent) {
          shouldProceed = true;
          console.log("🔍 Detected finalization intent in plain text response — forcing PROCEED");
        }
      }
      
      // Detect status changes
      let detectedStatus: string | undefined;
      if (textLower.includes("qualificado")) detectedStatus = "Qualificado";
      if (textLower.includes("não qualificado")) detectedStatus = "Não Qualificado";
      
      return {
        response_text: content,
        action: shouldProceed ? "PROCEED" : "STAY",
        new_status: detectedStatus,
      };
    }
  }

  // Final fallback - generic response (should rarely reach here)
  console.log("⚠️ Using fallback response - no content from AI");
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

    // São Paulo timezone offset (UTC-3)
    const SP_OFFSET_HOURS = 3;

    // Generate available slots based on user settings using São Paulo timezone
    const availableSlots: { start: string; end: string }[] = [];
    const currentDate = new Date(start);
    currentDate.setUTCHours(0, 0, 0, 0);

    const slotDurationMs = appointmentDuration * 60 * 1000;

    while (currentDate <= end) {
      // Get day of week in São Paulo time
      const spDate = new Date(currentDate.getTime() - SP_OFFSET_HOURS * 3600000);
      const dayOfWeek = spDate.getUTCDay();
      
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
            // Create slot in São Paulo time by adding offset to UTC
            const slotStart = new Date(currentDate);
            slotStart.setUTCHours(currentHour + SP_OFFSET_HOURS, currentMinute, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

            // Only add if slot is in the future
            if (slotStart > new Date()) {
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

// Download media from Evolution API (base64)
async function downloadMediaFromEvolution(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  messageData: any
): Promise<string | null> {
  try {
    const url = `${apiUrl}/chat/getBase64FromMediaMessage/${instanceName}`;
    console.log(`📥 Downloading media from Evolution API...`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        message: {
          key: messageData.key,
          message: messageData.message,
        },
        convertToMp4: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Evolution media download error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const base64 = data?.base64 || data?.data?.base64 || null;

    if (!base64) {
      console.error("No base64 data in Evolution response");
      return null;
    }

    console.log(`📥 Media downloaded: ${base64.length} chars base64`);
    return base64;
  } catch (error) {
    console.error("Error downloading media:", error);
    return null;
  }
}

// Process media (audio/image/document) with OpenAI
async function processMediaWithAI(
  apiKey: string | null,
  lovableApiKey: string | null,
  base64Data: string,
  mimeType: string,
  mediaType: "audio" | "image" | "document",
  caption?: string,
  fileName?: string
): Promise<string> {
  // For audio, use OpenAI Whisper API
  if (mediaType === "audio") {
    try {
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob([bytes], { type: mimeType });
      const formData = new FormData();
      formData.append("file", blob, `audio.${extension}`);
      formData.append("model", "whisper-1");
      formData.append("language", "pt");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Whisper error:", response.status, errorText);
        return "[Áudio recebido - erro ao processar]";
      }

      const data = await response.json();
      const transcription = data.text || "[áudio inaudível]";
      return `🎤 [Transcrição de áudio]: ${transcription}`;
    } catch (error) {
      console.error("Audio processing error:", error);
      return "[Áudio recebido - erro técnico]";
    }
  }

  // For images and documents, use GPT-4o vision
  const systemPrompts: Record<string, string> = {
    image: `Você é um analisador de imagens para um sistema de atendimento jurídico via WhatsApp.
Descreva o conteúdo da imagem de forma objetiva e completa.
Se for um documento/texto fotografado, transcreva o texto visível.
Se for uma captura de tela, descreva o conteúdo.
Se for uma foto comum, descreva o que aparece.
Retorne APENAS a descrição/transcrição, sem comentários.`,
    document: `Você é um extrator de texto de documentos para um sistema jurídico.
Extraia TODO o texto do documento recebido, preservando a estrutura (títulos, parágrafos, listas).
Se for um PDF ou documento Word, transcreva todo o conteúdo visível.
Retorne APENAS o texto extraído, sem comentários.${fileName ? `\nNome do arquivo: ${fileName}` : ""}`,
  };

  const userContent: any[] = [
    {
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${base64Data}`,
      },
    },
  ];

  if (caption) {
    userContent.push({
      type: "text",
      text: `Legenda enviada pelo cliente: "${caption}"`,
    });
  } else {
    userContent.push({
      type: "text",
      text: mediaType === "image"
        ? "Descreva esta imagem."
        : "Extraia o texto deste documento.",
    });
  }

  try {
    const data = await callAIChatCompletions(apiKey, lovableApiKey, {
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompts[mediaType] },
        { role: "user", content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const result = data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      return `[${mediaType === "image" ? "Imagem" : "Documento"} recebido - conteúdo vazio]`;
    }

    const prefix = mediaType === "image"
      ? "📷 [Descrição de imagem]: "
      : `📄 [Texto extraído de ${fileName || "documento"}]: `;

    return prefix + result;
  } catch (error) {
    console.error(`Error processing ${mediaType}:`, error);
    return `[${mediaType === "image" ? "Imagem" : "Documento"} recebido - erro técnico]`;
  }
}

// Save a conversation memory for the contact (runs in background)
async function saveContactMemory(
  supabase: any,
  apiKey: string | null,
  lovableApiKey: string | null,
  userId: string,
  clientPhone: string,
  agentId: string,
  conversationContext: string
): Promise<void> {
  try {
    // Generate a summary of the recent interaction
    const data = await callAIChatCompletions(apiKey, lovableApiKey, {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Resuma a interação abaixo em 1-2 frases objetivas, focando em:
- Assunto principal discutido
- Informações importantes do cliente (necessidades, preferências)
- Status atual do atendimento
Responda APENAS com o resumo, sem prefixos.`
        },
        { role: "user", content: conversationContext }
      ],
      temperature: 0.2,
      max_tokens: 200,
    });

    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) return;

    // Generate embedding
    const embedding = await callAIEmbeddings(apiKey, lovableApiKey, summary, 768);
    if (!embedding) {
      // Save memory without embedding (won't be searchable but still useful)
      await supabase.from("contact_memories").insert({
        user_id: userId,
        contact_phone: clientPhone,
        agent_id: agentId,
        memory_type: "conversation_summary",
        content: summary,
        metadata: { created_from: "auto_webhook", timestamp: new Date().toISOString() },
      });
      console.log(`🧠 Contact memory saved (no embedding) for ${clientPhone}`);
      return;
    }

    await supabase.from("contact_memories").insert({
      user_id: userId,
      contact_phone: clientPhone,
      agent_id: agentId,
      memory_type: "conversation_summary",
      content: summary,
      embedding: JSON.stringify(embedding),
      metadata: { created_from: "auto_webhook", timestamp: new Date().toISOString() },
    });

    console.log(`🧠 Contact memory saved for ${clientPhone}: ${summary.slice(0, 80)}...`);
  } catch (e) {
    console.error("Error saving contact memory:", e);
  }
}
