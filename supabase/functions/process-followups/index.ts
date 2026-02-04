import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FollowupSettings {
  id: string;
  user_id: string;
  is_enabled: boolean;
  inactivity_hours: number;
  max_followups: number;
  followup_message_1: string;
  followup_message_2: string;
  followup_message_3: string;
  respect_business_hours: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔄 Starting follow-up processing...");

    // Get all users with follow-up enabled
    const { data: followupSettings, error: settingsError } = await supabase
      .from("followup_settings")
      .select("*")
      .eq("is_enabled", true);

    if (settingsError) {
      console.error("Error fetching followup settings:", settingsError);
      throw settingsError;
    }

    if (!followupSettings || followupSettings.length === 0) {
      console.log("No users with follow-up enabled");
      return new Response(
        JSON.stringify({ message: "No follow-ups to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${followupSettings.length} users with follow-up enabled`);

    let totalProcessed = 0;

    for (const settings of followupSettings as FollowupSettings[]) {
      console.log(`Processing user: ${settings.user_id}`);

      // Check business hours if enabled
      if (settings.respect_business_hours) {
        const { data: scheduleSettings } = await supabase
          .from("schedule_settings")
          .select("work_start_hour, work_end_hour, work_days")
          .eq("user_id", settings.user_id)
          .maybeSingle();

        if (scheduleSettings) {
          const now = new Date();
          const spTime = new Date(
            now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
          );
          const currentHour = spTime.getHours();
          const currentDay = spTime.getDay();

          // Check if within work hours
          if (
            currentHour < scheduleSettings.work_start_hour ||
            currentHour >= scheduleSettings.work_end_hour
          ) {
            console.log(`Outside work hours for user ${settings.user_id}, skipping`);
            continue;
          }

          // Check if work day
          if (!scheduleSettings.work_days.includes(currentDay)) {
            console.log(`Not a work day for user ${settings.user_id}, skipping`);
            continue;
          }
        }
      }

      // Get Evolution API settings for this user
      const { data: evolutionSettings } = await supabase
        .from("evolution_api_settings")
        .select("api_url, api_key, instance_name, is_connected")
        .eq("user_id", settings.user_id)
        .maybeSingle();

      if (!evolutionSettings || !evolutionSettings.is_connected) {
        console.log(`User ${settings.user_id} has no connected WhatsApp, skipping`);
        continue;
      }

      // Calculate inactivity threshold
      const inactivityThreshold = new Date();
      inactivityThreshold.setHours(
        inactivityThreshold.getHours() - settings.inactivity_hours
      );

      // Get cases that need follow-up
      // Criteria: 
      // 1. Last message was from assistant/user (not client)
      // 2. Last message is older than inactivity_hours
      // 3. Case is not closed/won/lost
      // 4. Follow-up count < max_followups
      const { data: cases, error: casesError } = await supabase
        .from("cases")
        .select(`
          id,
          client_phone,
          client_name,
          status,
          updated_at
        `)
        .eq("user_id", settings.user_id)
        .not("status", "in", '("Contrato Fechado","Perdido")')
        .lt("updated_at", inactivityThreshold.toISOString());

      if (casesError) {
        console.error(`Error fetching cases for user ${settings.user_id}:`, casesError);
        continue;
      }

      if (!cases || cases.length === 0) {
        console.log(`No inactive cases for user ${settings.user_id}`);
        continue;
      }

      console.log(`Found ${cases.length} potentially inactive cases`);

      for (const caseItem of cases) {
        try {
          // Check last message role
          const { data: lastMessage } = await supabase
            .from("conversation_history")
            .select("role, created_at")
            .eq("case_id", caseItem.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!lastMessage) continue;

          // Only follow up if last message was from assistant/user (not client)
          if (lastMessage.role === "user") {
            console.log(`Last message from client for case ${caseItem.id}, skipping`);
            continue;
          }

          // Check if last message is old enough
          const lastMessageTime = new Date(lastMessage.created_at);
          if (lastMessageTime > inactivityThreshold) {
            continue;
          }

          // Get or create case_followup record
          let { data: caseFollowup } = await supabase
            .from("case_followups")
            .select("*")
            .eq("case_id", caseItem.id)
            .maybeSingle();

          if (!caseFollowup) {
            const { data: newFollowup, error: insertError } = await supabase
              .from("case_followups")
              .insert({
                case_id: caseItem.id,
                user_id: settings.user_id,
                followup_count: 0,
                is_paused: false
              })
              .select()
              .single();

            if (insertError) {
              console.error(`Error creating followup record:`, insertError);
              continue;
            }
            caseFollowup = newFollowup;
          }

          // Skip if paused or max reached
          if (caseFollowup.is_paused) {
            console.log(`Followups paused for case ${caseItem.id}`);
            continue;
          }

          if (caseFollowup.followup_count >= settings.max_followups) {
            console.log(`Max followups reached for case ${caseItem.id}`);
            continue;
          }

          // Check if enough time passed since last followup
          if (caseFollowup.last_followup_at) {
            const lastFollowup = new Date(caseFollowup.last_followup_at);
            const nextAllowed = new Date(lastFollowup);
            nextAllowed.setHours(nextAllowed.getHours() + settings.inactivity_hours);
            
            if (new Date() < nextAllowed) {
              console.log(`Too early for next followup for case ${caseItem.id}`);
              continue;
            }
          }

          // Get the appropriate message
          const followupNumber = caseFollowup.followup_count + 1;
          let message: string;
          
          switch (followupNumber) {
            case 1:
              message = settings.followup_message_1;
              break;
            case 2:
              message = settings.followup_message_2;
              break;
            case 3:
              message = settings.followup_message_3;
              break;
            default:
              continue;
          }

          if (!message) {
            console.log(`No message configured for followup ${followupNumber}`);
            continue;
          }

          // Replace variables
          message = message.replace(/{nome}/gi, caseItem.client_name || "");

          // Send via Evolution API
          const phone = caseItem.client_phone.replace(/\D/g, "");
          const sendUrl = `${evolutionSettings.api_url}/message/sendText/${evolutionSettings.instance_name}`;

          const response = await fetch(sendUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evolutionSettings.api_key,
            },
            body: JSON.stringify({
              number: phone,
              text: message,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error sending followup to ${phone}:`, errorText);
            continue;
          }

          console.log(`✅ Sent followup ${followupNumber} to ${phone}`);

          // Update case_followups
          const nextFollowupAt = new Date();
          nextFollowupAt.setHours(nextFollowupAt.getHours() + settings.inactivity_hours);

          await supabase
            .from("case_followups")
            .update({
              followup_count: followupNumber,
              last_followup_at: new Date().toISOString(),
              next_followup_at: nextFollowupAt.toISOString()
            })
            .eq("id", caseFollowup.id);

          // Save message to conversation history
          await supabase.from("conversation_history").insert({
            case_id: caseItem.id,
            role: "assistant",
            content: `[Follow-up ${followupNumber}] ${message}`,
          });

          // Update case updated_at
          await supabase
            .from("cases")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", caseItem.id);

          totalProcessed++;
        } catch (caseError) {
          console.error(`Error processing case ${caseItem.id}:`, caseError);
        }
      }
    }

    console.log(`✅ Follow-up processing complete. Sent ${totalProcessed} messages.`);

    return new Response(
      JSON.stringify({
        message: "Follow-ups processed successfully",
        processed: totalProcessed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in process-followups:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
