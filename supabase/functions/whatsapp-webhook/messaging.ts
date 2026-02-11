// WhatsApp messaging and notification helpers

import { STATUS_NOTIFICATION_MAP } from "./types.ts";
import { withRetry } from "./retry.ts";

const FETCH_TIMEOUT_MS = 30_000;

async function setTypingPresence(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string,
  durationMs: number
): Promise<void> {
  try {
    const url = `${apiUrl}/chat/presence/${instanceName}`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ number: phone, delay: durationMs, presence: "composing" }),
    });
  } catch (e) {
    console.warn("⚠️ Typing presence failed (non-critical):", (e as Error).message);
  }
}

function calculateTypingDelay(text: string): number {
  const words = text.split(/\s+/).length;
  // ~40 words per minute typing speed → ~1.5s per word, capped between 1.5s and 8s
  const delay = Math.min(Math.max(words * 150, 1500), 8000);
  return delay;
}

export async function sendWhatsAppMessage(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string,
  text: string
): Promise<string | null> {
  return withRetry(async () => {
    // Simulate realistic typing delay
    const typingDelay = calculateTypingDelay(text);
    await setTypingPresence(apiUrl, apiKey, instanceName, phone, typingDelay);
    await new Promise((r) => setTimeout(r, typingDelay));

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

    const data = await response.json();
    const messageId = data?.key?.id || null;
    console.log(`✅ Message sent to ${phone} (typed ${typingDelay}ms), id: ${messageId}`);
    return messageId;
  }, `sendWhatsApp:${phone}`);
}

export async function sendStatusNotification(
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

    if (!settings || !settings.is_enabled) return;

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

export async function updateContactEmail(
  supabase: any,
  userId: string,
  clientPhone: string,
  email: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("contacts")
      .update({ email })
      .eq("user_id", userId)
      .eq("phone", clientPhone);

    if (error) {
      console.error("❌ Error updating contact email:", error);
    } else {
      console.log(`📧 Contact email updated: ${email} for phone ${clientPhone}`);
    }
  } catch (e) {
    console.error("Error updating contact email:", e);
  }
}
