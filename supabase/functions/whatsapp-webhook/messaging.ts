// WhatsApp messaging and notification helpers

import { STATUS_NOTIFICATION_MAP } from "./types.ts";

const FETCH_TIMEOUT_MS = 30_000;

export async function sendWhatsAppMessage(
  apiUrl: string,
  apiKey: string,
  instanceName: string,
  phone: string,
  text: string
): Promise<string | null> {
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
  console.log(`✅ Message sent to ${phone}, id: ${messageId}`);
  return messageId;
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
