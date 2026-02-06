import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ZAPSIGN_API_URL = "https://api.zapsign.com.br/api/v1";
const ZAPSIGN_SANDBOX_URL = "https://sandbox.api.zapsign.com.br/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get ZapSign settings
    const { data: settings, error: settingsError } = await supabase
      .from("zapsign_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: "ZapSign não configurada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!settings.is_enabled) {
      return new Response(JSON.stringify({ error: "Integração ZapSign desativada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = settings.sandbox_mode ? ZAPSIGN_SANDBOX_URL : ZAPSIGN_API_URL;
    const body = await req.json();
    const { action } = body;

    // List templates
    if (action === "list-templates") {
      const response = await fetch(`${baseUrl}/templates/`, {
        headers: { Authorization: `Bearer ${settings.api_token}` },
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("ZapSign list templates error:", response.status, text);
        return new Response(JSON.stringify({ error: "Erro ao listar templates" }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create document from template
    if (action === "create-from-template") {
      const { template_id, signer_name, signer_email, signer_phone, fields } = body;

      const payload: Record<string, unknown> = {
        template_id,
        signer_name,
        signers: [
          {
            name: signer_name,
            email: signer_email || undefined,
            phone_country: "55",
            phone_number: signer_phone?.replace(/\D/g, "") || undefined,
            auth_mode: "assinaturaTela",
            send_automatic_email: !!signer_email,
            send_automatic_whatsapp: !!signer_phone,
          },
        ],
      };

      if (fields && Object.keys(fields).length > 0) {
        payload.data = Object.entries(fields).map(([key, value]) => ({
          de: `{{${key}}}`,
          para: value,
        }));
      }

      const response = await fetch(`${baseUrl}/models/create-doc/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.api_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("ZapSign create doc error:", response.status, text);
        return new Response(JSON.stringify({ error: "Erro ao criar documento" }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get document status
    if (action === "doc-status") {
      const { doc_token } = body;
      const response = await fetch(`${baseUrl}/docs/${doc_token}/`, {
        headers: { Authorization: `Bearer ${settings.api_token}` },
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("ZapSign doc status error:", response.status, text);
        return new Response(JSON.stringify({ error: "Erro ao buscar status" }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ZapSign edge function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
