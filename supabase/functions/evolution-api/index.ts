import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateInstanceRequest {
  action: "create" | "qrcode" | "status" | "delete";
  instanceName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "Evolution API not configured",
          details: "EVOLUTION_API_URL or EVOLUTION_API_KEY is missing" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateInstanceRequest = await req.json();
    const { action, instanceName } = body;

    if (!instanceName) {
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
        // Create a new instance
        response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: "POST",
          headers: baseHeaders,
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          }),
        });
        result = await response.json();
        
        if (!response.ok) {
          // If instance already exists, try to get QR code
          if (result.error?.includes("already") || result.message?.includes("already")) {
            // Instance exists, get QR code
            const qrResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
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
        response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
          method: "GET",
          headers: baseHeaders,
        });
        result = await response.json();
        break;

      case "status":
        // Check instance connection status
        response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
          method: "GET",
          headers: baseHeaders,
        });
        result = await response.json();
        break;

      case "delete":
        // Delete instance
        response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
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
