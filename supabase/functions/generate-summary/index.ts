import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId } = await req.json();
    
    if (!caseId) {
      throw new Error("caseId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseError) throw caseError;

    const { data: messages, error: messagesError } = await supabase
      .from("conversation_history")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ 
          summary: "Não há mensagens suficientes para gerar um resumo." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const conversationText = messages
      .map((msg) => `${msg.role === "client" ? "Cliente" : "Atendente"}: ${msg.content}`)
      .join("\n");

    const clientName = caseData.client_name || "o cliente";
    const status = caseData.status || "Em Atendimento";

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || null;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") || null;

    const aiMessages = [
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
        content: `Resuma o seguinte atendimento com ${clientName}. Status atual: ${status}.\n\nConversa:\n${conversationText}`
      }
    ];

    const summary = await callAI(openaiApiKey, lovableApiKey, aiMessages, "gpt-4o-mini", {
      temperature: 0.3,
      max_tokens: 500,
      userId: caseData.user_id,
      source: "generate-summary",
      contactPhone: caseData.client_phone,
    });

    return new Response(
      JSON.stringify({ summary: summary || "Não foi possível gerar o resumo." }),
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
