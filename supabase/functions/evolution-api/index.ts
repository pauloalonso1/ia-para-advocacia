import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EvolutionRequest {
  action: "create" | "qrcode" | "status" | "delete" | "restart";
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

    // Remove trailing slash from API URL to avoid double slashes
    const EVOLUTION_API_URL = settings.api_url.replace(/\/+$/, '');
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
        // First check if instance already exists and its status
        console.log("Checking if instance exists:", finalInstanceName);
        const checkResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${finalInstanceName}`, {
          method: "GET",
          headers: baseHeaders,
        });
        const checkResult = await checkResponse.json();
        console.log("Connection state check:", JSON.stringify(checkResult));

        // If instance exists and is connected, return success
        if (checkResponse.ok && (checkResult.state === 'open' || checkResult.state === 'connected')) {
          return new Response(
            JSON.stringify({ 
              state: 'connected',
              instance: { state: 'open' },
              message: 'Instance already connected'
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // If instance exists but not connected, get QR code via connect endpoint
        if (checkResponse.ok || checkResult.instance) {
          console.log("Instance exists, fetching QR code via connect...");
          const connectResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${finalInstanceName}`, {
            method: "GET",
            headers: baseHeaders,
          });
          result = await connectResponse.json();
          console.log("Connect response:", JSON.stringify(result));
          
          if (connectResponse.ok) {
            return new Response(JSON.stringify(result), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // Create new instance with all settings
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

        const createUrl = `${EVOLUTION_API_URL}/instance/create`;
        console.log("Creating instance at URL:", createUrl);
        console.log("Create body:", JSON.stringify(createBody));
        
        response = await fetch(createUrl, {
          method: "POST",
          headers: baseHeaders,
          body: JSON.stringify(createBody),
        });
        result = await response.json();
        console.log("Create response status:", response.status);
        console.log("Create response body:", JSON.stringify(result));
        
        if (!response.ok) {
          // If instance already exists (403), try to get QR code
          if (response.status === 403 || 
              result.error?.includes("already") || result.message?.includes("already") || 
              result.response?.message?.some((m: string) => m.includes("already")) ||
              result.error?.includes("exists") || result.message?.includes("exists")) {
            
            console.log("Instance already exists, trying to connect...");
            
            // Try restart first to reset the instance state
            const restartResponse = await fetch(`${EVOLUTION_API_URL}/instance/restart/${finalInstanceName}`, {
              method: "PUT",
              headers: baseHeaders,
            });
            console.log("Restart response status:", restartResponse.status);
            
            // Small delay to let the instance restart
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Now get the QR code via connect
            const qrResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${finalInstanceName}`, {
              method: "GET",
              headers: baseHeaders,
            });
            result = await qrResponse.json();
            console.log("Connect after restart response:", JSON.stringify(result));
            
            if (!qrResponse.ok) {
              return new Response(
                JSON.stringify({ 
                  error: "Failed to get QR code for existing instance", 
                  details: result,
                  hint: "A instância existe mas não foi possível obter o QR code. Tente excluir e criar novamente."
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } else {
            return new Response(
              JSON.stringify({ error: "Failed to create instance", details: result }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        break;

      case "qrcode":
        // Get QR code for existing instance via connect endpoint
        console.log("Getting QR code for instance:", finalInstanceName);
        response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${finalInstanceName}`, {
          method: "GET",
          headers: baseHeaders,
        });
        result = await response.json();
        console.log("QR code response:", JSON.stringify(result));
        
        // If instance not found, return specific error
        if (!response.ok) {
          if (response.status === 404 || result.statusCode === 404 || result.error === "not_found") {
            return new Response(
              JSON.stringify({ 
                error: "Instance not found", 
                code: "INSTANCE_NOT_FOUND",
                details: "A instância não existe. Clique em 'Salvar e Conectar' para criar uma nova."
              }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          return new Response(
            JSON.stringify({ error: "Failed to get QR code", details: result }),
            { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;

      case "status":
        // Check instance connection status
        console.log("Checking status for instance:", finalInstanceName);
        response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${finalInstanceName}`, {
          method: "GET",
          headers: baseHeaders,
        });
        result = await response.json();
        console.log("Status response:", JSON.stringify(result));
        
        // If instance not found, return disconnected status instead of error
        if (!response.ok && (result.statusCode === 404 || result.error === "not_found" || response.status === 404)) {
          return new Response(
            JSON.stringify({ 
              state: "disconnected",
              code: "INSTANCE_NOT_FOUND"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;

      case "restart":
        // Restart instance to get a new QR code
        console.log("Restarting instance:", finalInstanceName);
        response = await fetch(`${EVOLUTION_API_URL}/instance/restart/${finalInstanceName}`, {
          method: "PUT",
          headers: baseHeaders,
        });
        result = await response.json();
        console.log("Restart response:", JSON.stringify(result));
        
        if (response.ok) {
          // After restart, get the new QR code
          await new Promise(resolve => setTimeout(resolve, 1000));
          const qrResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${finalInstanceName}`, {
            method: "GET",
            headers: baseHeaders,
          });
          result = await qrResponse.json();
          console.log("QR after restart:", JSON.stringify(result));
        }
        break;

      case "delete":
        // Delete instance
        console.log("Deleting instance:", finalInstanceName);
        response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${finalInstanceName}`, {
          method: "DELETE",
          headers: baseHeaders,
        });
        result = await response.json();
        console.log("Delete response:", JSON.stringify(result));
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
