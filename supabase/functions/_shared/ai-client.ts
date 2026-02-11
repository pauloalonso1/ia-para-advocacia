// Shared AI client with automatic fallback from OpenAI to Lovable AI Gateway
// Used by: legal-documents, whatsapp-webhook

export interface CallAIOptions {
  temperature?: number;
  max_tokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function withTimeout(promise: Promise<Response>, ms: number): Promise<Response> {
  return Promise.race([
    promise,
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function withRetry<T>(fn: () => Promise<T>, label: string, maxRetries: number): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const statusMatch = error.message?.match(/(\d{3})/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;
      const isRetryable =
        error.message?.includes("timed out") ||
        error.message?.includes("fetch failed") ||
        [429, 500, 502, 503, 504].includes(status);

      if (!isRetryable || attempt >= maxRetries) break;

      const delay = Math.min(500 * Math.pow(2, attempt) + Math.random() * 200, 5000);
      console.warn(`🔄 [${label}] Attempt ${attempt + 1}/${maxRetries} failed: ${error.message?.slice(0, 100)}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError!;
}

// Model mapping from OpenAI-style names to Lovable AI Gateway models
const MODEL_MAP: Record<string, string> = {
  "gpt-4o-mini": "google/gemini-2.5-flash",
  "gpt-4o": "google/gemini-2.5-pro",
  "gpt-5": "openai/gpt-5",
  "gpt-5.2": "openai/gpt-5.2",
};

/**
 * Call AI chat completions with automatic fallback from OpenAI to Lovable AI Gateway.
 * Supports both simple (messages array) and advanced (full body object) usage.
 */
export async function callAI(
  openaiApiKey: string | null,
  lovableApiKey: string | null,
  messages: Array<{ role: string; content: string }>,
  model = "gpt-4o-mini",
  options: CallAIOptions = {}
): Promise<string> {
  const temperature = options.temperature ?? 0.3;
  const max_tokens = options.max_tokens ?? 4096;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? 2;

  // gpt-5 series uses max_completion_tokens instead of max_tokens
  const isNewModel = model.startsWith("gpt-5");
  const body: Record<string, any> = isNewModel
    ? { model, messages, temperature, max_completion_tokens: max_tokens }
    : { model, messages, temperature, max_tokens };

  return withRetry(async () => {
    // Try OpenAI first (skip for gateway-only models like gpt-5.x)
    const isGatewayOnly = model.startsWith("gpt-5");
    if (openaiApiKey && !isGatewayOnly) {
      try {
        const res = await withTimeout(
          fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
          timeoutMs
        );
        if (res.ok) {
          const data = await res.json();
          return data.choices?.[0]?.message?.content || "";
        }
        const errText = await res.text();
        console.warn(`⚠️ OpenAI error ${res.status}: ${errText.slice(0, 200)}`);
        if (res.status !== 429 && res.status < 500) throw new Error(`OpenAI error: ${res.status}`);
      } catch (e: any) {
        if (e.message?.startsWith("OpenAI error:")) throw e;
        console.warn("⚠️ OpenAI failed, trying Lovable AI:", e.message);
      }
    }

    // Fallback to Lovable AI Gateway
    if (!lovableApiKey) throw new Error("No AI API key available");

    const fallbackModel = MODEL_MAP[model] || "google/gemini-2.5-flash";
    const fallbackBody = { ...body, model: fallbackModel };

    const res = await withTimeout(
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(fallbackBody),
      }),
      timeoutMs
    );

    if (res.status === 429) throw new Error("Rate limit exceeded (429)");
    if (res.status === 402) throw new Error("Payment required (402)");
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Lovable AI error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    console.log("✅ AI response received");
    return data.choices?.[0]?.message?.content || "";
  }, `AI:${model}`, maxRetries);
}

/**
 * Call AI chat completions returning the full response object (for advanced usage).
 * Used by whatsapp-webhook which needs the raw response structure.
 */
export async function callAIChatCompletions(
  openaiApiKey: string | null,
  lovableApiKey: string | null,
  body: Record<string, any>,
  options: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<any> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? 2;

  return withRetry(async () => {
    if (openaiApiKey) {
      try {
        const response = await withTimeout(
          fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
          timeoutMs
        );
        if (response.ok) return await response.json();

        const errorText = await response.text();
        console.warn(`⚠️ OpenAI API error ${response.status}: ${errorText.slice(0, 200)}`);
        if (response.status !== 429 && response.status < 500) {
          throw new Error(`OpenAI API error: ${response.status} - ${errorText.slice(0, 200)}`);
        }
        console.log("🔄 Falling back to Lovable AI Gateway...");
      } catch (e: any) {
        if (e.message?.startsWith("OpenAI API error:")) throw e;
        console.warn("⚠️ OpenAI request failed, trying Lovable AI:", e.message);
      }
    }

    if (!lovableApiKey) {
      throw new Error("No AI API key available (OpenAI failed and LOVABLE_API_KEY not configured)");
    }

    const modelMap: Record<string, string> = {
      "gpt-4o-mini": "google/gemini-2.5-flash",
      "gpt-4o": "google/gemini-2.5-flash",
    };
    const lovableModel = modelMap[body.model] || "google/gemini-2.5-flash";
    const lovableBody = { ...body, model: lovableModel };

    const response = await withTimeout(
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(lovableBody),
      }),
      timeoutMs
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Lovable AI Gateway error ${response.status}: ${errorText.slice(0, 200)}`);
      throw new Error(`Lovable AI Gateway error: ${response.status}`);
    }

    console.log("✅ AI response received");
    return await response.json();
  }, `AI:${body.model || "default"}`, maxRetries);
}

/**
 * Call AI embeddings (OpenAI only — not available via Lovable AI Gateway).
 */
export async function callAIEmbeddings(
  openaiApiKey: string | null,
  _lovableApiKey: string | null,
  input: string,
  dimensions: number = 768
): Promise<number[] | null> {
  if (openaiApiKey) {
    try {
      const response = await withTimeout(
        fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: input.slice(0, 8000),
            dimensions,
          }),
        }),
        DEFAULT_TIMEOUT_MS
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

  console.warn("⚠️ Embeddings not available via Lovable AI Gateway, skipping RAG search");
  return null;
}
