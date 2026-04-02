/**
 * Typed bridge between the React SPA and the Swift WKWebView host.
 *
 * All window-level functions that Swift calls are registered here,
 * keeping App.tsx free of raw window mutations.
 */

import type { GraphIR, ConceptMapData, TaxonomyTemplate, NodeTypeConfig } from "../types/graph-ir";
import type { FilterState } from "./filters";
import type { TaxonomyWizardInitial } from "../ui/TaxonomyWizard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Callbacks and state that the bridge needs from the React app. */
export interface SwiftBridgeDeps {
  // Loaders
  loadFileContent: (content: string, filename: string, filePath?: string) => void;
  parseMarkdown: (input: string) => { graph: GraphIR };
  migrateFromParser: (data: GraphIR, tmpl?: TaxonomyTemplate | null) => { template: TaxonomyTemplate; data: ConceptMapData };
  graphIRFromData: (template: TaxonomyTemplate, data: ConceptMapData) => GraphIR;
  normalizeFencedKV: (input: string) => string;

  // Setters
  setGraphData: (ir: GraphIR) => void;
  setTemplate: (t: TaxonomyTemplate | null) => void;
  setSelectedNode: (n: null) => void;
  setRevealedNodes: (s: Set<string>) => void;
  setFilters: (f: FilterState) => void;
  setError: (e: string | null) => void;
  setSourceFilePath: (p: string | null) => void;
  setEdgeColorOverrides: (c: Record<string, string>) => void;
  setShowTaxonomyWizard: (v: boolean) => void;
  setNativeMaps: (maps: { name: string; path: string }[]) => void;
  setLoadedNativeTemplates: (updater: (prev: Map<string, TaxonomyWizardInitial>) => Map<string, TaxonomyWizardInitial>) => void;

  // Getters (called synchronously by Swift)
  getGraphData: () => GraphIR | null;
  getNodeTypeConfigs: () => NodeTypeConfig[];
  getEdgeColorOverrides: () => Record<string, string>;
  exportToMarkdown: (data: GraphIR, configs: NodeTypeConfig[], overrides?: Record<string, string>) => string;

  // Factory
  createEmptyFilterState: () => FilterState;
}

/** Post a message to the Swift WKWebView bridge (no-op outside macOS app). */
export function postToSwift(handler: string, message: unknown): void {
  const webkit = (window as unknown as Record<string, unknown>).webkit as
    | { messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }> }
    | undefined;
  webkit?.messageHandlers?.[handler]?.postMessage(message);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all bridge functions on the window object so that Swift can call
 * them via evaluateJavaScript. Returns a cleanup function that removes them.
 */
export function registerSwiftBridge(deps: SwiftBridgeDeps): () => void {
  const win = window as unknown as Record<string, unknown>;

  win.loadFileContentBase64 = (base64: string, filename: string, filePath?: string) => {
    try {
      const content = atob(base64);
      const bytes = Uint8Array.from(content, (c) => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      // Restore edge colors from .cm header
      const ecMatch = decoded.match(/<!--\s*edge-colors:\s*(\{.+?\})\s*-->/);
      if (ecMatch) {
        try { deps.setEdgeColorOverrides(JSON.parse(ecMatch[1])); } catch { /* ignore */ }
      } else {
        deps.setEdgeColorOverrides({});
      }
      deps.loadFileContent(decoded, filename, filePath);
    } catch (err) {
      console.error("[Bridge] decode error:", err);
    }
  };

  win.loadMapWithTemplate = (mapBase64: string, _filename: string, filePath: string, tmplBase64: string) => {
    try {
      const mapBytes = Uint8Array.from(atob(mapBase64), (c) => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(mapBytes);
      let tmpl: TaxonomyTemplate | null = null;
      if (tmplBase64) {
        try {
          const tmplBytes = Uint8Array.from(atob(tmplBase64), (c) => c.charCodeAt(0));
          const tmplStr = new TextDecoder().decode(tmplBytes);
          if (tmplStr !== "null") tmpl = JSON.parse(tmplStr) as TaxonomyTemplate;
        } catch { /* ignore */ }
      }
      const normalized = deps.normalizeFencedKV(decoded);
      const result = deps.parseMarkdown(normalized);
      const data = result.graph;
      if (data.nodes.length > 0) {
        const { template: migratedTemplate, data: migratedData } = deps.migrateFromParser(data, tmpl);
        const ir = deps.graphIRFromData(migratedTemplate, migratedData);
        const tmplMatch = decoded.match(/<!--\s*template:\s*(.+?)\s*-->/i);
        const tmplRef = tmplMatch?.[1]?.trim();
        if (tmplRef) ir.metadata.source_template = tmplRef.endsWith(".cmt") ? tmplRef : `${tmplRef}.cmt`;
        const edgeColorsMatch = decoded.match(/<!--\s*edge-colors:\s*(\{.+?\})\s*-->/);
        if (edgeColorsMatch) {
          try { deps.setEdgeColorOverrides(JSON.parse(edgeColorsMatch[1]) as Record<string, string>); } catch { /* ignore */ }
        } else {
          deps.setEdgeColorOverrides({});
        }
        deps.setGraphData(ir);
        deps.setTemplate(migratedTemplate);
        deps.setSelectedNode(null);
        deps.setRevealedNodes(new Set());
        deps.setFilters(deps.createEmptyFilterState());
        deps.setError(null);
        deps.setSourceFilePath(filePath ?? null);
      }
    } catch (err) {
      console.error("[Bridge] loadMapWithTemplate error:", err);
    }
  };

  win.getGraphJSON = (): string => {
    const graphData = deps.getGraphData();
    if (!graphData) return "";
    return deps.exportToMarkdown(graphData, deps.getNodeTypeConfigs(), deps.getEdgeColorOverrides());
  };

  win.getGraphMarkdown = (): string => {
    const graphData = deps.getGraphData();
    if (!graphData) return "";
    return deps.exportToMarkdown(graphData, deps.getNodeTypeConfigs(), deps.getEdgeColorOverrides());
  };

  win.getCanvasImage = (): string => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  };

  win.taxonomySaved = (filePath: string) => {
    deps.setSourceFilePath(filePath);
  };

  win.showTaxonomyWizard = () => {
    deps.setShowTaxonomyWizard(true);
  };

  win.templatesLoaded = (json: string) => {
    try {
      const list = JSON.parse(json) as { name: string; path: string }[];
      for (const t of list) {
        postToSwift("loadTemplate", JSON.stringify({ path: t.path }));
      }
    } catch (err) {
      console.error("Templates load error:", err);
    }
  };

  win.templateLoaded = (json: string) => {
    try {
      const tmpl = JSON.parse(json) as TaxonomyTemplate;
      if (deps.getGraphData()) {
        deps.setTemplate(tmpl);
      }
      deps.setLoadedNativeTemplates((prev) => {
        const next = new Map(prev);
        next.set(tmpl.title, {
          title: tmpl.title,
          description: tmpl.description,
          streams: tmpl.streams ?? [],
          generations: tmpl.generations ?? [],
          node_types: tmpl.node_types,
        });
        return next;
      });
    } catch (err) {
      console.error("Template load error:", err);
    }
  };

  win.mapsLoaded = (json: string) => {
    try {
      const list = JSON.parse(json) as { name: string; path: string }[];
      deps.setNativeMaps(list);
    } catch (err) {
      console.error("Maps load error:", err);
    }
  };

  // Cleanup: remove all bridge functions from window
  return () => {
    delete win.loadFileContentBase64;
    delete win.loadMapWithTemplate;
    delete win.getGraphJSON;
    delete win.getGraphMarkdown;
    delete win.getCanvasImage;
    delete win.taxonomySaved;
    delete win.showTaxonomyWizard;
    delete win.templatesLoaded;
    delete win.templateLoaded;
    delete win.mapsLoaded;
  };
}
