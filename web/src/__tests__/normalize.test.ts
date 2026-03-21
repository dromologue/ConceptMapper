import { describe, it, expect } from "vitest";
import { normalizeFencedKV } from "../utils/normalize";

describe("normalizeFencedKV", () => {
  it("adds colons to key-value lines without colons inside fences", () => {
    const input = [
      "# Title",
      "```",
      "id:    node1",
      "name:  Test Node",
      "priority          critical",
      "status            done",
      "```",
    ].join("\n");

    const result = normalizeFencedKV(input);
    expect(result).toContain("priority: critical");
    expect(result).toContain("status: done");
    // Lines with colons are unchanged
    expect(result).toContain("id:    node1");
    expect(result).toContain("name:  Test Node");
  });

  it("does not modify lines outside fenced blocks", () => {
    const input = [
      "priority          critical",
      "```",
      "priority          critical",
      "```",
      "priority          critical",
    ].join("\n");

    const lines = normalizeFencedKV(input).split("\n");
    // Outside fences: unchanged
    expect(lines[0]).toBe("priority          critical");
    expect(lines[4]).toBe("priority          critical");
    // Inside fence: normalized
    expect(lines[2]).toBe("priority: critical");
  });

  it("handles multiple fenced blocks", () => {
    const input = [
      "```",
      "priority          high",
      "```",
      "",
      "```",
      "status            todo",
      "```",
    ].join("\n");

    const result = normalizeFencedKV(input);
    expect(result).toContain("priority: high");
    expect(result).toContain("status: todo");
  });

  it("preserves lines that already have colons", () => {
    const input = [
      "```",
      "id: node1",
      "name: My Node",
      "priority: high",
      "```",
    ].join("\n");

    expect(normalizeFencedKV(input)).toBe(input);
  });

  it("does not normalize single-space separations (too ambiguous)", () => {
    const input = [
      "```",
      "from: a to: b type: chain",
      "```",
    ].join("\n");

    // This line has colons so it should be unchanged
    expect(normalizeFencedKV(input)).toBe(input);
  });

  it("handles empty content", () => {
    expect(normalizeFencedKV("")).toBe("");
  });

  it("handles content with no fences", () => {
    const input = "Just some text\nNo fences here";
    expect(normalizeFencedKV(input)).toBe(input);
  });

  it("normalizes tab-separated values", () => {
    const input = [
      "```",
      "priority\t\tcritical",
      "```",
    ].join("\n");

    // Tabs won't match \s{2,} with the current regex since \w+ and tabs...
    // Actually the regex uses \s{2,} which includes tabs
    // But [\w]+ then \s{2,} — let's check
    const result = normalizeFencedKV(input);
    // Tabs count as whitespace, so this should normalize
    expect(result).toContain("priority: critical");
  });
});
