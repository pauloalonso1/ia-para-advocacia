import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("ZapSign webhook received:", JSON.stringify(body));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ZapSign sends: { doc_token, status, name, signers, ... }
    // Status values: "signed", "pending", "refused", "link_opened", etc.
    const docToken = body.token || body.doc_token;
    const docStatus = body.status;

    if (!docToken) {
      console.log("No doc_token in webhook payload");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing doc_token: ${docToken}, status: ${docStatus}`);

    // Find the document in our tracking table
    const { data: doc, error: docError } = await supabase
      .from("signed_documents")
      .select("*")
      .eq("doc_token", docToken)
      .maybeSingle();

    if (docError) {
      console.error("Error finding document:", docError);
    }

    if (!doc) {
      console.log("Document not found in tracking table, skipping");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map ZapSign status to our status
    let newStatus = doc.status;
    let signedAt = doc.signed_at;

    if (docStatus === "signed" || docStatus === "closed") {
      newStatus = "signed";
      signedAt = new Date().toISOString();
    } else if (docStatus === "refused") {
      newStatus = "refused";
    } else if (docStatus === "link_opened") {
      newStatus = "opened";
    }

    // Update document status
    const { error: updateError } = await supabase
      .from("signed_documents")
      .update({
        status: newStatus,
        signed_at: signedAt,
        zapsign_data: body,
      })
      .eq("id", doc.id);

    if (updateError) {
      console.error("Error updating document:", updateError);
    }

    // If signed, convert the case to "Convertido"
    if (newStatus === "signed" && doc.case_id) {
      console.log(`Document signed! Converting case ${doc.case_id} to Convertido`);
      
      const { error: caseError } = await supabase
        .from("cases")
        .update({ status: "Convertido" })
        .eq("id", doc.case_id);

      if (caseError) {
        console.error("Error updating case status:", caseError);
      } else {
        console.log("Case converted successfully!");
      }

      // Send notification via WhatsApp if Evolution API is configured
      try {
        const { data: evolutionSettings } = await supabase
          .from("evolution_api_settings")
          .select("*")
          .eq("user_id", doc.user_id)
          .maybeSingle();

        const { data: notifSettings } = await supabase
          .from("notification_settings")
          .select("*")
          .eq("user_id", doc.user_id)
          .maybeSingle();

        if (
          evolutionSettings?.is_connected &&
          notifSettings?.is_enabled &&
          notifSettings?.notify_contract_signed &&
          notifSettings?.notification_phone
        ) {
          const message = `✅ *Contrato assinado!*\n\n📝 Cliente: ${doc.client_name || "N/A"}\n📱 Telefone: ${doc.client_phone || "N/A"}\n📄 Documento: ${doc.template_name || "N/A"}\n⏰ Assinado em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;

          const apiUrl = evolutionSettings.api_url.replace(/\/$/, "");
          const instanceName = evolutionSettings.instance_name || "default";

          await fetch(
            `${apiUrl}/message/sendText/${instanceName}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: evolutionSettings.api_key,
              },
              body: JSON.stringify({
                number: notifSettings.notification_phone.replace(/\D/g, ""),
                text: message,
              }),
            }
          );
          console.log("Notification sent for signed contract");
        }
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
      }
    }

    return new Response(JSON.stringify({ ok: true, status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ZapSign webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
