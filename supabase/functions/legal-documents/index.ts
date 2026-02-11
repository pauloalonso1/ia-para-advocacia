import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || null;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY") || null;

    const { action, data } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "generate_petition": {
        const { type, court, parties, facts, legalBasis, requests, referenceModel, lawyer } = data;
        console.log(`[legal-documents] generate_petition called. Has referenceModel: ${!!referenceModel}, length: ${referenceModel?.length || 0}, has lawyer: ${!!lawyer}`);
        
        let lawyerBlock = "";
        if (lawyer?.name) {
          lawyerBlock = `

ADVOGADO RESPONSÁVEL (use estas informações EXATAS no encerramento/assinatura da petição):
- Nome: ${lawyer.name}
- OAB: ${lawyer.oab || "a informar"}
- E-mail: ${lawyer.email || "a informar"}
- Telefone: ${lawyer.phone || "a informar"}
`;
        }

        systemPrompt = `Você é um advogado brasileiro sênior especialista em redação jurídica. Sua tarefa é gerar petições jurídicas profissionais em português brasileiro.

REGRA FUNDAMENTAL: Se o usuário fornecer instruções personalizadas na mensagem, você DEVE seguir CADA UMA delas com prioridade ABSOLUTA sobre qualquer padrão genérico. As instruções do usuário são LEI. Não gere uma petição genérica — adapte TUDO conforme as instruções.${lawyerBlock ? "\n" + lawyerBlock : ""}`;
        
        let instructionBlock = "";
        if (referenceModel) {
          instructionBlock = `

╔══════════════════════════════════════════════════════════╗
║  INSTRUÇÕES PERSONALIZADAS DO USUÁRIO - PRIORIDADE MÁXIMA  ║
╚══════════════════════════════════════════════════════════╝

${referenceModel}

╔══════════════════════════════════════════════════════════╗
║  FIM DAS INSTRUÇÕES - SIGA TODAS ACIMA AO REDIGIR       ║
╚══════════════════════════════════════════════════════════╝

`;
        }
        
        userPrompt = `${instructionBlock}Com base ${referenceModel ? "nas INSTRUÇÕES PERSONALIZADAS acima e " : ""}nos dados abaixo, gere a petição:

Tipo: ${type}
Juízo: ${court || "competente"}
Requerente: ${parties?.plaintiff || "A definir"}
Requerido: ${parties?.defendant || "A definir"}
Fatos: ${facts}
Fundamento Jurídico: ${legalBasis || "A ser fundamentado conforme aplicável"}
Pedidos: ${requests || "Conforme os fatos narrados"}

${referenceModel ? "LEMBRETE FINAL: Siga TODAS as instruções personalizadas fornecidas acima. NÃO gere uma petição genérica." : "Gere a petição completa com: endereçamento, qualificação das partes, dos fatos, do direito, dos pedidos e encerramento."}`;
        break;
      }

      case "analyze_petition": {
        systemPrompt = `Você é um advogado brasileiro sênior especialista em análise processual. Analise a petição fornecida de forma detalhada, identificando pontos fortes, fragilidades, sugestões de melhoria e possíveis riscos processuais. Seja objetivo e prático.`;
        userPrompt = `Analise a seguinte petição:\n\n${data.text}`;
        break;
      }

      case "generate_contract": {
        const { type, partiesInfo, clauses, value, duration } = data;
        systemPrompt = `Você é um advogado brasileiro sênior especialista em direito contratual. Gere um contrato profissional e completo em português brasileiro, seguindo as normas do Código Civil e boas práticas. Inclua cláusulas de proteção para ambas as partes.`;
        userPrompt = `Gere um contrato do tipo "${type}".

Partes envolvidas: ${partiesInfo || "A definir"}

Cláusulas específicas solicitadas: ${clauses || "Padrão para o tipo de contrato"}

Valor: ${value || "A definir"}
Duração: ${duration || "A definir"}

Gere o contrato completo com: identificação das partes, objeto, obrigações, valor e forma de pagamento, prazo, rescisão, penalidades, foro e assinaturas.`;
        break;
      }

      case "analyze_contract": {
        systemPrompt = `Você é um advogado brasileiro sênior especialista em análise contratual. Analise o contrato fornecido identificando cláusulas abusivas, riscos, omissões e sugestões de melhoria. Seja objetivo e prático.`;
        userPrompt = `Analise o seguinte contrato:\n\n${data.text}`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
    
    // Use strongest model for petition generation with custom instructions
    const useStrongerModel = action === "generate_petition" && data.referenceModel;
    const aiModel = useStrongerModel ? "gpt-5.2" : "gpt-4o-mini";
    const aiOptions = useStrongerModel
      ? { temperature: 0.5, max_tokens: 16384, timeoutMs: 120_000, userId: user.id, source: "legal-documents" }
      : { timeoutMs: 120_000, userId: user.id, source: "legal-documents" };

    const result = await callAI(openaiApiKey, lovableApiKey, messages, aiModel, aiOptions);

    return new Response(JSON.stringify({ success: true, content: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("legal-documents error:", e);

    const status = e.message?.includes("429") ? 429 : e.message?.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: e.message || "Erro interno" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
