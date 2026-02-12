// Status change handling and delayed greeting logic

import { sendStatusNotification, sendWhatsAppMessage } from "./messaging.ts";
import { generateCaseDescription } from "./funnel-engine.ts";
import { callAIChatCompletions } from "./ai-client.ts";

// Handle CRM status transitions and funnel agent reassignment
export async function handleStatusChange(
  supabase: any, existingCase: any, newStatus: string,
  userId: string, agentId: string,
  clientName: string, clientPhone: string,
  instanceName: string, EVOLUTION_API_URL: string, EVOLUTION_API_KEY: string,
  OPENAI_API_KEY: string | null, LOVABLE_API_KEY: string | null,
  history: any[]
) {
  const statusUpdate: Record<string, any> = { status: newStatus };

  const { data: funnelAssignment } = await supabase
    .from("funnel_agent_assignments")
    .select("agent_id")
    .eq("user_id", userId)
    .eq("stage_name", newStatus)
    .maybeSingle();

  if (funnelAssignment?.agent_id) {
    // Explicit handoff: persist artifact + notify client before switching agent
    try {
      const { data: toAgent } = await supabase
        .from("agents")
        .select("id, name")
        .eq("id", funnelAssignment.agent_id)
        .maybeSingle();

      const toAgentName = toAgent?.name || "o próximo atendente";

      const artifact = await buildHandoffArtifact(
        OPENAI_API_KEY,
        LOVABLE_API_KEY,
        history,
        existingCase.client_name || clientName,
        newStatus,
        toAgentName
      );

      await supabase.from("case_handoffs").insert({
        case_id: existingCase.id,
        user_id: userId,
        from_agent_id: agentId,
        to_agent_id: funnelAssignment.agent_id,
        reason: `funnel_status_change:${newStatus}`,
        artifact: artifact || {},
      });

      try {
        await supabase.from("workflow_events").insert({
          user_id: userId,
          case_id: existingCase.id,
          event_type: "agent_handoff",
          from_status: existingCase.status,
          to_status: newStatus,
          from_agent_id: agentId,
          to_agent_id: funnelAssignment.agent_id,
          metadata: { reason: `funnel_status_change:${newStatus}` },
        });
      } catch {}

      const handoffText = `Perfeito, ${existingCase.client_name || clientName}. Vou te encaminhar agora para ${toAgentName} para dar continuidade, tudo bem?`;
      const handoffMsgId = await sendWhatsAppMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, clientPhone, handoffText);
      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "assistant",
        content: handoffText,
        external_message_id: handoffMsgId,
        message_status: "sent",
      });
    } catch (e) {
      console.error("❌ Handoff error (artifact/message):", e);
    }

    statusUpdate.active_agent_id = funnelAssignment.agent_id;
    statusUpdate.is_agent_paused = false;
    statusUpdate.current_step_id = null;

    const { data: newFirstStep } = await supabase
      .from("agent_script_steps")
      .select("id")
      .eq("agent_id", funnelAssignment.agent_id)
      .order("step_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (newFirstStep) statusUpdate.current_step_id = newFirstStep.id;
    console.log(`🔄 Funnel auto-switch: agent changed to ${funnelAssignment.agent_id} for "${newStatus}"`);
  }

  await supabase.from("cases").update(statusUpdate).eq("id", existingCase.id);
  console.log(`📊 Status changed: ${existingCase.status} -> ${newStatus}`);

  try {
    await supabase.from("workflow_events").insert({
      user_id: userId,
      case_id: existingCase.id,
      event_type: "status_change",
      from_status: existingCase.status,
      to_status: newStatus,
      from_agent_id: agentId,
      to_agent_id: statusUpdate.active_agent_id || agentId,
      metadata: {},
    });
  } catch {}

  if (newStatus === "Qualificado" || newStatus === "Convertido") {
    generateCaseDescription(supabase, OPENAI_API_KEY, LOVABLE_API_KEY, existingCase.id, clientName, history).catch((e: any) => console.error("Case description error:", e));
  }

  await sendStatusNotification(supabase, EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, userId, clientName, clientPhone, newStatus);
}

async function buildHandoffArtifact(
  OPENAI_API_KEY: string | null,
  LOVABLE_API_KEY: string | null,
  history: any[],
  clientName: string,
  newStatus: string,
  toAgentName: string
): Promise<Record<string, any> | null> {
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
          content: `Cliente: ${clientName}\nNovo status: ${newStatus}\nAgente destino: ${toAgentName}\n\nConversa:\n${conversationSnippet}`,
        },
      ],
    });

    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    const jsonText = raw.includes("```")
      ? (raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() || raw)
      : raw;

    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (e) {
    console.error("❌ buildHandoffArtifact error:", e);
    return null;
  }
}

// Fire-and-forget: schedule a delayed greeting via the send-delayed-greeting edge function
export function fireDelayedGreeting(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: {
    delay_seconds: number;
    case_id: string;
    greeting_message: string;
    client_phone: string;
    instance_name: string;
    evolution_api_url: string;
    evolution_api_key: string;
  }
) {
  fetch(`${supabaseUrl}/functions/v1/send-delayed-greeting`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch((e) => console.error("❌ Failed to schedule delayed greeting:", e));
}
