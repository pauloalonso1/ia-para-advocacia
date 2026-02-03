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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
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

    console.log(`Message from ${clientPhone}: ${messageBody}`);

    // Find case by phone
    let { data: existingCase } = await supabase
      .from("cases")
      .select("*, active_agent:agents(*), current_step:agent_script_steps(*)")
      .eq("client_phone", clientPhone)
      .maybeSingle();

    // If no case exists, find default agent and create case
    if (!existingCase) {
      // Find the first active default agent
      const { data: defaultAgent } = await supabase
        .from("agents")
        .select("*")
        .eq("is_active", true)
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();

      if (!defaultAgent) {
        // No default agent, find any active agent
        const { data: anyAgent } = await supabase
          .from("agents")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (!anyAgent) {
          console.log("No active agents found");
          return new Response(JSON.stringify({ status: "no_agents" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get first step
        const { data: firstStep } = await supabase
          .from("agent_script_steps")
          .select("*")
          .eq("agent_id", anyAgent.id)
          .order("step_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        // Create new case
        const { data: newCase, error: caseError } = await supabase
          .from("cases")
          .insert({
            user_id: anyAgent.user_id,
            client_phone: clientPhone,
            client_name: clientName,
            active_agent_id: anyAgent.id,
            current_step_id: firstStep?.id || null,
            status: "Novo Contato",
          })
          .select("*, active_agent:agents(*), current_step:agent_script_steps(*)")
          .single();

        if (caseError) throw caseError;
        existingCase = newCase;

        // Send welcome message if available
        const { data: rules } = await supabase
          .from("agent_rules")
          .select("*")
          .eq("agent_id", anyAgent.id)
          .maybeSingle();

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
      }
    }

    if (!existingCase) {
      return new Response(JSON.stringify({ status: "no_case" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save incoming message
    await supabase.from("conversation_history").insert({
      case_id: existingCase.id,
      role: "client",
      content: messageBody,
    });

    // Get agent details
    const agentId = existingCase.active_agent_id;

    // Get rules, steps, and FAQs
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
        .limit(20),
    ]);

    const rules = rulesResult.data;
    const steps = stepsResult.data || [];
    const faqs = faqsResult.data || [];
    const history = historyResult.data || [];

    // First check if it's an FAQ
    if (faqs.length > 0) {
      const faqMatch = await checkFAQ(OPENAI_API_KEY, messageBody, faqs);
      if (faqMatch) {
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
    const nextStep = steps[currentStepIndex + 1];

    const aiResponse = await processWithAI(
      OPENAI_API_KEY,
      rules,
      currentStep,
      nextStep,
      messageBody,
      history,
      steps
    );

    // Send response
    await sendWhatsAppMessage(
      EVOLUTION_API_URL,
      EVOLUTION_API_KEY,
      instanceName,
      clientPhone,
      aiResponse.response_text
    );

    // Save response
    await supabase.from("conversation_history").insert({
      case_id: existingCase.id,
      role: "assistant",
      content: aiResponse.response_text,
    });

    // If should proceed to next step
    if (aiResponse.action === "PROCEED" && nextStep) {
      await supabase
        .from("cases")
        .update({ current_step_id: nextStep.id })
        .eq("id", existingCase.id);

      // Send next step message
      await sendWhatsAppMessage(
        EVOLUTION_API_URL,
        EVOLUTION_API_KEY,
        instanceName,
        clientPhone,
        nextStep.message_to_send
      );

      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "assistant",
        content: nextStep.message_to_send,
      });
    }

    return new Response(JSON.stringify({ status: "processed", action: aiResponse.action }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function checkFAQ(
  apiKey: string,
  message: string,
  faqs: { question: string; answer: string }[]
): Promise<string | null> {
  const faqList = faqs.map((f, i) => `${i + 1}. Pergunta: "${f.question}"`).join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um analisador de FAQ. Dada uma mensagem do cliente e uma lista de perguntas frequentes, determine se a mensagem corresponde a alguma FAQ.
          
Responda APENAS com o número da FAQ correspondente ou "0" se nenhuma corresponder.`,
        },
        {
          role: "user",
          content: `Mensagem do cliente: "${message}"

FAQs disponíveis:
${faqList}

Responda apenas com o número (1, 2, 3...) ou 0:`,
        },
      ],
      temperature: 0.1,
      max_tokens: 10,
    }),
  });

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
  rules: any,
  currentStep: any,
  nextStep: any,
  clientMessage: string,
  history: any[],
  allSteps: any[]
): Promise<{ response_text: string; action: "PROCEED" | "STAY" }> {
  const systemPrompt = `${rules?.system_prompt || "Você é um assistente virtual profissional."}

REGRAS DO AGENTE:
${rules?.agent_rules || "- Seja educado e profissional"}

AÇÕES PROIBIDAS:
${rules?.forbidden_actions || "- Não forneça informações falsas"}

CONTEXTO DO ROTEIRO:
Você está seguindo um roteiro de atendimento. 
${currentStep ? `Passo atual: "${currentStep.situation || "Etapa " + currentStep.step_order}" - Você enviou: "${currentStep.message_to_send}"` : "Início do atendimento."}
${nextStep ? `Próximo passo: "${nextStep.situation || "Etapa " + nextStep.step_order}"` : "Este é o último passo."}

INSTRUÇÕES:
1. Analise a resposta do cliente
2. Se ele forneceu a informação solicitada de forma satisfatória, responda confirmando e prepare para avançar (action: PROCEED)
3. Se ele fez uma pergunta ou deu resposta incompleta, esclareça e solicite novamente (action: STAY)

Responda em JSON: {"response_text": "sua resposta", "action": "PROCEED" ou "STAY"}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-10).map((h) => ({
      role: h.role === "client" ? ("user" as const) : ("assistant" as const),
      content: h.content,
    })),
    { role: "user" as const, content: clientMessage },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(content);
    return {
      response_text: parsed.response_text || content,
      action: parsed.action === "PROCEED" ? "PROCEED" : "STAY",
    };
  } catch {
    // If not valid JSON, return as text with STAY action
    return {
      response_text: content || "Desculpe, não entendi. Pode repetir?",
      action: "STAY",
    };
  }
}

async function sendWhatsAppMessage(
  evolutionUrl: string,
  evolutionKey: string,
  instance: string,
  phone: string,
  message: string
): Promise<void> {
  const url = `${evolutionUrl}/message/sendText/${instance}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: evolutionKey,
    },
    body: JSON.stringify({
      number: phone,
      text: message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Evolution API error:", error);
    throw new Error(`Failed to send WhatsApp message: ${error}`);
  }
}
