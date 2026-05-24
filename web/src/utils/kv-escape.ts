// Round-trip-safe encoding for `key: value` lines inside .cm node blocks.
// The parser splits each line on the first colon, so values containing
// newlines (multi-line notes, textarea fields) or literal backslash-n
// sequences need escaping. We use a minimal two-rule escape:
//   `\` → `\\`   (must come first on encode, last on decode)
//   `\n` → `\\n`
// Carriage returns are normalised to LF before encoding.

export function escapeKVValue(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n");
}

export function unescapeKVValue(s: string): string {
  // Walk char-by-char so `\\n` (literal backslash + n) decodes as `\n` (two
  // chars), not a newline. A bare `\\\\n` (escaped backslash + n) decodes
  // as `\n` (literal backslash + n) — also correct.
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === "n") { out += "\n"; i++; continue; }
      if (next === "\\") { out += "\\"; i++; continue; }
    }
    out += s[i];
  }
  return out;
}
