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
    const normalizedQuery = String(query || "").trim();
    if (!normalizedQuery) return "";

    const embedding = await callAIEmbeddings(apiKey, lovableApiKey, normalizedQuery, 768);

    const vectorSearch = async (threshold: number, count: number) => {
      const [knowledgeResults, memoryResults] = await Promise.all([
        supabase.rpc("match_knowledge_chunks", {
          query_embedding: JSON.stringify(embedding),
          match_user_id: userId,
          match_agent_id: agentId,
          match_threshold: threshold,
          match_count: count,
        }),
        clientPhone
          ? supabase
              .rpc("match_contact_memories", {
                query_embedding: JSON.stringify(embedding),
                match_user_id: userId,
                match_phone: clientPhone,
                match_agent_id: agentId,
                match_threshold: threshold,
                match_count: count,
              })
              .then((res: any) => res, () => ({ data: null, error: null }))
          : Promise.resolve({ data: null, error: null }),
      ]);

      return {
        chunks: knowledgeResults.data || [],
        memories: memoryResults.data || [],
      };
    };

    let chunks: any[] = [];
    let memories: any[] = [];

    if (embedding) {
      // Pass 1
      ({ chunks, memories } = await vectorSearch(0.5, 3));

      // Pass 2 (more recall) if nothing found
      if ((chunks?.length || 0) === 0 && (memories?.length || 0) === 0) {
        ({ chunks, memories } = await vectorSearch(0.4, 5));
      }
    } else {
      console.warn("⚠️ Could not generate embedding for RAG search, using lexical fallback");
    }

    // Lexical fallback if vector results are empty (or embeddings unavailable)
    if ((chunks?.length || 0) === 0) {
      try {
        const terms = normalizedQuery
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length >= 4)
          .slice(0, 5);

        if (terms.length > 0) {
          let q = supabase
            .from("knowledge_chunks")
            .select("content")
            .eq("user_id", userId)
            .limit(3);

          // basic OR on content ILIKE
          q = q.or(terms.map((t) => `content.ilike.%${t.replace(/[%_]/g, "")}%`).join(","));

          const { data } = await q;
          chunks = (data || []).map((d: any) => ({ content: d.content }));
        }
      } catch (e) {
        console.warn("⚠️ Lexical knowledge_chunks fallback failed:", e);
      }
    }

    if (clientPhone && (memories?.length || 0) === 0) {
      try {
        const terms = normalizedQuery
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length >= 4)
          .slice(0, 5);

        if (terms.length > 0) {
          let q = supabase
            .from("contact_memories")
            .select("content")
            .eq("user_id", userId)
            .eq("contact_phone", clientPhone)
            .limit(3);

          q = q.or(terms.map((t) => `content.ilike.%${t.replace(/[%_]/g, "")}%`).join(","));

          const { data } = await q;
          memories = (data || []).map((d: any) => ({ content: d.content }));
        }
      } catch (e) {
        console.warn("⚠️ Lexical contact_memories fallback failed:", e);
      }
    }

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
