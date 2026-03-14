import type { GraphIR } from "./types/graph-ir";

// Dynamic import of the WASM module — resolved at build time by Vite
let wasmModule: typeof import("./wasm/concept_mapper_core") | null = null;

interface ParseOutput {
  graph: GraphIR;
  warnings: { line: number; message: string }[];
}

/**
 * Initialize the WASM parser module. Call once on app startup.
 */
export async function initParser(): Promise<void> {
  if (wasmModule) return;
  const mod = await import("./wasm/concept_mapper_core");
  await mod.default(); // Initialize WASM
  wasmModule = mod;
}

/**
 * Parse a markdown taxonomy document into GraphIR using the Rust WASM parser.
 * Throws if the parser hasn't been initialized or if the document has errors.
 */
export function parseMarkdown(content: string): ParseOutput {
  if (!wasmModule) {
    throw new Error("WASM parser not initialized. Call initParser() first.");
  }
  const jsonStr = wasmModule.parse_markdown_to_json(content);
  return JSON.parse(jsonStr) as ParseOutput;
}

/**
 * Parse a JSON file directly into GraphIR (no WASM needed).
 */
export function parseJsonFile(content: string): GraphIR {
  return JSON.parse(content) as GraphIR;
}
