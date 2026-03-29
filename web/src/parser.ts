import type { GraphIR } from "./types/graph-ir";

let wasmModule: typeof import("./wasm/concept_mapper_core") | null = null;

// Vite inlines this as a base64 data URL since assetsInlineLimit is lifted for this import
import wasmBinaryUrl from "./wasm/concept_mapper_core_bg.wasm?url";

interface ParseOutput {
  graph: GraphIR;
  warnings: { line: number; message: string }[];
}

/**
 * Initialize the WASM parser module.
 */
export async function initParser(): Promise<void> {
  if (wasmModule) return;
  try {
    const mod = await import("./wasm/concept_mapper_core");

    // Load WASM binary via XHR (works on both http:// and file://)
    const wasmBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", wasmBinaryUrl, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = () => {
        if (xhr.response && xhr.response.byteLength > 0) {
          resolve(xhr.response as ArrayBuffer);
        } else {
          reject(new Error("WASM binary is empty"));
        }
      };
      xhr.onerror = () => reject(new Error("Failed to load WASM binary via XHR"));
      xhr.send();
    });

    mod.initSync({ module: wasmBytes });
    wasmModule = mod;
  } catch (err) {
    throw new Error(
      `Failed to initialize the concept map parser. ` +
      `This may be caused by a browser that doesn't support WebAssembly. ` +
      `Original error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function parseMarkdown(content: string): ParseOutput {
  if (!wasmModule) {
    throw new Error("WASM parser not initialized. Call initParser() first.");
  }
  const jsonStr = wasmModule.parse_markdown_to_json(content);
  return JSON.parse(jsonStr) as ParseOutput;
}

export function parseJsonFile(content: string): GraphIR {
  return JSON.parse(content) as GraphIR;
}
