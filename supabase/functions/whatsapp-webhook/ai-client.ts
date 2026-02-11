// Re-export shared AI client for backward compatibility
// All AI logic is now centralized in _shared/ai-client.ts

export { callAIChatCompletions, callAIEmbeddings } from "../_shared/ai-client.ts";
