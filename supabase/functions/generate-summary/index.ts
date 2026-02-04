import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId } = await req.json();
    
    if (!caseId) {
      throw new Error("caseId is required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get case details
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseError) throw caseError;

    // Get conversation history
    const { data: messages, error: messagesError } = await supabase
      .from("conversation_history")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    // If no messages, return early
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ 
          summary: "Não há mensagens suficientes para gerar um resumo." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format conversation for AI
    const conversationText = messages
      .map((msg) => `${msg.role === "user" ? "Cliente" : "Atendente"}: ${msg.content}`)
      .join("\n");

    const clientName = caseData.client_name || "o cliente";
    const status = caseData.status || "Em Atendimento";

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em resumir atendimentos de clientes para advogados e escritórios jurídicos. 
            
Crie um resumo conciso e objetivo do atendimento contendo:
1. Principais pontos discutidos
2. Problema ou demanda do cliente
3. Situação atual do atendimento
4. Próximos passos (se houver)

Seja direto e profissional. Use bullet points quando apropriado. Máximo de 150 palavras.`
          },
          {
            role: "user",
            content: `Resuma o seguinte atendimento com ${clientName}. Status atual: ${status}.

Conversa:
${conversationText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "Não foi possível gerar o resumo.";

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate-summary:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
