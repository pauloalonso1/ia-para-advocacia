// AI API wrappers with automatic fallback from OpenAI to Lovable AI Gateway

const FETCH_TIMEOUT_MS = 30_000;

function withTimeout(promise: Promise<Response>, ms: number): Promise<Response> {
  return Promise.race([
    promise,
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// Helper: call AI chat completions with automatic fallback from OpenAI to Lovable AI Gateway
export async function callAIChatCompletions(
  openaiApiKey: string | null,
  lovableApiKey: string | null,
  body: Record<string, any>
): Promise<any> {
  // Try OpenAI first if key is available
  if (openaiApiKey) {
    try {
      const response = await withTimeout(
        fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }),
        FETCH_TIMEOUT_MS
      );

      if (response.ok) {
        return await response.json();
      }

      const errorText = await response.text();
      console.warn(`⚠️ OpenAI API error ${response.status}: ${errorText.slice(0, 200)}`);
      // If 429 or 5xx, fall through to Lovable AI
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`OpenAI API error: ${response.status} - ${errorText.slice(0, 200)}`);
      }
      console.log("🔄 Falling back to Lovable AI Gateway...");
    } catch (e: any) {
      if (e.message?.startsWith("OpenAI API error:")) throw e;
      console.warn("⚠️ OpenAI request failed, trying Lovable AI:", e.message);
    }
  }

  // Fallback to Lovable AI Gateway (Gemini)
  if (!lovableApiKey) {
    throw new Error("No AI API key available (OpenAI failed and LOVABLE_API_KEY not configured)");
  }

  // Map OpenAI model to Gemini equivalent
  const modelMap: Record<string, string> = {
    "gpt-4o-mini": "google/gemini-2.5-flash",
    "gpt-4o": "google/gemini-2.5-flash",
  };
  const lovableModel = modelMap[body.model] || "google/gemini-2.5-flash";

  const lovableBody = { ...body, model: lovableModel };

  const response = await withTimeout(
    fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lovableBody),
    }),
    FETCH_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Lovable AI Gateway error ${response.status}: ${errorText.slice(0, 200)}`);
    throw new Error(`Lovable AI Gateway error: ${response.status}`);
  }

  console.log("✅ Lovable AI Gateway response received");
  return await response.json();
}

// Helper: call AI embeddings with fallback
export async function callAIEmbeddings(
  openaiApiKey: string | null,
  _lovableApiKey: string | null,
  input: string,
  dimensions: number = 768
): Promise<number[] | null> {
  // Try OpenAI first
  if (openaiApiKey) {
    try {
      const response = await withTimeout(
        fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: input.slice(0, 8000),
            dimensions,
          }),
        }),
        FETCH_TIMEOUT_MS
      );

      if (response.ok) {
        const data = await response.json();
        const embedding = data.data?.[0]?.embedding;
        if (Array.isArray(embedding) && embedding.length === dimensions) return embedding;
      } else {
        console.warn(`⚠️ OpenAI embeddings error ${response.status}`);
      }
    } catch (e: any) {
      console.warn("⚠️ OpenAI embeddings failed:", e.message);
    }
  }

  // Embeddings not available via Lovable AI Gateway
  console.warn("⚠️ Embeddings not available via Lovable AI Gateway, skipping RAG search");
  return null;
}
