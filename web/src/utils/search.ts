import type { GraphNode } from "../types/graph-ir";

const MAX_RESULTS = 20;

/**
 * Build a single lowercase corpus string from all searchable fields on a node.
 * All taxonomy attributes are included: name, node_type, tags, classifier values,
 * property values (strings, arrays, numbers), and inline notes.
 */
function buildCorpus(node: GraphNode): string {
  const parts: string[] = [node.name, node.node_type];

  if (node.tags) {
    parts.push(...node.tags);
  }

  if (node.classifiers) {
    parts.push(...Object.values(node.classifiers));
  }

  if (node.properties) {
    for (const v of Object.values(node.properties)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) {
        parts.push(...v.map(String));
      } else {
        parts.push(String(v));
      }
    }
  }

  if (node.notes) {
    parts.push(node.notes);
  }

  return parts.join(" ").toLowerCase();
}

/**
 * Parse a query into tokens. Quoted substrings ("like this") are treated as
 * exact phrases (including internal spaces). Unquoted runs are split on whitespace
 * into individual word tokens.
 *
 * All tokens and phrases are matched as substrings against the node corpus.
 * A node matches when EVERY token / phrase is present in its corpus.
 */
function parseTokens(query: string): string[] {
  const tokens: string[] = [];
  const quotedRe = /"([^"]*)"/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = quotedRe.exec(query)) !== null) {
    // Words before this quoted phrase
    const before = query.slice(lastIndex, m.index).trim();
    if (before) {
      tokens.push(...before.split(/\s+/).filter(Boolean));
    }
    // The quoted phrase itself (may be empty string)
    const phrase = m[1].trim();
    if (phrase) tokens.push(phrase);
    lastIndex = quotedRe.lastIndex;
  }

  // Remaining text after the last quote
  const tail = query.slice(lastIndex).trim();
  if (tail) {
    tokens.push(...tail.split(/\s+/).filter(Boolean));
  }

  return tokens.map((t) => t.toLowerCase()).filter(Boolean);
}

/**
 * Search a list of nodes against a query string.
 *
 * - Quoted substrings are matched as exact phrases.
 * - Unquoted words are matched as individual substrings (AND semantics).
 * - All taxonomy attributes are searched: name, node_type, tags, classifier values,
 *   all property values, and inline notes.
 *
 * Returns up to MAX_RESULTS matches in original array order.
 */
export function searchNodes(nodes: GraphNode[], query: string, limit = MAX_RESULTS): GraphNode[] {
  const q = query.trim();
  if (!q) return [];

  const tokens = parseTokens(q);
  if (tokens.length === 0) return [];

  const results: GraphNode[] = [];
  for (const node of nodes) {
    if (results.length >= limit) break;
    const corpus = buildCorpus(node);
    if (tokens.every((token) => corpus.includes(token))) {
      results.push(node);
    }
  }
  return results;
}
