// Case creation and agent switching logic

import { corsHeaders, getNextFunnelStage } from "./types.ts";
import { sendWhatsAppMessage, sendStatusNotification } from "./messaging.ts";
import { fireDelayedGreeting } from "./status-handler.ts";
import { callAIChatCompletions } from "./ai-client.ts";

// Create a new case for a first-time contact
export async function handleNewCase(
  supabase: any, ownerId: string, clientPhone: string, clientName: string,
  instanceName: string, messageBody: string,
  incomingMessageId: string | null, incomingMediaUrl: string | null, incomingMediaType: string | null,
  EVOLUTION_API_URL: string, EVOLUTION_API_KEY: string
) {
  console.log("🆕 Creating new case for:", clientPhone);

  // Check funnel agent assignment
  const { data: funnelAgent } = await supabase
    .from("funnel_agent_assignments")
    .select("agent_id")
    .eq("user_id", ownerId)
    .eq("stage_name", "Novo Contato")
    .maybeSingle();

  let agent = null;

  if (funnelAgent?.agent_id) {
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
    const { data: defaultAgent } = await supabase
      .from("agents")
      .select("*")
      .eq("user_id", ownerId)
      .eq("is_active", true)
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();

    agent = defaultAgent || (await supabase.from("agents").select("*").eq("user_id", ownerId).eq("is_active", true).limit(1).maybeSingle()).data;
  }

  if (!agent) {
    console.log("❌ No active agents found");
    return new Response(JSON.stringify({ status: "no_agents" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: firstStep } = await supabase
    .from("agent_script_steps")
    .select("*")
    .eq("agent_id", agent.id)
    .order("step_order", { ascending: true })
    .limit(1)
    .maybeSingle();

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

  // Create contact if needed
  const { data: existingContact } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", agent.user_id)
    .eq("phone", clientPhone)
    .maybeSingle();

  if (!existingContact) {
    await supabase.from("contacts").insert({
      user_id: agent.user_id,
      name: clientName,
      phone: clientPhone,
      source: "WhatsApp",
      tags: ["Lead"],
    });
  }

  // Send notification
  await sendStatusNotification(supabase, EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, agent.user_id, clientName, clientPhone, "Novo Contato");

  // Send welcome + first step (avoid duplicates)
  const { data: rules } = await supabase.from("agent_rules").select("*").eq("agent_id", agent.id).maybeSingle();

  if (firstStep) {
    const stepMsg = firstStep.message_to_send.replace(/\{nome\}/gi, clientName);
    const stepMsgId = await sendWhatsAppMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, clientPhone, stepMsg);
    await supabase.from("conversation_history").insert({
      case_id: newCase.id,
      role: "assistant",
      content: stepMsg,
      external_message_id: stepMsgId,
      message_status: "sent",
    });
  } else if (rules?.welcome_message) {
    const welcomeMsgId = await sendWhatsAppMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, clientPhone, rules.welcome_message);
    await supabase.from("conversation_history").insert({
      case_id: newCase.id,
      role: "assistant",
      content: rules.welcome_message,
      external_message_id: welcomeMsgId,
      message_status: "sent",
    });
  }

  // Save incoming message
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

// Switch an existing case to a different agent (category-based)
export async function switchToAgent(
  supabase: any, existingCase: any, newAgentId: string,
  clientName: string, clientPhone: string,
  instanceName: string, EVOLUTION_API_URL: string, EVOLUTION_API_KEY: string
): Promise<Response | null> {
  const switchUpdate: Record<string, any> = {
    active_agent_id: newAgentId,
    is_agent_paused: false,
    current_step_id: null,
  };

  const { data: newFirstStep } = await supabase
    .from("agent_script_steps")
    .select("id")
    .eq("agent_id", newAgentId)
    .order("step_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (newFirstStep) switchUpdate.current_step_id = newFirstStep.id;

  const nextStage = getNextFunnelStage(existingCase.status);
  if (nextStage) switchUpdate.status = nextStage;

  await supabase.from("cases").update(switchUpdate).eq("id", existingCase.id);

  const [newAgentRulesRes, newAgentFirstStepRes] = await Promise.all([
    supabase.from("agent_rules").select("welcome_message").eq("agent_id", newAgentId).maybeSingle(),
    supabase.from("agent_script_steps").select("message_to_send").eq("agent_id", newAgentId).order("step_order", { ascending: true }).limit(1).maybeSingle(),
  ]);

  const greeting = newAgentFirstStepRes.data?.message_to_send || newAgentRulesRes.data?.welcome_message;
  if (greeting) {
    const greetingText = greeting.replace(/\{nome\}/gi, existingCase.client_name || clientName);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    fireDelayedGreeting(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      delay_seconds: 60,
      case_id: existingCase.id,
      greeting_message: greetingText,
      client_phone: clientPhone,
      instance_name: instanceName,
      evolution_api_url: EVOLUTION_API_URL,
      evolution_api_key: EVOLUTION_API_KEY,
    });
    console.log(`⏰ Delayed greeting scheduled (60s) for category switch agent`);
  }

  return new Response(JSON.stringify({ status: "agent_switched_by_category" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function switchToAgentWithHandoff(
  supabase: any,
  existingCase: any,
  newAgentId: string,
  userId: string,
  agentId: string,
  clientName: string,
  clientPhone: string,
  instanceName: string,
  EVOLUTION_API_URL: string,
  EVOLUTION_API_KEY: string,
  OPENAI_API_KEY: string | null,
  LOVABLE_API_KEY: string | null,
  history: any[],
  reason: string
): Promise<Response | null> {
  try {
    const { data: newAgent } = await supabase
      .from("agents")
      .select("id, name, category")
      .eq("id", newAgentId)
      .maybeSingle();

    const newAgentName = newAgent?.name || "o especialista";

    // Build artifact
    let artifact: Record<string, any> | null = null;
    try {
      const conversationSnippet = history
        .slice(-30)
        .map((m: any) => `${m.role === "client" ? "Cliente" : "Assistente"}: ${String(m.content || "")}`)
        .join("\n");

      const data = await callAIChatCompletions(OPENAI_API_KEY, LOVABLE_API_KEY, {
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 350,
        messages: [
          {
            role: "system",
            content:
              "Retorne APENAS um JSON válido para handoff entre agentes. Formato: {summary: string, facts: string[], collected_fields: object, open_questions: string[], next_best_action: string, risk_flags: string[], confidence: 'low'|'medium'|'high'}.",
          },
          {
            role: "user",
            content: `Cliente: ${existingCase.client_name || clientName}\nAgente destino: ${newAgentName}\nMotivo: ${reason}\n\nConversa:\n${conversationSnippet}`,
          },
        ],
      });

      const raw = data.choices?.[0]?.message?.content?.trim();
      if (raw) {
        const jsonText = raw.includes("```")
          ? (raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() || raw)
          : raw;
        artifact = JSON.parse(jsonText);
      }
    } catch (e) {
      console.error("❌ Category handoff artifact generation error:", e);
    }

    await supabase.from("case_handoffs").insert({
      case_id: existingCase.id,
      user_id: userId,
      from_agent_id: agentId,
      to_agent_id: newAgentId,
      reason,
      artifact: artifact || {},
    });

    const handoffText = `Perfeito, ${existingCase.client_name || clientName}. Vou te encaminhar agora para ${newAgentName} para dar continuidade, tudo bem?`;
    const handoffMsgId = await sendWhatsAppMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, clientPhone, handoffText);
    await supabase.from("conversation_history").insert({
      case_id: existingCase.id,
      role: "assistant",
      content: handoffText,
      external_message_id: handoffMsgId,
      message_status: "sent",
    });

    // Switch agent
    const switchUpdate: Record<string, any> = {
      active_agent_id: newAgentId,
      is_agent_paused: false,
      current_step_id: null,
    };

    const { data: newFirstStep } = await supabase
      .from("agent_script_steps")
      .select("id")
      .eq("agent_id", newAgentId)
      .order("step_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (newFirstStep) switchUpdate.current_step_id = newFirstStep.id;

    const nextStage = getNextFunnelStage(existingCase.status);
    if (nextStage) switchUpdate.status = nextStage;

    await supabase.from("cases").update(switchUpdate).eq("id", existingCase.id);

    const [newAgentRulesRes, newAgentFirstStepRes] = await Promise.all([
      supabase.from("agent_rules").select("welcome_message").eq("agent_id", newAgentId).maybeSingle(),
      supabase.from("agent_script_steps").select("message_to_send").eq("agent_id", newAgentId).order("step_order", { ascending: true }).limit(1).maybeSingle(),
    ]);

    const greeting = newAgentFirstStepRes.data?.message_to_send || newAgentRulesRes.data?.welcome_message;
    if (greeting) {
      const greetingText = greeting.replace(/\{nome\}/gi, existingCase.client_name || clientName);
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      fireDelayedGreeting(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        delay_seconds: 60,
        case_id: existingCase.id,
        greeting_message: greetingText,
        client_phone: clientPhone,
        instance_name: instanceName,
        evolution_api_url: EVOLUTION_API_URL,
        evolution_api_key: EVOLUTION_API_KEY,
      });
    }

    return new Response(JSON.stringify({ status: "agent_switched_with_handoff" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("❌ switchToAgentWithHandoff error:", e);
    return null;
  }
}
