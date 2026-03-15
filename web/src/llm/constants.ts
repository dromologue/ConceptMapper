import type { LLMProviderType } from "../types/llm";

export interface ProviderDefault {
  model: string;
  baseUrl?: string;
  modelSuggestions: string[];
  keyPrefix?: string;
  keyFormatHint?: string;
  helpUrl?: string;
  setupSteps?: string[];
}

export const PROVIDER_DEFAULTS: Record<LLMProviderType, ProviderDefault> = {
  anthropic: {
    model: "claude-sonnet-4-20250514",
    modelSuggestions: [
      "claude-sonnet-4-20250514",
      "claude-opus-4-20250514",
      "claude-haiku-4-20250506",
    ],
    keyPrefix: "sk-ant-",
    keyFormatHint: "Starts with sk-ant-",
    helpUrl: "https://console.anthropic.com/settings/keys",
    setupSteps: [
      "Create a free account at console.anthropic.com",
      "Add a payment method (pay-as-you-go, ~$0.01/request)",
      "Click the link below to go straight to API Keys",
      "Create a new key and paste it here",
    ],
  },
  openai: {
    model: "gpt-4o",
    modelSuggestions: [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      "o1",
    ],
    keyPrefix: "sk-",
    keyFormatHint: "Starts with sk-",
    helpUrl: "https://platform.openai.com/api-keys",
    setupSteps: [
      "Create an account at platform.openai.com",
      "Add a payment method in Billing",
      "Click the link below to go to API Keys",
      "Create a new secret key and paste it here",
    ],
  },
  ollama: {
    model: "llama3.2",
    baseUrl: "http://localhost:11434",
    modelSuggestions: [
      "llama3.2",
      "mistral",
      "mixtral",
      "codellama",
      "phi3",
    ],
    setupSteps: [
      "Install Ollama from ollama.com",
      "Run: ollama pull llama3.2",
      "Ollama runs locally — no API key needed",
    ],
  },
};
