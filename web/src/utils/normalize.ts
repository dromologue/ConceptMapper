/**
 * Normalize key-value lines inside fenced code blocks.
 * Lines like "priority          critical" (no colon) become "priority: critical".
 * Only applies inside ``` fences, and only to lines matching "word whitespace+ value".
 * Lines that already have a colon are left unchanged.
 */
export function normalizeFencedKV(content: string): string {
  const lines = content.split("\n");
  let inFence = false;
  const result: string[] = [];
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      result.push(line);
      continue;
    }
    if (inFence && !line.includes(":") && !line.startsWith("#")) {
      // Match: "word  spaces  rest" where word is a valid key (letters, digits, underscores)
      const match = line.match(/^(\s*)([\w]+)\s{2,}(.+)$/);
      if (match) {
        const [, indent, key, value] = match;
        result.push(`${indent}${key}: ${value.trimEnd()}`);
        continue;
      }
    }
    result.push(line);
  }
  return result.join("\n");
}
