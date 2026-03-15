export type LLMProviderType = "anthropic" | "openai" | "gemini" | "ollama";

export interface LLMConfig {
  provider: LLMProviderType;
  apiKey?: string;
  model: string;
  baseUrl?: string;
  temperature?: number;
}

export interface AppConfig {
  llm?: LLMConfig;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface LLMRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  context?: string;
  requestId: string;
}
