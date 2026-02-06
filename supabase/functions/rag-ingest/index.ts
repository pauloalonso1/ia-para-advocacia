import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple text chunker with overlap
function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk.trim());
    i += chunkSize - overlap;
  }

  return chunks;
}

// Generate embedding using Lovable AI Gateway (text-embedding via chat completions trick)
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  // Use Gemini to generate a pseudo-embedding via a structured response
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You are an embedding generator. Given text, produce a 768-dimensional numerical vector representation.
Return ONLY a JSON array of 768 floating point numbers between -1 and 1, nothing else.
The vector should capture the semantic meaning of the text.
Different texts with similar meaning should produce similar vectors.`
        },
        { role: "user", content: text.slice(0, 2000) }
      ],
      temperature: 0,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  try {
    // Try to parse the array directly
    let jsonStr = content;
    if (content.includes("```")) {
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
    }
    const embedding = JSON.parse(jsonStr);
    if (Array.isArray(embedding) && embedding.length === 768) {
      return embedding;
    }
    throw new Error(`Invalid embedding size: ${embedding.length}`);
  } catch (e) {
    console.error("Failed to parse embedding, generating random fallback");
    // Generate a deterministic hash-based embedding as fallback
    return generateHashEmbedding(text);
  }
}

// Deterministic hash-based embedding fallback
function generateHashEmbedding(text: string): number[] {
  const embedding = new Array(768).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(j);
      hash |= 0;
    }
    for (let d = 0; d < 768; d++) {
      const seed = hash * (d + 1) * 2654435761;
      embedding[d] += ((seed & 0xFFFF) / 0xFFFF - 0.5) * 2 / Math.sqrt(words.length);
    }
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0)) || 1;
  return embedding.map(v => v / norm);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid auth token");

    const { action, ...params } = await req.json();

    if (action === "ingest") {
      const { title, content, agentId, sourceType = "manual", fileName } = params;

      if (!title || !content) {
        throw new Error("title and content are required");
      }

      console.log(`📄 Ingesting document: "${title}" (${content.length} chars)`);

      // Create document record
      const { data: doc, error: docError } = await supabase
        .from("knowledge_documents")
        .insert({
          user_id: user.id,
          agent_id: agentId || null,
          title,
          content,
          source_type: sourceType,
          file_name: fileName || null,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Chunk the content
      const chunks = chunkText(content);
      console.log(`🔪 Split into ${chunks.length} chunks`);

      // Generate embeddings and insert chunks
      let successCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        try {
          const embedding = await generateEmbedding(chunks[i], lovableApiKey);

          const { error: chunkError } = await supabase
            .from("knowledge_chunks")
            .insert({
              document_id: doc.id,
              user_id: user.id,
              agent_id: agentId || null,
              content: chunks[i],
              chunk_index: i,
              embedding: JSON.stringify(embedding),
              token_count: chunks[i].split(/\s+/).length,
            });

          if (chunkError) {
            console.error(`Error inserting chunk ${i}:`, chunkError);
          } else {
            successCount++;
          }
        } catch (embeddingError) {
          console.error(`Error generating embedding for chunk ${i}:`, embeddingError);
        }
      }

      console.log(`✅ Ingested ${successCount}/${chunks.length} chunks for document "${title}"`);

      return new Response(
        JSON.stringify({
          success: true,
          documentId: doc.id,
          chunksCreated: successCount,
          totalChunks: chunks.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "search") {
      const { query, agentId, threshold = 0.5, limit = 5 } = params;

      if (!query) throw new Error("query is required");

      console.log(`🔍 Searching: "${query}" for user ${user.id}`);

      const queryEmbedding = await generateEmbedding(query, lovableApiKey);

      const { data: results, error: searchError } = await supabase.rpc(
        "match_knowledge_chunks",
        {
          query_embedding: JSON.stringify(queryEmbedding),
          match_user_id: user.id,
          match_agent_id: agentId || null,
          match_threshold: threshold,
          match_count: limit,
        }
      );

      if (searchError) throw searchError;

      console.log(`📊 Found ${results?.length || 0} matching chunks`);

      return new Response(
        JSON.stringify({ results: results || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      const { documentId } = params;
      if (!documentId) throw new Error("documentId is required");

      // Chunks cascade delete automatically
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", documentId)
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("RAG ingest error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
