// Shared types and constants for the WhatsApp webhook

export interface WebhookPayload {
  instance: string;
  event?: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
      audioMessage?: {
        mimetype?: string;
        seconds?: number;
      };
      imageMessage?: {
        mimetype?: string;
        caption?: string;
      };
      documentMessage?: {
        mimetype?: string;
        fileName?: string;
        caption?: string;
      };
      documentWithCaptionMessage?: {
        message?: {
          documentMessage?: {
            mimetype?: string;
            fileName?: string;
            caption?: string;
          };
        };
      };
    };
    messageType?: string;
    pushName?: string;
    status?: number;
    update?: { status?: number };
    id?: string;
    remoteJid?: string;
    presences?: Record<string, any>;
    participants?: Record<string, any>;
  };
}

export interface AIResponse {
  response_text: string;
  action: "PROCEED" | "STAY";
  new_status?: string;
  finalization_forced?: boolean;
}

// CRM Status progression — ordered for auto-advance
export const CRM_STATUSES = [
  "Novo Contato",
  "Em Atendimento",
  "Qualificado",
  "Não Qualificado",
  "Convertido",
  "Arquivado",
];

// Get the next funnel stage based on current status
export function getNextFunnelStage(currentStatus: string | null): string | null {
  const progression: Record<string, string> = {
    "Novo Contato": "Em Atendimento",
    "Em Atendimento": "Qualificado",
    "Qualificado": "Convertido",
  };
  return progression[currentStatus || "Novo Contato"] || null;
}

// Status mapping for notifications
export const STATUS_NOTIFICATION_MAP: Record<string, { key: string; emoji: string; label: string }> = {
  "Novo Contato": { key: "notify_new_lead", emoji: "🆕", label: "Novo Lead" },
  "Em Atendimento": { key: "notify_new_lead", emoji: "💬", label: "Em Atendimento" },
  "Qualificado": { key: "notify_qualified_lead", emoji: "⭐", label: "Lead Qualificado" },
  "Convertido": { key: "notify_contract_signed", emoji: "✅", label: "Convertido" },
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
