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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get notification settings
    const { data: notifSettings, error: notifError } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (notifError) {
      console.error("Error fetching notification settings:", notifError);
      return new Response(JSON.stringify({ error: "Erro ao buscar configurações de notificação", details: notifError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!notifSettings) {
      return new Response(JSON.stringify({ error: "Nenhuma configuração de notificação encontrada. Configure primeiro nas Configurações." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!notifSettings.is_enabled) {
      return new Response(JSON.stringify({ error: "Notificações estão desativadas. Ative nas Configurações." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Evolution API settings
    const { data: evolutionSettings, error: evoError } = await supabase
      .from("evolution_api_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (evoError || !evolutionSettings) {
      console.error("Error fetching evolution settings:", evoError);
      return new Response(JSON.stringify({ error: "Configurações da Evolution API não encontradas. Configure o WhatsApp primeiro." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const testMessage = `🔔 *Teste de Notificação*\n\n✅ Suas notificações estão funcionando!\n\n📋 *Configurações ativas:*\n${notifSettings.notify_new_lead ? '✅' : '❌'} Novo Lead\n${notifSettings.notify_qualified_lead ? '✅' : '❌'} Lead Qualificado\n${notifSettings.notify_meeting_scheduled ? '✅' : '❌'} Reunião Agendada\n${notifSettings.notify_contract_sent ? '✅' : '❌'} Contrato Enviado\n${notifSettings.notify_contract_signed ? '✅' : '❌'} Contrato Assinado\n\n⏰ *Horário:* ${now}`;

    // Send via Evolution API
    const url = `${evolutionSettings.api_url}/message/sendText/${evolutionSettings.instance_name}`;
    console.log(`📤 Sending test notification to ${notifSettings.notification_phone} via ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evolutionSettings.api_key,
      },
      body: JSON.stringify({
        number: notifSettings.notification_phone,
        text: testMessage,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("WhatsApp send error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        error: "Falha ao enviar mensagem de teste", 
        details: errorText,
        status_code: response.status 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log(`✅ Test notification sent successfully to ${notifSettings.notification_phone}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Notificação de teste enviada para ${notifSettings.notification_phone}`,
      messageId: data?.key?.id || null
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Test notification error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
