import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EvolutionRequest {
  action: "create" | "qrcode" | "status" | "delete";
  instanceName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to identify the user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user's Evolution API settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('evolution_api_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError) {
      return new Response(
        JSON.stringify({ error: "Error fetching settings", details: settingsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings || !settings.api_url || !settings.api_key) {
      return new Response(
        JSON.stringify({ 
          error: "Evolution API not configured",
          details: "Please configure your Evolution API URL and API Key in Settings" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const EVOLUTION_API_URL = settings.api_url;
    const EVOLUTION_API_KEY = settings.api_key;

    const body: EvolutionRequest = await req.json();
    const { action, instanceName } = body;

    // Use instance name from request or from settings
    const finalInstanceName = instanceName || settings.instance_name;

    if (!finalInstanceName) {
      return new Response(
        JSON.stringify({ error: "instanceName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseHeaders = {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
    };

    let response: Response;
    let result: any;

    switch (action) {
      case "create":
        // Create a new instance with all settings
        const createBody: any = {
          instanceName: finalInstanceName,
          qrcode: settings.qrcode_enabled ?? true,
          integration: settings.integration_type || "WHATSAPP-BAILEYS",
        };

        // Add optional settings
        if (settings.reject_call) {
          createBody.rejectCall = true;
          if (settings.msg_call) {
            createBody.msgCall = settings.msg_call;
          }
        }
        if (settings.groups_ignore) {
          createBody.groupsIgnore = true;
        }
        if (settings.always_online) {
          createBody.alwaysOnline = true;
        }
        if (settings.read_messages) {
          createBody.readMessages = true;
        }
        if (settings.read_status) {
          createBody.readStatus = true;
        }
        if (settings.sync_full_history) {
          createBody.syncFullHistory = true;
        }

        // Add webhook if configured
        if (settings.webhook_url) {
          createBody.webhook = {
            url: settings.webhook_url,
            byEvents: false,
            base64: false,
            events: [
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "CONNECTION_UPDATE",
              "QRCODE_UPDATED"
            ]
          };
        }

        response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: "POST",
          headers: baseHeaders,
          body: JSON.stringify(createBody),
        });
        result = await response.json();
        
        if (!response.ok) {
          // If instance already exists, try to get QR code
          if (result.error?.includes("already") || result.message?.includes("already")) {
            // Instance exists, get QR code
            const qrResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${finalInstanceName}`, {
              method: "GET",
              headers: baseHeaders,
            });
            result = await qrResponse.json();
          } else {
            return new Response(
              JSON.stringify({ error: "Failed to create instance", details: result }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        break;

      case "qrcode":
        // Get QR code for existing instance
        response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${finalInstanceName}`, {
          method: "GET",
          headers: baseHeaders,
        });
        result = await response.json();
        
        // If instance not found, return specific error
        if (!response.ok && (result.statusCode === 404 || result.error === "not_found")) {
          return new Response(
            JSON.stringify({ 
              error: "Instance not found", 
              code: "INSTANCE_NOT_FOUND",
              details: "A instância não existe. Clique em 'Salvar e Conectar' para criar uma nova."
            }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;

      case "status":
        // Check instance connection status
        response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${finalInstanceName}`, {
          method: "GET",
          headers: baseHeaders,
        });
        result = await response.json();
        
        // If instance not found, return disconnected status instead of error
        if (!response.ok && (result.statusCode === 404 || result.error === "not_found")) {
          return new Response(
            JSON.stringify({ 
              state: "disconnected",
              code: "INSTANCE_NOT_FOUND"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;

      case "delete":
        // Delete instance
        response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${finalInstanceName}`, {
          method: "DELETE",
          headers: baseHeaders,
        });
        result = await response.json();
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Evolution API error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
