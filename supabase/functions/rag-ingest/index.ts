import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Semantic-aware text chunker: splits by paragraphs first, then merges small ones
function chunkText(text: string, maxChunkSize = 500, overlap = 50): string[] {
  const paragraphs = text.split(/\n{2,}|\r\n{2,}/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const words = trimmed.split(/\s+/);

    if (words.length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      const sentences = trimmed.split(/(?<=[.!?])\s+/);
      let sentenceChunk = "";
      for (const sentence of sentences) {
        const combined = sentenceChunk ? sentenceChunk + " " + sentence : sentence;
        if (combined.split(/\s+/).length > maxChunkSize) {
          if (sentenceChunk.trim()) chunks.push(sentenceChunk.trim());
          sentenceChunk = sentence;
        } else {
          sentenceChunk = combined;
        }
      }
      if (sentenceChunk.trim()) chunks.push(sentenceChunk.trim());
      continue;
    }

    const combined = currentChunk ? currentChunk + "\n\n" + trimmed : trimmed;
    if (combined.split(/\s+/).length > maxChunkSize) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = trimmed;
    } else {
      currentChunk = combined;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  if (overlap > 0 && chunks.length > 1) {
    const overlappedChunks: string[] = [chunks[0]];
    for (let i = 1; i < chunks.length; i++) {
      const prevWords = chunks[i - 1].split(/\s+/);
      const overlapText = prevWords.slice(-overlap).join(" ");
      overlappedChunks.push(overlapText + "\n\n" + chunks[i]);
    }
    return overlappedChunks;
  }

  return chunks;
}

// Generate real embedding using OpenAI
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI embedding error:", response.status, errorText);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  const embedding = data.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length !== 768) {
    throw new Error(`Invalid embedding: expected 768 dimensions, got ${embedding?.length}`);
  }

  return embedding;
}

// Extract text from PDF/DOCX using GPT-4o vision
async function extractTextFromFile(
  fileBytes: Uint8Array,
  mimeType: string,
  apiKey: string
): Promise<string> {
  const base64 = btoa(String.fromCharCode(...fileBytes));
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a document text extractor. Extract ALL text content from the uploaded document.
Preserve the structure: headings, paragraphs, lists, and tables.
Return ONLY the extracted text, nothing else. No commentary or explanation.`
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` }
            },
            {
              type: "text",
              text: "Extract all text from this document. Return only the raw text content preserving structure."
            }
          ]
        }
      ],
      temperature: 0,
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("File extraction error:", response.status, errorText);
    throw new Error(`Failed to extract text from file: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// Rerank chunks using AI for better relevance
async function rerankChunks(
  query: string,
  chunks: { id: string; content: string; similarity: number; document_id?: string }[],
  apiKey: string,
  topK = 5
): Promise<typeof chunks> {
  if (chunks.length <= topK) return chunks;

  const chunkList = chunks
    .map((c, i) => `[${i}] ${c.content.slice(0, 300)}`)
    .join("\n---\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a relevance ranker. Given a query and numbered text chunks, return a JSON array of the ${topK} most relevant chunk indices, ordered by relevance (most relevant first).
Return ONLY a JSON array of numbers, e.g. [3, 0, 7, 1, 5]. Nothing else.`
        },
        {
          role: "user",
          content: `Query: "${query}"\n\nChunks:\n${chunkList}`
        }
      ],
      temperature: 0,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    console.error("Reranking failed, returning original order");
    return chunks.slice(0, topK);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  try {
    let jsonStr = content;
    if (content.includes("```")) {
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
    }
    const indices: number[] = JSON.parse(jsonStr);
    const reranked = indices
      .filter((i: number) => i >= 0 && i < chunks.length)
      .map((i: number) => chunks[i]);
    return reranked.length > 0 ? reranked : chunks.slice(0, topK);
  } catch {
    console.error("Failed to parse reranking result");
    return chunks.slice(0, topK);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid auth token");

    const { action, ...params } = await req.json();

    // ─── INGEST (text) ───
    if (action === "ingest") {
      const { title, content, agentId, sourceType = "manual", fileName } = params;

      if (!title || !content) {
        throw new Error("title and content are required");
      }

      console.log(`📄 Ingesting document: "${title}" (${content.length} chars)`);

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

      const chunks = chunkText(content);
      console.log(`🔪 Split into ${chunks.length} chunks (semantic)`);

      let successCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        try {
          const embedding = await generateEmbedding(chunks[i], openaiApiKey);

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

      console.log(`✅ Ingested ${successCount}/${chunks.length} chunks for "${title}"`);

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

    // ─── INGEST FILE (PDF/DOCX) ───
    if (action === "ingest-file") {
      const { title, storagePath, agentId, fileName, mimeType } = params;

      if (!storagePath || !title) {
        throw new Error("storagePath and title are required");
      }

      console.log(`📎 Processing file: "${fileName}" (${mimeType})`);

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("knowledge-files")
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`);
      }

      const fileBytes = new Uint8Array(await fileData.arrayBuffer());
      console.log(`📦 File size: ${fileBytes.length} bytes`);

      const extractedText = await extractTextFromFile(fileBytes, mimeType, openaiApiKey);

      if (!extractedText || extractedText.length < 10) {
        throw new Error("Could not extract text from file");
      }

      console.log(`📝 Extracted ${extractedText.length} chars from file`);

      const { data: doc, error: docError } = await supabase
        .from("knowledge_documents")
        .insert({
          user_id: user.id,
          agent_id: agentId || null,
          title,
          content: extractedText,
          source_type: "upload",
          file_name: fileName,
          metadata: { mimeType, storagePath, originalSize: fileBytes.length },
        })
        .select()
        .single();

      if (docError) throw docError;

      const chunks = chunkText(extractedText);
      console.log(`🔪 Split into ${chunks.length} semantic chunks`);

      let successCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        try {
          const embedding = await generateEmbedding(chunks[i], openaiApiKey);

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

          if (chunkError) console.error(`Error chunk ${i}:`, chunkError);
          else successCount++;
        } catch (embeddingError) {
          console.error(`Embedding error chunk ${i}:`, embeddingError);
        }
      }

      console.log(`✅ File ingested: ${successCount}/${chunks.length} chunks`);

      return new Response(
        JSON.stringify({
          success: true,
          documentId: doc.id,
          chunksCreated: successCount,
          totalChunks: chunks.length,
          extractedChars: extractedText.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── SEARCH (with optional reranking) ───
    if (action === "search") {
      const { query, agentId, threshold = 0.5, limit = 5, rerank = false } = params;

      if (!query) throw new Error("query is required");

      console.log(`🔍 Searching: "${query}" for user ${user.id} (rerank: ${rerank})`);

      const queryEmbedding = await generateEmbedding(query, openaiApiKey);

      const fetchLimit = rerank ? Math.min(limit * 3, 20) : limit;

      const { data: results, error: searchError } = await supabase.rpc(
        "match_knowledge_chunks",
        {
          query_embedding: JSON.stringify(queryEmbedding),
          match_user_id: user.id,
          match_agent_id: agentId || null,
          match_threshold: threshold,
          match_count: fetchLimit,
        }
      );

      if (searchError) throw searchError;

      let finalResults = results || [];

      if (rerank && finalResults.length > limit) {
        console.log(`🔄 Reranking ${finalResults.length} chunks to top ${limit}`);
        finalResults = await rerankChunks(query, finalResults, openaiApiKey, limit);
      }

      console.log(`📊 Found ${finalResults.length} matching chunks`);

      return new Response(
        JSON.stringify({ results: finalResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── SAVE CONTACT MEMORY ───
    if (action === "save-memory") {
      const { contactPhone, content, agentId, memoryType = "conversation_summary", metadata = {} } = params;

      if (!contactPhone || !content) {
        throw new Error("contactPhone and content are required");
      }

      console.log(`🧠 Saving memory for contact ${contactPhone}`);

      const embedding = await generateEmbedding(content, openaiApiKey);

      const { data, error } = await supabase
        .from("contact_memories")
        .insert({
          user_id: user.id,
          contact_phone: contactPhone,
          agent_id: agentId || null,
          memory_type: memoryType,
          content,
          embedding: JSON.stringify(embedding),
          metadata,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, memoryId: data.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── SEARCH CONTACT MEMORIES ───
    if (action === "search-memories") {
      const { contactPhone, query, agentId, threshold = 0.5, limit = 5 } = params;

      if (!contactPhone || !query) {
        throw new Error("contactPhone and query are required");
      }

      const queryEmbedding = await generateEmbedding(query, openaiApiKey);

      const { data: results, error } = await supabase.rpc("match_contact_memories", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_user_id: user.id,
        match_phone: contactPhone,
        match_agent_id: agentId || null,
        match_threshold: threshold,
        match_count: limit,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ results: results || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── DELETE ───
    if (action === "delete") {
      const { documentId } = params;
      if (!documentId) throw new Error("documentId is required");

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
