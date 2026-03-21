import type { LLMConfig, LLMRequest } from "../types/llm";

export interface LLMClient {
  sendMessage(config: LLMConfig, request: LLMRequest): Promise<string>;
}

// Pending request resolvers keyed by requestId
const pendingRequests = new Map<string, { resolve: (content: string) => void; reject: (error: Error) => void }>();

/** Register global callbacks for Swift bridge responses. Call once on startup. */
export function registerBridgeCallbacks() {
  const win = window as unknown as Record<string, unknown>;

  win.llmResponse = (data: { requestId: string; content: string }) => {
    const pending = pendingRequests.get(data.requestId);
    if (pending) {
      pending.resolve(data.content);
      pendingRequests.delete(data.requestId);
    }
  };

  win.llmError = (data: { requestId: string; error: string }) => {
    const pending = pendingRequests.get(data.requestId);
    if (pending) {
      pending.reject(new Error(data.error));
      pendingRequests.delete(data.requestId);
    }
  };

  return () => {
    delete win.llmResponse;
    delete win.llmError;
    pendingRequests.clear();
  };
}

/** Swift bridge client — sends via WKWebView message handlers */
export class BridgeLLMClient implements LLMClient {
  private sendToSwift: (handler: string, payload?: unknown) => void;

  constructor(sendToSwift: (handler: string, payload?: unknown) => void) {
    this.sendToSwift = sendToSwift;
  }

  sendMessage(config: LLMConfig, request: LLMRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      pendingRequests.set(request.requestId, { resolve, reject });

      const messages = request.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));

      this.sendToSwift("llmChat", JSON.stringify({
        config: JSON.stringify(config),
        messages: JSON.stringify(messages),
        systemPrompt: request.systemPrompt ?? null,
        requestId: request.requestId,
      }));

      setTimeout(() => {
        if (pendingRequests.has(request.requestId)) {
          pendingRequests.delete(request.requestId);
          reject(new Error("LLM request timed out"));
        }
      }, 120_000);
    });
  }
}

/** Direct HTTP client for Ollama (browser-compatible, no CORS issues) */
export class OllamaLLMClient implements LLMClient {
  async sendMessage(config: LLMConfig, request: LLMRequest): Promise<string> {
    const endpoint = config.baseUrl ?? "http://localhost:11434";

    const messages: { role: string; content: string }[] = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    for (const m of request.messages) {
      if (m.role !== "system") {
        messages.push({ role: m.role, content: m.content });
      }
    }

    const res = await fetch(`${endpoint}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        options: { temperature: config.temperature ?? 0.3 },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama error: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.message?.content ?? "";
  }
}

/** Creates the appropriate LLM client based on environment */
export function createLLMClient(
  isNativeApp: boolean,
  provider: string,
  sendToSwift: (handler: string, payload?: unknown) => void,
): LLMClient {
  if (isNativeApp) return new BridgeLLMClient(sendToSwift);
  if (provider === "ollama") return new OllamaLLMClient();
  return {
    sendMessage: () => Promise.reject(new Error("Browser mode only supports Ollama. Use the macOS app for Anthropic/OpenAI.")),
  };
}
