// RAG knowledge base search and contact memory management

import { callAIChatCompletions, callAIEmbeddings } from "./ai-client.ts";

// Search RAG knowledge base for relevant context
export async function searchRAGContext(
  supabase: any,
  apiKey: string | null,
  lovableApiKey: string | null,
  userId: string,
  agentId: string,
  query: string,
  clientPhone?: string
): Promise<string> {
  try {
    const embedding = await callAIEmbeddings(apiKey, lovableApiKey, query, 768);
    if (!embedding) {
      console.warn("⚠️ Could not generate embedding for RAG search, skipping");
      return "";
    }

    const [knowledgeResults, memoryResults] = await Promise.all([
      supabase.rpc("match_knowledge_chunks", {
        query_embedding: JSON.stringify(embedding),
        match_user_id: userId,
        match_agent_id: agentId,
        match_threshold: 0.5,
        match_count: 3,
      }),
      clientPhone
        ? supabase
            .rpc("match_contact_memories", {
              query_embedding: JSON.stringify(embedding),
              match_user_id: userId,
              match_phone: clientPhone,
              match_agent_id: agentId,
              match_threshold: 0.5,
              match_count: 3,
            })
            .then((res: any) => res, () => ({ data: null, error: null }))
        : Promise.resolve({ data: null, error: null }),
    ]);

    const chunks = knowledgeResults.data || [];
    const memories = memoryResults.data || [];

    const contextParts: string[] = [];

    if (chunks.length > 0) {
      console.log(`🧠 RAG found ${chunks.length} relevant knowledge chunks`);
      const ragContext = chunks
        .map((r: any, i: number) => `[Doc ${i + 1}] ${r.content}`)
        .join("\n\n");
      contextParts.push(`📚 Base de Conhecimento:\n${ragContext}`);
    }

    if (memories.length > 0) {
      console.log(`💭 Found ${memories.length} contact memories`);
      const memContext = memories
        .map((r: any, i: number) => `[Mem ${i + 1}] ${r.content}`)
        .join("\n");
      contextParts.push(`💭 Memórias do Contato:\n${memContext}`);
    }

    return contextParts.join("\n\n---\n\n");
  } catch (e) {
    console.error("RAG search error:", e);
    return "";
  }
}

// Save a conversation memory for the contact (runs in background)
export async function saveContactMemory(
  supabase: any,
  apiKey: string | null,
  lovableApiKey: string | null,
  userId: string,
  clientPhone: string,
  agentId: string,
  conversationContext: string
): Promise<void> {
  try {
    const data = await callAIChatCompletions(apiKey, lovableApiKey, {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Resuma a interação abaixo em 1-2 frases objetivas, focando em:
- Assunto principal discutido
- Informações importantes do cliente (necessidades, preferências)
- Status atual do atendimento
Responda APENAS com o resumo, sem prefixos.`,
        },
        { role: "user", content: conversationContext },
      ],
      temperature: 0.2,
      max_tokens: 200,
    });

    const summary = data.choices?.[0]?.message?.content?.trim();
    if (!summary) return;

    const embedding = await callAIEmbeddings(apiKey, lovableApiKey, summary, 768);
    if (!embedding) {
      await supabase.from("contact_memories").insert({
        user_id: userId,
        contact_phone: clientPhone,
        agent_id: agentId,
        memory_type: "conversation_summary",
        content: summary,
        metadata: { created_from: "auto_webhook", timestamp: new Date().toISOString() },
      });
      console.log(`🧠 Contact memory saved (no embedding) for ${clientPhone}`);
      return;
    }

    await supabase.from("contact_memories").insert({
      user_id: userId,
      contact_phone: clientPhone,
      agent_id: agentId,
      memory_type: "conversation_summary",
      content: summary,
      embedding: JSON.stringify(embedding),
      metadata: { created_from: "auto_webhook", timestamp: new Date().toISOString() },
    });

    console.log(`🧠 Contact memory saved for ${clientPhone}: ${summary.slice(0, 80)}...`);
  } catch (e) {
    console.error("Error saving contact memory:", e);
  }
}
