// Status change handling and delayed greeting logic

import { sendStatusNotification } from "./messaging.ts";
import { generateCaseDescription } from "./funnel-engine.ts";

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

  if (newStatus === "Qualificado" || newStatus === "Convertido") {
    generateCaseDescription(supabase, OPENAI_API_KEY, LOVABLE_API_KEY, existingCase.id, clientName, history).catch((e: any) => console.error("Case description error:", e));
  }

  await sendStatusNotification(supabase, EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, userId, clientName, clientPhone, newStatus);
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
