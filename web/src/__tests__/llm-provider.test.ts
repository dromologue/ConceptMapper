import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerLLMCallbacks, extractJSON, makeRequestId } from "../llm/provider";

describe("LLM Provider", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    cleanup = registerLLMCallbacks();
  });

  afterEach(() => {
    cleanup?.();
  });

  it("registers window.llmResponse and window.llmError callbacks", () => {
    const win = window as unknown as Record<string, unknown>;
    expect(typeof win.llmResponse).toBe("function");
    expect(typeof win.llmError).toBe("function");
  });

  it("cleans up callbacks on unmount", () => {
    cleanup?.();
    const win = window as unknown as Record<string, unknown>;
    expect(win.llmResponse).toBeUndefined();
    expect(win.llmError).toBeUndefined();
  });

  it("generates unique request IDs", () => {
    const id1 = makeRequestId();
    const id2 = makeRequestId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^req_/);
  });
});

describe("extractJSON", () => {
  it("extracts JSON from markdown fences", () => {
    const input = '```json\n{"nodes": []}\n```';
    expect(JSON.parse(extractJSON(input))).toEqual({ nodes: [] });
  });

  it("extracts JSON from plain text with surrounding content", () => {
    const input = 'Here is the result:\n{"version": "2.0", "nodes": []}\nDone.';
    const parsed = JSON.parse(extractJSON(input));
    expect(parsed.version).toBe("2.0");
  });

  it("handles clean JSON input", () => {
    const input = '{"test": true}';
    expect(JSON.parse(extractJSON(input))).toEqual({ test: true });
  });

  it("finds outermost braces for nested JSON", () => {
    const input = '{"outer": {"inner": true}}';
    const parsed = JSON.parse(extractJSON(input));
    expect(parsed.outer.inner).toBe(true);
  });
});
