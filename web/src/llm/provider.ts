import type { LLMConfig, LLMRequest } from "../types/llm";

interface BridgeOptions {
  isNativeApp: boolean;
  sendToSwift: (handler: string, payload?: unknown) => void;
}

// Pending request resolvers keyed by requestId
const pendingRequests = new Map<string, { resolve: (content: string) => void; reject: (error: Error) => void }>();

// Register global callbacks (called once from App.tsx)
export function registerLLMCallbacks() {
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

/**
 * Send a message to the LLM via the Swift bridge (native) or direct fetch (browser/Ollama only).
 */
export function sendLLMMessage(
  config: LLMConfig,
  request: LLMRequest,
  options: BridgeOptions,
): Promise<string> {
  if (options.isNativeApp) {
    return sendViaBridge(config, request, options.sendToSwift);
  }
  // Browser: only Ollama works (no CORS for Anthropic/OpenAI)
  if (config.provider === "ollama") {
    return sendDirectOllama(config, request);
  }
  return Promise.reject(new Error("Browser mode only supports Ollama. Use the macOS app for Anthropic/OpenAI."));
}

function sendViaBridge(
  config: LLMConfig,
  request: LLMRequest,
  sendToSwift: (handler: string, payload?: unknown) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    pendingRequests.set(request.requestId, { resolve, reject });

    const messages = request.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    sendToSwift("llmChat", JSON.stringify({
      config: JSON.stringify(config),
      messages: JSON.stringify(messages),
      systemPrompt: request.systemPrompt ?? null,
      requestId: request.requestId,
    }));

    // Timeout after 2 minutes
    setTimeout(() => {
      if (pendingRequests.has(request.requestId)) {
        pendingRequests.delete(request.requestId);
        reject(new Error("LLM request timed out"));
      }
    }, 120_000);
  });
}

async function sendDirectOllama(config: LLMConfig, request: LLMRequest): Promise<string> {
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

/** Generate a unique request ID */
export function makeRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Extract JSON from LLM response (strips markdown fences, finds {...} boundaries) */
export function extractJSON(text: string): string {
  // Strip markdown code fences
  let cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "");

  // Find the first { and last } for JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return cleaned.slice(start, end + 1);
  }

  return cleaned.trim();
}
