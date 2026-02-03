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
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const payload: WebhookPayload = await req.json();

    // Extract message content
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

    console.log(`📩 Message from ${clientPhone}: ${messageBody}`);

    // Find case by phone
    let { data: existingCase } = await supabase
      .from("cases")
      .select("*, active_agent:agents(*), current_step:agent_script_steps(*)")
      .eq("client_phone", clientPhone)
      .maybeSingle();

    const previousStatus = existingCase?.status;

    // If no case exists, find default agent and create case
    if (!existingCase) {
      console.log("🆕 Creating new case for:", clientPhone);
      
      // Find the first active default agent
      const { data: defaultAgent } = await supabase
        .from("agents")
        .select("*")
        .eq("is_active", true)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();

      const agent = defaultAgent || (await supabase
        .from("agents")
        .select("*")
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
        await sendWhatsAppMessage(
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
        });
      }

      // Send first step message
      if (firstStep) {
        // Delay slightly for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await sendWhatsAppMessage(
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
        });
      }

      // Save the incoming message
      await supabase.from("conversation_history").insert({
        case_id: newCase.id,
        role: "client",
        content: messageBody,
      });

      return new Response(JSON.stringify({ status: "new_case_created" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if agent is active for this case
    if (!existingCase.active_agent_id) {
      console.log("⏸️ No active agent for case, manual mode");
      // Save message but don't respond automatically
      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "client",
        content: messageBody,
      });
      return new Response(JSON.stringify({ status: "manual_mode" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save incoming message
    await supabase.from("conversation_history").insert({
      case_id: existingCase.id,
      role: "client",
      content: messageBody,
    });

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
        await sendWhatsAppMessage(
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
      hasCalendarConnected,
      userId
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

      await sendWhatsAppMessage(
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
      });
    } else {
      // Only send AI response when staying on current step
      await sendWhatsAppMessage(
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
  hasCalendarConnected: boolean,
  userId: string
): Promise<{ response_text: string; action: "PROCEED" | "STAY"; new_status?: string }> {
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
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
  const calendarContext = hasCalendarConnected 
    ? `\n\n📅 AGENDAMENTO DISPONÍVEL:
- Você TEM ACESSO ao calendário do escritório para agendar consultas.
- Quando o cliente quiser agendar, use a função check_calendar_availability para verificar horários livres.
- Depois use create_calendar_event para criar o agendamento.
- Ofereça 2-3 opções de horários disponíveis para o cliente escolher.
- IMPORTANTE: Sempre que o cliente mencionar agendamento, reunião, consulta ou horário, USE as ferramentas de calendário!`
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

  // Add calendar tools if connected
  if (hasCalendarConnected) {
    tools.push(
      {
        type: "function",
        function: {
          name: "check_calendar_availability",
          description: "Verifica os horários disponíveis no calendário para agendamento de consultas. Use quando o cliente quiser marcar uma reunião ou consulta.",
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
      },
      {
        type: "function",
        function: {
          name: "create_calendar_event",
          description: "Cria um agendamento no calendário. Use após o cliente escolher um horário específico.",
          parameters: {
            type: "object",
            properties: {
              date: {
                type: "string",
                description: "Data do agendamento no formato YYYY-MM-DD"
              },
              time: {
                type: "string",
                description: "Horário no formato HH:MM (ex: 14:00)"
              },
              summary: {
                type: "string",
                description: "Título da reunião (ex: Consulta inicial - Nome do Cliente)"
              },
              duration_minutes: {
                type: "number",
                description: "Duração em minutos (padrão: 60)"
              }
            },
            required: ["date", "time", "summary"],
            additionalProperties: false
          }
        }
      }
    );
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
        
        // Make second AI call with slots info
        const slotsText = slots.slice(0, 6).map(s => {
          const date = new Date(s.start);
          return `- ${date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }).join('\n');
        
        const followUpMessages = [
          ...messages,
          { role: "assistant" as const, content: "", tool_calls: [toolCall] },
          { 
            role: "tool" as const, 
            tool_call_id: toolCall.id,
            content: `Horários disponíveis encontrados:\n${slotsText}\n\nOfereça essas opções ao cliente de forma amigável.`
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
            tools: [tools[0]], // Only send_response tool
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
        console.log(`📅 Creating event: ${JSON.stringify(args)}`);
        
        const eventResult = await createCalendarEvent(
          supabase, 
          userId, 
          args.date, 
          args.time, 
          args.summary,
          args.duration_minutes || 60
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
        }
      } catch (e) {
        console.error("Calendar event creation error:", e);
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

    // Generate available slots (9h-18h, 1 hour slots)
    const availableSlots: { start: string; end: string }[] = [];
    const currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= end) {
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        for (let hour = 9; hour < 18; hour++) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + 1, 0, 0, 0);

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
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

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
  durationMinutes: number
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
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    
    const startDateTime = new Date(year, month - 1, day, hour, minute);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    const calendarEvent = {
      summary,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
    };

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
): Promise<void> {
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

  console.log(`✅ Message sent to ${phone}`);
}
