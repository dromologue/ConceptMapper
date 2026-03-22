import type { LLMConfig, LLMRequest } from "../types/llm";
import { registerBridgeCallbacks, createLLMClient } from "./client";

interface BridgeOptions {
  isNativeApp: boolean;
  sendToSwift: (handler: string, payload?: unknown) => void;
}

// Re-export for backward compatibility
export const registerLLMCallbacks = registerBridgeCallbacks;

/**
 * Send a message to the LLM via the appropriate client.
 */
export function sendLLMMessage(
  config: LLMConfig,
  request: LLMRequest,
  options: BridgeOptions,
): Promise<string> {
  const client = createLLMClient(options.isNativeApp, config.provider, options.sendToSwift);
  return client.sendMessage(config, request);
}

/** Generate a unique request ID */
export function makeRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Extract JSON from LLM response (strips markdown fences, finds {...} boundaries) */
export function extractJSON(text: string): string {
  // Strip markdown code fences
  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "");

  // Find the first { and last } for JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return cleaned.slice(start, end + 1);
  }

  return cleaned.trim();
}
