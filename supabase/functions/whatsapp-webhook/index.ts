// WhatsApp Webhook - Main Handler (Orchestrator)
// Modularized architecture: types, ai-client, media-processor, messaging,
// rag-engine, funnel-engine, calendar-handler, ai-processor

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, getNextFunnelStage } from "./types.ts";
import { downloadMediaFromEvolution, processMediaWithAI } from "./media-processor.ts";
import { sendWhatsAppMessage, sendStatusNotification, updateContactEmail } from "./messaging.ts";
import { detectAndMatchCategoryAgent, generateCaseDescription, checkFAQ } from "./funnel-engine.ts";
import { saveContactMemory } from "./rag-engine.ts";
import { processWithAI } from "./ai-processor.ts";

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

    // ===== Handle MESSAGES_UPDATE event (delivery/read status) =====
    if (payload.event === "messages.update" || payload.event === "MESSAGES_UPDATE") {
      console.log("📨 Message status update received");
      const updates = Array.isArray(payload.data) ? payload.data : [payload.data];

      for (const update of updates) {
        const messageId = update?.key?.id;
        const status = update?.status || update?.update?.status;
        if (!messageId || status === undefined) continue;

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

    // ===== Handle PRESENCE_UPDATE event (typing indicator) =====
    if (payload.event === "presence.update" || payload.event === "PRESENCE_UPDATE") {
      console.log("👤 Presence update received");
      const remoteJid = payload.data?.id || payload.data?.remoteJid;
      const presences = payload.data?.presences || payload.data?.participants;

      if (remoteJid) {
        const phone = remoteJid.replace("@s.whatsapp.net", "");
        const isTyping = presences
          ? Object.values(presences).some((p: any) => p?.lastKnownPresence === "composing")
          : false;

        await supabase.channel("typing-indicators").send({
          type: "broadcast",
          event: "typing",
          payload: { phone, isTyping },
        });
      }

      return new Response(JSON.stringify({ status: "presence_handled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Extract message content (MESSAGES_UPSERT flow) =====
    const textBody =
      payload.data?.message?.conversation ||
      payload.data?.message?.extendedTextMessage?.text;

    const audioMsg = payload.data?.message?.audioMessage;
    const imageMsg = payload.data?.message?.imageMessage;
    const docMsg =
      payload.data?.message?.documentMessage ||
      payload.data?.message?.documentWithCaptionMessage?.message?.documentMessage;
    const hasMedia = !!(audioMsg || imageMsg || docMsg);

    if ((!textBody && !hasMedia) || payload.data?.key?.fromMe) {
      return new Response(JSON.stringify({ status: "ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientPhone = payload.data.key.remoteJid.replace("@s.whatsapp.net", "");
    const clientName = payload.data.pushName || "Cliente";
    const instanceName = payload.instance;
    const incomingMessageId = payload.data.key.id || null;

    // ===== Process media if present =====
    let messageBody = textBody || "";
    let incomingMediaUrl: string | null = null;
    let incomingMediaType: string | null = null;

    if (hasMedia && !textBody) {
      console.log(`📎 Media message detected: audio=${!!audioMsg}, image=${!!imageMsg}, doc=${!!docMsg}`);

      try {
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

            incomingMediaType = audioMsg ? "audio" : imageMsg ? "image" : "document";

            // Upload media to Supabase Storage
            try {
              const extMap: Record<string, string> = {
                "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
                "audio/ogg; codecs=opus": "ogg", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a",
                "application/pdf": "pdf", "application/msword": "doc",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
              };
              const ext = extMap[mediaMimeType] || mediaMimeType.split("/").pop()?.split(";")[0] || "bin";
              const fileName = docMsg?.fileName || `${incomingMediaType}_${Date.now()}.${ext}`;
              const storagePath = `incoming/${clientPhone}/${Date.now()}_${fileName}`;

              const binaryStr = atob(mediaBase64);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }

              const { error: uploadError } = await supabase.storage
                .from("chat-media")
                .upload(storagePath, bytes, {
                  contentType: mediaMimeType,
                  upsert: false,
                });

              if (uploadError) {
                console.error("❌ Storage upload error:", uploadError);
              } else {
                const { data: urlData } = supabase.storage
                  .from("chat-media")
                  .getPublicUrl(storagePath);
                incomingMediaUrl = urlData.publicUrl;
                console.log(`📦 Media uploaded to storage: ${incomingMediaUrl}`);
              }
            } catch (storageError) {
              console.error("❌ Storage upload failed:", storageError);
            }

            messageBody = await processMediaWithAI(
              OPENAI_API_KEY, LOVABLE_API_KEY, mediaBase64, mediaMimeType,
              incomingMediaType as "audio" | "image" | "document",
              mediaCaption, docMsg?.fileName
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

    // ===== Resolve tenant credentials =====
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

    // ===== Deduplicate =====
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

    // ===== Debounce: acquire processing lock =====
    // Clean expired locks first
    await supabase.rpc("cleanup_expired_locks");

    const { error: lockError } = await supabase
      .from("message_processing_locks")
      .insert({ client_phone: clientPhone, user_id: instanceSettings?.user_id || "" })
      .single();

    if (lockError) {
      // Lock already exists — another message is being processed for this client
      console.log(`⏳ Message debounced for ${clientPhone} — already processing`);
      // Wait briefly and re-queue by saving the message for the ongoing process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Re-check if lock was released
      const { data: stillLocked } = await supabase
        .from("message_processing_locks")
        .select("locked_at")
        .eq("client_phone", clientPhone)
        .maybeSingle();

      if (stillLocked) {
        // Still processing — save message and let the current process handle context
        console.log(`⏭️ Saving message for ${clientPhone} without AI processing (debounced)`);

        // We still need to find/create the case to save the message
        const { data: debouncedCase } = await supabase
          .from("cases")
          .select("id, unread_count")
          .eq("client_phone", clientPhone)
          .eq("user_id", instanceSettings?.user_id || "")
          .maybeSingle();

        if (debouncedCase) {
          await supabase.from("conversation_history").insert({
            case_id: debouncedCase.id,
            role: "client",
            content: messageBody,
            external_message_id: incomingMessageId,
            media_url: incomingMediaUrl,
            media_type: incomingMediaType,
          });
          await supabase.from("cases").update({
            unread_count: (debouncedCase.unread_count || 0) + 1,
            last_message: messageBody,
            last_message_at: new Date().toISOString(),
          }).eq("id", debouncedCase.id);
        }

        return new Response(JSON.stringify({ status: "debounced" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Ensure lock is released at the end (wrapped in try/finally below)
    const releaseLock = async () => {
      await supabase
        .from("message_processing_locks")
        .delete()
        .eq("client_phone", clientPhone);
    };

    try {

    // ===== Find or create case =====
    let { data: existingCase } = await supabase
      .from("cases")
      .select("*, active_agent:agents(*), current_step:agent_script_steps(*)")
      .eq("client_phone", clientPhone)
      .eq("user_id", ownerId)
      .maybeSingle();

    const previousStatus = existingCase?.status;

    if (!existingCase) {
      const result = await handleNewCase(
        supabase, ownerId, clientPhone, clientName, instanceName, messageBody,
        incomingMessageId, incomingMediaUrl, incomingMediaType,
        EVOLUTION_API_URL, EVOLUTION_API_KEY
      );
      await releaseLock();
      return result;
    }

    // ===== Check if agent is active =====
    if (!existingCase.active_agent_id || existingCase.is_agent_paused) {
      const reason = !existingCase.active_agent_id ? "no active agent" : "agent paused";
      console.log(`⏸️ ${reason} for case, manual mode`);

      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "client",
        content: messageBody,
        external_message_id: incomingMessageId,
        media_url: incomingMediaUrl,
        media_type: incomingMediaType,
      });

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

    // ===== Save incoming message =====
    await supabase.from("conversation_history").insert({
      case_id: existingCase.id,
      role: "client",
      content: messageBody,
      external_message_id: incomingMessageId,
      media_url: incomingMediaUrl,
      media_type: incomingMediaType,
    });

    await supabase
      .from("cases")
      .update({
        unread_count: (existingCase.unread_count || 0) + 1,
        last_message: messageBody,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingCase.id);

    // Reset follow-up counter
    await supabase
      .from("case_followups")
      .update({ followup_count: 0, last_followup_at: null, next_followup_at: null, is_paused: false })
      .eq("case_id", existingCase.id);

    // Auto-advance from "Novo Contato" to "Em Atendimento"
    if (existingCase.status === "Novo Contato") {
      await supabase.from("cases").update({ status: "Em Atendimento" }).eq("id", existingCase.id);
      existingCase.status = "Em Atendimento";
    }

    // ===== Get agent config =====
    const agentId = existingCase.active_agent_id;
    const userId = existingCase.user_id;

    const [rulesResult, stepsResult, faqsResult, historyResult] = await Promise.all([
      supabase.from("agent_rules").select("*").eq("agent_id", agentId).maybeSingle(),
      supabase.from("agent_script_steps").select("*").eq("agent_id", agentId).order("step_order", { ascending: true }),
      supabase.from("agent_faqs").select("*").eq("agent_id", agentId),
      supabase.from("conversation_history").select("*").eq("case_id", existingCase.id).order("created_at", { ascending: false }).limit(50),
    ]);

    const rules = rulesResult.data;
    const steps = stepsResult.data || [];
    const faqs = faqsResult.data || [];
    const history = (historyResult.data || []).reverse();

    console.log(`📋 Agent config - Rules: ${!!rules}, Steps: ${steps.length}, FAQs: ${faqs.length}`);

    // ===== FAQ check =====
    if (faqs.length > 0) {
      const faqMatch = await checkFAQ(OPENAI_API_KEY, LOVABLE_API_KEY, messageBody, faqs);
      if (faqMatch) {
        console.log("📖 FAQ matched");
        const faqMsgId = await sendWhatsAppMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, clientPhone, faqMatch);
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

    // ===== Script state =====
    const currentStep = existingCase.current_step;
    const currentStepIndex = steps.findIndex((s: any) => s.id === currentStep?.id);
    const isScriptCompleted = !currentStep && steps.length > 0;
    const nextStep = isScriptCompleted
      ? undefined
      : currentStepIndex >= 0 ? steps[currentStepIndex + 1] : steps[0];

    console.log(`📍 Step: ${currentStepIndex + 1}/${steps.length}, scriptCompleted: ${isScriptCompleted}`);

    // ===== Retroactive category-based agent switch =====
    if (isScriptCompleted) {
      try {
        const categoryAgentId = await detectAndMatchCategoryAgent(
          OPENAI_API_KEY, LOVABLE_API_KEY, supabase, userId, agentId, history, messageBody
        );

        if (categoryAgentId && categoryAgentId !== agentId) {
          console.log(`🔄 Retroactive category switch: ${agentId} -> ${categoryAgentId}`);
          const switchResult = await switchToAgent(
            supabase, existingCase, categoryAgentId, clientName, clientPhone,
            instanceName, EVOLUTION_API_URL, EVOLUTION_API_KEY
          );
          if (switchResult) return switchResult;
        }
      } catch (e) {
        console.error("❌ Retroactive category switch error:", e);
      }
    }

    // ===== Check calendar =====
    const { data: calendarToken } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const hasCalendarConnected = !!calendarToken;

    // ===== Process with AI =====
    const aiResponse = await processWithAI(
      OPENAI_API_KEY, LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
      rules, currentStep, nextStep, messageBody, history, steps,
      existingCase.client_name || clientName, clientPhone,
      hasCalendarConnected, userId, agentId, isScriptCompleted
    );

    console.log(`🤖 AI Response: action=${aiResponse.action}, new_status=${aiResponse.new_status || "none"}`);

    // ===== Handle status change =====
    if (aiResponse.new_status && aiResponse.new_status !== previousStatus) {
      await handleStatusChange(
        supabase, existingCase, aiResponse.new_status, userId, agentId,
        clientName, clientPhone, instanceName, EVOLUTION_API_URL, EVOLUTION_API_KEY,
        OPENAI_API_KEY, LOVABLE_API_KEY, history
      );
    }

    // ===== Handle AI response =====
    if (aiResponse.action === "PROCEED" && nextStep) {
      console.log(`➡️ Proceeding to step ${nextStep.step_order}`);
      await supabase.from("cases").update({ current_step_id: nextStep.id }).eq("id", existingCase.id);

      const nextMessage = nextStep.message_to_send.replace(/\{nome\}/gi, existingCase.client_name || clientName);
      const proceedMsgId = await sendWhatsAppMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, clientPhone, nextMessage);
      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "assistant",
        content: nextMessage,
        external_message_id: proceedMsgId,
        message_status: "sent",
      });
    } else if (aiResponse.action === "PROCEED" && !nextStep && !isScriptCompleted) {
      // Script completed — auto-advance funnel
      console.log(`🏁 Script completed. Marking done and auto-advancing...`);
      await supabase.from("cases").update({ current_step_id: null }).eq("id", existingCase.id);

      const closingMsgId = await sendWhatsAppMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, clientPhone, aiResponse.response_text);
      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "assistant",
        content: aiResponse.response_text,
        external_message_id: closingMsgId,
        message_status: "sent",
      });

      // Category-based agent switch
      let categoryAgentId: string | null = null;
      try {
        categoryAgentId = await detectAndMatchCategoryAgent(
          OPENAI_API_KEY, LOVABLE_API_KEY, supabase, userId, agentId, history, messageBody
        );
      } catch (e) {
        console.error("❌ Category agent detection error:", e);
      }

      const nextFunnelStage = aiResponse.new_status || getNextFunnelStage(existingCase.status);

      if (nextFunnelStage && nextFunnelStage !== existingCase.status) {
        console.log(`📊 Auto-advancing funnel: ${existingCase.status} → ${nextFunnelStage}`);

        let switchAgentId: string | null = categoryAgentId;
        if (!switchAgentId) {
          const { data: nextAssignment } = await supabase
            .from("funnel_agent_assignments")
            .select("agent_id")
            .eq("user_id", userId)
            .eq("stage_name", nextFunnelStage)
            .maybeSingle();
          switchAgentId = nextAssignment?.agent_id || null;
        }

        const statusUpdate: Record<string, any> = {
          status: nextFunnelStage,
          updated_at: new Date().toISOString(),
        };

        if (switchAgentId && switchAgentId !== agentId) {
          statusUpdate.active_agent_id = switchAgentId;
          statusUpdate.is_agent_paused = false;
          statusUpdate.current_step_id = null;

          const { data: newFirstStep } = await supabase
            .from("agent_script_steps")
            .select("id")
            .eq("agent_id", switchAgentId)
            .order("step_order", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (newFirstStep) statusUpdate.current_step_id = newFirstStep.id;

          console.log(`🔄 Auto-switch to ${switchAgentId} for "${nextFunnelStage}"`);

          const [newAgentRules, newAgentFirstStep] = await Promise.all([
            supabase.from("agent_rules").select("welcome_message").eq("agent_id", switchAgentId).maybeSingle(),
            supabase.from("agent_script_steps").select("message_to_send").eq("agent_id", switchAgentId).order("step_order", { ascending: true }).limit(1).maybeSingle(),
          ]);

          const newAgentGreeting = newAgentFirstStep.data?.message_to_send || newAgentRules.data?.welcome_message;
          if (newAgentGreeting) {
            const greetingMsg = newAgentGreeting.replace(/\{nome\}/gi, existingCase.client_name || clientName);
            // Fire-and-forget delayed greeting (60 seconds)
            fireDelayedGreeting(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
              delay_seconds: 60,
              case_id: existingCase.id,
              greeting_message: greetingMsg,
              client_phone: clientPhone,
              instance_name: instanceName,
              evolution_api_url: EVOLUTION_API_URL,
              evolution_api_key: EVOLUTION_API_KEY,
            });
            console.log(`⏰ Delayed greeting scheduled (60s) for new agent`);
          }
        }

        await supabase.from("cases").update(statusUpdate).eq("id", existingCase.id);

        await sendStatusNotification(supabase, EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, userId, existingCase.client_name || clientName, clientPhone, nextFunnelStage);

        if (nextFunnelStage === "Qualificado" || nextFunnelStage === "Convertido") {
          generateCaseDescription(supabase, OPENAI_API_KEY, LOVABLE_API_KEY, existingCase.id, existingCase.client_name || clientName, history).catch((e) => console.error("Case description error:", e));
        }
      }
    } else {
      // STAY — send AI response
      const stayMsgId = await sendWhatsAppMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, clientPhone, aiResponse.response_text);
      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "assistant",
        content: aiResponse.response_text,
        external_message_id: stayMsgId,
        message_status: "sent",
      });
    }

    // ===== Save contact memory periodically =====
    const messageCount = history.length + 2;
    if (messageCount % 5 === 0) {
      const recentContext = history.slice(-6).map((m: any) => `${m.role}: ${m.content}`).join("\n");
      const fullContext = `${recentContext}\nclient: ${messageBody}\nassistant: ${aiResponse.response_text}`;
      saveContactMemory(supabase, OPENAI_API_KEY, LOVABLE_API_KEY, userId, clientPhone, agentId, fullContext).catch((e) => console.error("Memory save error:", e));
    }

    await releaseLock();
    return new Response(JSON.stringify({ status: "processed", action: aiResponse.action }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    } finally {
      // Safety: always release lock
      await releaseLock();
    }
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ===== Helper: Create new case =====
async function handleNewCase(
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
    // If step 1 exists, send ONLY the step message (it already serves as greeting)
    // Skip separate welcome_message to avoid duplicate introductions
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
    // No script steps — send welcome message only
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

// ===== Helper: Switch to a new agent =====
async function switchToAgent(
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
    // Fire-and-forget delayed greeting (60 seconds)
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

// ===== Helper: Handle status change =====
async function handleStatusChange(
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
    generateCaseDescription(supabase, OPENAI_API_KEY, LOVABLE_API_KEY, existingCase.id, clientName, history).catch((e) => console.error("Case description error:", e));
}

// ===== Helper: Fire-and-forget delayed greeting =====
function fireDelayedGreeting(
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
  // Fire and forget — don't await
  fetch(`${supabaseUrl}/functions/v1/send-delayed-greeting`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch((e) => console.error("❌ Failed to schedule delayed greeting:", e));
}

  await sendStatusNotification(supabase, EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, userId, clientName, clientPhone, newStatus);
}
