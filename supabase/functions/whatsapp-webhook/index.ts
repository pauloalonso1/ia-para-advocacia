// WhatsApp Webhook - Main Handler (Orchestrator)
// Modularized architecture: types, ai-client, media-processor, messaging,
// rag-engine, funnel-engine, calendar-handler, ai-processor,
// case-handler, status-handler, script-engine

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, getNextFunnelStage } from "./types.ts";
import { downloadMediaFromEvolution, processMediaWithAI } from "./media-processor.ts";
import { sendWhatsAppMessage, sendStatusNotification, updateContactEmail } from "./messaging.ts";
import { detectAndMatchCategoryAgent, generateCaseDescription, checkFAQ } from "./funnel-engine.ts";
import { saveContactMemory } from "./rag-engine.ts";
import { processWithAI } from "./ai-processor.ts";
import { handleNewCase, switchToAgentWithHandoff } from "./case-handler.ts";
import { handleStatusChange, fireDelayedGreeting } from "./status-handler.ts";
import { autoAdvanceSteps } from "./script-engine.ts";
import { callAIChatCompletions } from "./ai-client.ts";

async function extractAndUpsertCaseFields(
  supabase: any,
  OPENAI_API_KEY: string | null,
  LOVABLE_API_KEY: string | null,
  caseId: string,
  userId: string,
  clientName: string,
  history: any[],
  lastMessage: string
): Promise<void> {
  const snippet = history
    .slice(-25)
    .map((m: any) => `${m.role === "client" ? "Cliente" : "Assistente"}: ${String(m.content || "")}`)
    .join("\n");

  const data = await callAIChatCompletions(OPENAI_API_KEY, LOVABLE_API_KEY, {
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content:
          "Extraia campos estruturados do caso a partir da conversa. Retorne APENAS um JSON válido com chaves: nome_completo (string|null), email (string|null), area_juridica (string|null), urgencia (string|null), objetivo (string|null), fatos_relevantes (string|null), valores_datas_documentos (string|null), quer_agendar (boolean|null), quer_contrato_direto (boolean|null). Use null quando não houver evidência.",
      },
      {
        role: "user",
        content: `Cliente: ${clientName}\n\nConversa:\n${snippet}\n\nÚltima mensagem: ${lastMessage}`,
      },
    ],
  });

  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return;
  const jsonText = raw.includes("```")
    ? (raw.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() || raw)
    : raw;

  let extracted: Record<string, any>;
  try {
    extracted = JSON.parse(jsonText);
  } catch {
    return;
  }

  const { data: existing } = await supabase
    .from("case_fields")
    .select("fields")
    .eq("case_id", caseId)
    .maybeSingle();

  const merged = { ...(existing?.fields || {}), ...(extracted || {}) };

  await supabase.from("case_fields").upsert(
    {
      case_id: caseId,
      user_id: userId,
      fields: merged,
      extracted_at: new Date().toISOString(),
    },
    { onConflict: "case_id" }
  );
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
    await supabase.rpc("cleanup_expired_locks");

    const { error: lockError } = await supabase
      .from("message_processing_locks")
      .insert({ client_phone: clientPhone, user_id: instanceSettings?.user_id || "" })
      .single();

    if (lockError) {
      console.log(`⏳ Message debounced for ${clientPhone} — already processing`);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const { data: stillLocked } = await supabase
        .from("message_processing_locks")
        .select("locked_at")
        .eq("client_phone", clientPhone)
        .maybeSingle();

      if (stillLocked) {
        console.log(`⏭️ Saving message for ${clientPhone} without AI processing (debounced)`);

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

    // ===== Auto-capture email from client message =====
    const emailMatch = messageBody.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (emailMatch) {
      const detectedEmail = emailMatch[0].toLowerCase();
      console.log(`📧 Email detected in message: ${detectedEmail}`);
      // Update contact's email if not already set
      const { data: contact } = await supabase
        .from("contacts")
        .select("id, email")
        .eq("phone", clientPhone)
        .eq("user_id", ownerId)
        .maybeSingle();
      
      if (contact && !contact.email) {
        await supabase
          .from("contacts")
          .update({ email: detectedEmail, updated_at: new Date().toISOString() })
          .eq("id", contact.id);
        console.log(`📧 Email saved to contact: ${detectedEmail}`);
      }
    }

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

    // ===== Script state (with auto-advance past already-collected steps) =====
    let currentStep = existingCase.current_step;
    let currentStepIndex = steps.findIndex((s: any) => s.id === currentStep?.id);

    if (currentStep && steps.length > 0) {
      const advanced = await autoAdvanceSteps(supabase, existingCase.id, currentStep, currentStepIndex, steps, history);
      currentStep = advanced.newStep;
      currentStepIndex = advanced.newIndex;
    }

    const isLastStep = currentStepIndex >= 0 && currentStepIndex === steps.length - 1;
    const noNextStep = currentStepIndex >= 0 && !steps[currentStepIndex + 1];

    // Detect closing messages (obrigado, ok, etc.) when on the last step with no next step
    const closingPattern = /^(obrigad|valeu|brigad|ok|beleza|perfeito|show|massa|top|combinado|até|ateh|tchau|falou|vlw|tmj|👍|🙏|😊|👏|✅)/i;
    const isClosingMessage = isLastStep && noNextStep && closingPattern.test(messageBody.trim());

    let isScriptCompleted = !currentStep && steps.length > 0;

    // If we're on the last step and client sent a closing message, mark as completed
    if (isClosingMessage && !isScriptCompleted) {
      console.log(`🏁 Closing message detected on last step. Marking script as completed.`);
      await supabase.from("cases").update({ current_step_id: null }).eq("id", existingCase.id);
      isScriptCompleted = true;
      currentStep = null;
    }

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
          const switchResult = await switchToAgentWithHandoff(
            supabase,
            existingCase,
            categoryAgentId,
            userId,
            agentId,
            clientName,
            clientPhone,
            instanceName,
            EVOLUTION_API_URL,
            EVOLUTION_API_KEY,
            OPENAI_API_KEY,
            LOVABLE_API_KEY,
            history,
            "category_switch:retroactive"
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
    // ===== Extract structured case fields (best-effort) =====
    try {
      await extractAndUpsertCaseFields(
        supabase,
        OPENAI_API_KEY,
        LOVABLE_API_KEY,
        existingCase.id,
        userId,
        existingCase.client_name || clientName,
        history,
        messageBody
      );
    } catch (e) {
      console.error("❌ Case fields extraction error:", e);
    }

    const aiResponse = await processWithAI(
      OPENAI_API_KEY, LOVABLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
      rules, currentStep, nextStep, messageBody, history, steps,
      existingCase.client_name || clientName, clientPhone,
      hasCalendarConnected, userId, agentId, existingCase.id, isScriptCompleted
    );

    console.log(`🤖 AI Response: action=${aiResponse.action}, new_status=${aiResponse.new_status || "none"}, next_intent=${aiResponse.next_intent || "none"}`);

    // ===== Deterministic intent-based status (when model doesn't set new_status) =====
    let intentBasedStatus: string | undefined;
    if (!aiResponse.new_status) {
      if (aiResponse.next_intent === "DIRECT_CONTRACT") intentBasedStatus = "Aguardando Assinatura";
      if (aiResponse.next_intent === "SCHEDULE_CONSULT") intentBasedStatus = "Agendamento";
    }

    const desiredStatus = aiResponse.new_status || intentBasedStatus;

    // Log decision
    try {
      await supabase.from("workflow_events").insert({
        user_id: userId,
        case_id: existingCase.id,
        event_type: "ai_decision",
        from_status: previousStatus,
        to_status: desiredStatus || null,
        from_agent_id: agentId,
        to_agent_id: agentId,
        metadata: {
          action: aiResponse.action,
          next_intent: aiResponse.next_intent,
          new_status: aiResponse.new_status,
          is_script_completed: isScriptCompleted,
        },
      });
    } catch {}

    // ===== Handle status change =====
    if (desiredStatus && desiredStatus !== previousStatus) {
      await handleStatusChange(
        supabase, existingCase, desiredStatus, userId, agentId,
        clientName, clientPhone, instanceName, EVOLUTION_API_URL, EVOLUTION_API_KEY,
        OPENAI_API_KEY, LOVABLE_API_KEY, history
      );
    }

    // ===== Handle AI response =====
    const isNextStepLast = nextStep && steps.indexOf(nextStep) === steps.length - 1;
    const skipToCompletion = aiResponse.action === "PROCEED" && nextStep && aiResponse.finalization_forced && isNextStepLast;

    if (skipToCompletion) {
      console.log(`🏁 Finalization forced at second-to-last step. Skipping step ${nextStep.step_order} → completing script.`);
      await supabase.from("cases").update({ current_step_id: null }).eq("id", existingCase.id);

      const closingMsgId = await sendWhatsAppMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, clientPhone, aiResponse.response_text);
      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "assistant",
        content: aiResponse.response_text,
        external_message_id: closingMsgId,
        message_status: "sent",
      });
    }

    if (aiResponse.action === "PROCEED" && nextStep && !skipToCompletion) {
      console.log(`➡️ Proceeding to step ${nextStep.step_order}`);
      await supabase.from("cases").update({ current_step_id: nextStep.id }).eq("id", existingCase.id);

      const messageToSend = aiResponse.response_text || nextStep.message_to_send.replace(/\{nome\}/gi, existingCase.client_name || clientName);
      const proceedMsgId = await sendWhatsAppMessage(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, clientPhone, messageToSend);
      await supabase.from("conversation_history").insert({
        case_id: existingCase.id,
        role: "assistant",
        content: messageToSend,
        external_message_id: proceedMsgId,
        message_status: "sent",
      });
    } else if (skipToCompletion || (aiResponse.action === "PROCEED" && !nextStep && !isScriptCompleted)) {
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

      // Determine target funnel stage
      let targetFunnelStage: string | null = null;
      let switchAgentId: string | null = null;

      if (categoryAgentId) {
        const { data: categoryAssignment } = await supabase
          .from("funnel_agent_assignments")
          .select("stage_name")
          .eq("user_id", userId)
          .eq("agent_id", categoryAgentId)
          .maybeSingle();

        if (categoryAssignment) {
          targetFunnelStage = categoryAssignment.stage_name;
          switchAgentId = categoryAgentId;
          console.log(`🏷️ Category agent "${categoryAgentId}" is assigned to stage "${targetFunnelStage}"`);
        } else {
          targetFunnelStage = aiResponse.new_status || getNextFunnelStage(existingCase.status);
          switchAgentId = categoryAgentId;
        }
      } else {
        // No category agent found — check if current agent is a specialist (non-"Outro" category)
        // If so, the lead is now qualified → move to "Qualificado" to hand off to scheduling agent
        const { data: currentAgentData } = await supabase
          .from("agents")
          .select("category")
          .eq("id", agentId)
          .maybeSingle();

        const isSpecialist = currentAgentData?.category && currentAgentData.category !== "Outro";

        if (isSpecialist) {
          // Specialist completed → target "Qualificado" (where scheduling agent is typically assigned)
          targetFunnelStage = aiResponse.new_status || "Qualificado";
          console.log(`🎯 Specialist agent completed. Targeting "${targetFunnelStage}" for scheduling handoff.`);
        } else {
          targetFunnelStage = aiResponse.new_status || getNextFunnelStage(existingCase.status);
        }

        if (targetFunnelStage) {
          const { data: nextAssignment } = await supabase
            .from("funnel_agent_assignments")
            .select("agent_id")
            .eq("user_id", userId)
            .eq("stage_name", targetFunnelStage)
            .maybeSingle();
          switchAgentId = nextAssignment?.agent_id || null;
        }
      }

      if (targetFunnelStage) {
        const stageChanged = targetFunnelStage !== existingCase.status;
        const agentChanged = switchAgentId && switchAgentId !== agentId;

        if (stageChanged || agentChanged) {
          console.log(`📊 Funnel update: "${existingCase.status}" → "${targetFunnelStage}", agent switch: ${agentChanged}`);

          const statusUpdate: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };

          if (stageChanged) {
            statusUpdate.status = targetFunnelStage;
          }

          if (agentChanged) {
            // Explicit handoff + artifact for automatic funnel agent switch
            try {
              const { data: toAgent } = await supabase
                .from("agents")
                .select("id, name")
                .eq("id", switchAgentId)
                .maybeSingle();

              const toAgentName = toAgent?.name || "o próximo atendente";

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
                      content: `Cliente: ${existingCase.client_name || clientName}\nStatus alvo: ${targetFunnelStage}\nAgente destino: ${toAgentName}\n\nConversa:\n${conversationSnippet}`,
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
                console.error("❌ Funnel handoff artifact generation error:", e);
              }

              await supabase.from("case_handoffs").insert({
                case_id: existingCase.id,
                user_id: userId,
                from_agent_id: agentId,
                to_agent_id: switchAgentId,
                reason: `funnel_auto_switch:${targetFunnelStage}`,
                artifact: artifact || {},
              });

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
              console.error("❌ Funnel handoff error (artifact/message):", e);
            }

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

            console.log(`🔄 Auto-switch to ${switchAgentId} for "${targetFunnelStage}"`);

            const [newAgentRules, newAgentFirstStep] = await Promise.all([
              supabase.from("agent_rules").select("welcome_message").eq("agent_id", switchAgentId).maybeSingle(),
              supabase.from("agent_script_steps").select("message_to_send").eq("agent_id", switchAgentId).order("step_order", { ascending: true }).limit(1).maybeSingle(),
            ]);

            const newAgentGreeting = newAgentFirstStep.data?.message_to_send || newAgentRules.data?.welcome_message;
            if (newAgentGreeting) {
              const greetingMsg = newAgentGreeting.replace(/\{nome\}/gi, existingCase.client_name || clientName);
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

          if (stageChanged) {
            await sendStatusNotification(supabase, EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName, userId, existingCase.client_name || clientName, clientPhone, targetFunnelStage);
          }

          if (targetFunnelStage === "Qualificado" || targetFunnelStage === "Convertido") {
            generateCaseDescription(supabase, OPENAI_API_KEY, LOVABLE_API_KEY, existingCase.id, existingCase.client_name || clientName, history).catch((e) => console.error("Case description error:", e));
          }
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
