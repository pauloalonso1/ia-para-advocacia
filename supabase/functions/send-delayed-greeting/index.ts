import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      delay_seconds = 60,
      case_id,
      greeting_message,
      client_phone,
      instance_name,
      evolution_api_url,
      evolution_api_key,
    } = await req.json();

    if (!case_id || !greeting_message || !client_phone || !instance_name || !evolution_api_url || !evolution_api_key) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`⏰ Delayed greeting scheduled: ${delay_seconds}s for ${client_phone}`);

    // Wait the specified delay
    await new Promise((resolve) => setTimeout(resolve, delay_seconds * 1000));

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the case still has the same agent (user might have switched manually)
    const { data: currentCase } = await supabase
      .from("cases")
      .select("id, is_agent_paused, active_agent_id")
      .eq("id", case_id)
      .maybeSingle();

    if (!currentCase) {
      console.log(`❌ Case ${case_id} not found, skipping delayed greeting`);
      return new Response(JSON.stringify({ status: "case_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (currentCase.is_agent_paused) {
      console.log(`⏸️ Agent paused for case ${case_id}, skipping delayed greeting`);
      return new Response(JSON.stringify({ status: "agent_paused" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send the greeting via Evolution API
    const url = `${evolution_api_url}/message/sendText/${instance_name}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evolution_api_key,
      },
      body: JSON.stringify({
        number: client_phone,
        text: greeting_message,
      }),
    });

    let messageId: string | null = null;
    if (response.ok) {
      const data = await response.json();
      messageId = data?.key?.id || null;
      console.log(`✅ Delayed greeting sent to ${client_phone}, id: ${messageId}`);
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed to send delayed greeting: ${response.status} ${errorText}`);
      return new Response(JSON.stringify({ status: "send_failed", error: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to conversation history
    await supabase.from("conversation_history").insert({
      case_id,
      role: "assistant",
      content: greeting_message,
      external_message_id: messageId,
      message_status: "sent",
    });

    // Update case last_message
    await supabase.from("cases").update({
      last_message: greeting_message,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", case_id);

    return new Response(JSON.stringify({ status: "greeting_sent", messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Delayed greeting error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
