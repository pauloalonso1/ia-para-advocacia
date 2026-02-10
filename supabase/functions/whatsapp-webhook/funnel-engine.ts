// Funnel orchestration: FAQ matching, category detection, case description generation

import { callAIChatCompletions } from "./ai-client.ts";

// Check if a message matches an FAQ entry
export async function checkFAQ(
  apiKey: string | null,
  lovableApiKey: string | null,
  message: string,
  faqs: { question: string; answer: string }[]
): Promise<string | null> {
  const faqList = faqs.map((f, i) => `${i + 1}. Pergunta: "${f.question}"`).join("\n");

  try {
    const data = await callAIChatCompletions(apiKey, lovableApiKey, {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um analisador de FAQ. Analise se a mensagem do cliente corresponde a alguma pergunta frequente.
Responda APENAS com o número da FAQ correspondente ou "0" se nenhuma corresponder.`,
        },
        {
          role: "user",
          content: `Mensagem do cliente: "${message}"\n\nFAQs disponíveis:\n${faqList}\n\nResponda apenas com o número (1, 2, 3...) ou 0:`,
        },
      ],
      temperature: 0.1,
      max_tokens: 10,
    });

    const answer = data.choices?.[0]?.message?.content?.trim();
    const faqIndex = parseInt(answer) - 1;

    if (faqIndex >= 0 && faqIndex < faqs.length) {
      return faqs[faqIndex].answer;
    }
  } catch (e) {
    console.error("FAQ check failed:", e);
  }

  return null;
}

// Detect client's legal area from conversation and find a matching specialist agent by category
export async function detectAndMatchCategoryAgent(
  apiKey: string | null,
  lovableApiKey: string | null,
  supabase: any,
  userId: string,
  currentAgentId: string,
  history: any[],
  lastMessage: string
): Promise<string | null> {
  const { data: availableAgents } = await supabase
    .from("agents")
    .select("id, name, category")
    .eq("user_id", userId)
    .eq("is_active", true)
    .neq("id", currentAgentId)
    .not("category", "is", null);

  if (!availableAgents || availableAgents.length === 0) {
    console.log("⚠️ No specialist agents with categories found for category-based switch");
    return null;
  }

  const categories = [...new Set(availableAgents.map((a: any) => a.category))];
  console.log(`🔍 Detecting legal area. Available categories: ${categories.join(", ")}`);

  const conversationSnippet = history
    .slice(-20)
    .map((m: any) => `${m.role === "client" ? "Cliente" : "Assistente"}: ${m.content}`)
    .join("\n");

  const data = await callAIChatCompletions(apiKey, lovableApiKey, {
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 30,
    messages: [
      {
        role: "system",
        content: `Você é um classificador jurídico. Analise a conversa e identifique a área do direito do caso do cliente.

CATEGORIAS DISPONÍVEIS:
${categories.join("\n")}

Responda APENAS com o nome EXATO de UMA categoria da lista acima. Se nenhuma se aplicar, responda "NENHUMA".`,
      },
      {
        role: "user",
        content: `Conversa:\n${conversationSnippet}\nÚltima mensagem do cliente: ${lastMessage}\n\nQual a área jurídica deste caso?`,
      },
    ],
  });

  const detectedCategory = data.choices?.[0]?.message?.content?.trim();
  console.log(`🏷️ Detected legal category: "${detectedCategory}"`);

  if (!detectedCategory || detectedCategory === "NENHUMA") return null;

  const matchingAgent = availableAgents.find(
    (a: any) => a.category?.toLowerCase() === detectedCategory.toLowerCase()
  );

  if (matchingAgent) {
    console.log(`✅ Found specialist agent: "${matchingAgent.name}" (category: ${matchingAgent.category})`);
    return matchingAgent.id;
  }

  console.log(`⚠️ No agent found for category "${detectedCategory}"`);
  return null;
}

// Generate AI case description when lead is qualified
export async function generateCaseDescription(
  supabase: any,
  apiKey: string | null,
  lovableApiKey: string | null,
  caseId: string,
  clientName: string,
  history: any[]
): Promise<void> {
  try {
    console.log(`📝 Generating case description for case ${caseId}...`);

    const conversationText = history
      .slice(-30)
      .map((m: any) => `${m.role === "user" ? "Cliente" : "Assistente"}: ${m.content}`)
      .join("\n");

    const data = await callAIChatCompletions(apiKey, lovableApiKey, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `Você é um assistente jurídico. Gere uma descrição concisa do caso com base na conversa abaixo.

FORMATO OBRIGATÓRIO:
- Máximo 3 parágrafos curtos
- Parágrafo 1: Tipo de caso e demanda principal do cliente
- Parágrafo 2: Dados relevantes coletados (valores, datas, documentos mencionados)
- Parágrafo 3: Status atual e próximos passos recomendados

Seja objetivo e profissional. Use linguagem jurídica quando apropriado.`,
        },
        {
          role: "user",
          content: `Cliente: ${clientName}\n\nConversa:\n${conversationText}\n\nGere a descrição do caso.`,
        },
      ],
    });

    const description = data.choices?.[0]?.message?.content;

    if (description) {
      await supabase
        .from("cases")
        .update({ case_description: description })
        .eq("id", caseId);
      console.log(`✅ Case description saved for case ${caseId}`);
    }
  } catch (error) {
    console.error("Error generating case description:", error);
  }
}
