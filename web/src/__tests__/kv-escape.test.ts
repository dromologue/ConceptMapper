import { describe, it, expect } from "vitest";
import { escapeKVValue, unescapeKVValue } from "../utils/kv-escape";

describe("escapeKVValue / unescapeKVValue", () => {
  it("passes plain strings through unchanged", () => {
    expect(escapeKVValue("hello world")).toBe("hello world");
    expect(unescapeKVValue("hello world")).toBe("hello world");
  });

  it("escapes a single newline as backslash-n", () => {
    expect(escapeKVValue("a\nb")).toBe("a\\nb");
    expect(unescapeKVValue("a\\nb")).toBe("a\nb");
  });

  it("normalises CRLF to LF before encoding", () => {
    expect(escapeKVValue("a\r\nb")).toBe("a\\nb");
  });

  it("escapes literal backslash so the decoder can disambiguate", () => {
    expect(escapeKVValue("a\\b")).toBe("a\\\\b");
    expect(unescapeKVValue("a\\\\b")).toBe("a\\b");
  });

  it("preserves a literal '\\n' typed by the user (backslash + n, not a newline)", () => {
    // User types two chars: backslash, n. We must round-trip without converting
    // to a newline.
    const original = "see: a\\n then b";
    const round = unescapeKVValue(escapeKVValue(original));
    expect(round).toBe(original);
  });

  it("round-trips multi-line notes (the user-reported regression)", () => {
    const notes = "- top item\n  - child item\n  - another\n- second top";
    const round = unescapeKVValue(escapeKVValue(notes));
    expect(round).toBe(notes);
  });

  it("encodes to a string with no newline characters", () => {
    const encoded = escapeKVValue("line one\nline two\nline three");
    expect(encoded).not.toContain("\n");
    expect(encoded).toBe("line one\\nline two\\nline three");
  });
});
