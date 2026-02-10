// Retry utility with exponential backoff

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a retryable HTTP status error
      const statusMatch = error.message?.match(/(\d{3})/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;
      const isRetryable =
        error.message?.includes("timed out") ||
        error.message?.includes("fetch failed") ||
        opts.retryableStatuses.includes(status);

      if (!isRetryable || attempt >= opts.maxRetries) {
        break;
      }

      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 200,
        opts.maxDelayMs
      );
      console.warn(
        `🔄 [${label}] Attempt ${attempt + 1}/${opts.maxRetries} failed: ${error.message?.slice(0, 100)}. Retrying in ${Math.round(delay)}ms...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError!;
}
