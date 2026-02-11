// Shared AI logging utility
// Logs AI interactions to the ai_logs table for monitoring

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AILogEntry {
  user_id: string;
  event_type?: string; // ai_call, error, rate_limit, timeout, webhook
  source: string; // whatsapp-webhook, legal-documents, generate-summary
  agent_id?: string;
  agent_name?: string;
  model?: string;
  tokens_input?: number;
  tokens_output?: number;
  response_time_ms?: number;
  status?: string; // success, error, rate_limited, timeout
  error_message?: string;
  contact_phone?: string;
  metadata?: Record<string, any>;
}

let _supabase: any = null;

function getServiceClient() {
  if (!_supabase) {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    _supabase = createClient(url, key);
  }
  return _supabase;
}

export async function logAIEvent(entry: AILogEntry): Promise<void> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from("ai_logs").insert({
      user_id: entry.user_id,
      event_type: entry.event_type || "ai_call",
      source: entry.source,
      agent_id: entry.agent_id || null,
      agent_name: entry.agent_name || null,
      model: entry.model || null,
      tokens_input: entry.tokens_input || null,
      tokens_output: entry.tokens_output || null,
      response_time_ms: entry.response_time_ms || null,
      status: entry.status || "success",
      error_message: entry.error_message || null,
      contact_phone: entry.contact_phone || null,
      metadata: entry.metadata || {},
    });
    if (error) console.warn("⚠️ Failed to log AI event:", error.message);
  } catch (e: any) {
    // Never let logging failures break the main flow
    console.warn("⚠️ AI logging error:", e.message);
  }
}

/**
 * Wraps an AI call with automatic timing and logging.
 */
export async function withAILogging<T>(
  entry: Omit<AILogEntry, "response_time_ms" | "status" | "error_message">,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = Date.now() - start;
    await logAIEvent({
      ...entry,
      response_time_ms: elapsed,
      status: "success",
    });
    return result;
  } catch (e: any) {
    const elapsed = Date.now() - start;
    const msg = e.message || "Unknown error";
    const status = msg.includes("429")
      ? "rate_limited"
      : msg.includes("timed out")
      ? "timeout"
      : "error";
    await logAIEvent({
      ...entry,
      response_time_ms: elapsed,
      status,
      error_message: msg.slice(0, 500),
      event_type: status === "rate_limited" ? "rate_limit" : status === "timeout" ? "timeout" : "error",
    });
    throw e;
  }
}
