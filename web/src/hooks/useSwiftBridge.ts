/**
 * React hook that installs the typed Swift bridge and routes Swift→JS events
 * to the React app. Owns the lifecycle of:
 *   - `window.__bridge_receive` (single inbound channel)
 *   - sync getters (`getGraphMarkdown`, `getCanvasImage`)
 *   - event subscribers (fileLoaded, mapLoaded, templatesAvailable, ...)
 *
 * App.tsx provides the dependencies via a single ref so subscribers always see
 * fresh values without re-installing on every render.
 */

import { useEffect, useRef } from "react";
import { installBridgeReceiver, postToSwift, registerSyncGetters, subscribe } from "../utils/swiftBridge";
import { parseViewComment } from "../utils/viewOptions";
import type { Classifier, ConceptMapData, GraphIR, LayoutPreset, NodeTypeConfig, TaxonomyTemplate } from "../types/graph-ir";
import type { FilterState } from "../utils/filters";
import type { TaxonomyWizardInitial } from "../ui/TaxonomyWizard";

export interface SwiftBridgeDeps {
  // File-loading pipeline
  loadFileContent: (content: string, filename: string, filePath?: string) => void;
  parseMarkdown: (input: string) => { graph: GraphIR };
  migrateFromParser: (data: GraphIR, tmpl?: TaxonomyTemplate | null) => { template: TaxonomyTemplate; data: ConceptMapData };
  graphIRFromData: (template: TaxonomyTemplate, data: ConceptMapData) => GraphIR;
  normalizeFencedKV: (input: string) => string;

  // Setters
  setEdgeColorOverrides: (c: Record<string, string>) => void;
  loadGraphFresh: (ir: GraphIR | null) => void;
  setTemplate: (t: TaxonomyTemplate | null) => void;
  setSelectedNodeNull: () => void;
  setRevealedNodesEmpty: () => void;
  setFilters: (f: FilterState) => void;
  setError: (e: string | null) => void;
  setSourceFilePath: (p: string | null) => void;
  setLayoutPreset: (p: LayoutPreset) => void;
  setShowTaxonomyWizard: (v: boolean) => void;
  setNativeMaps: (maps: { name: string; path: string }[]) => void;
  setLoadedNativeTemplates: (updater: (prev: Map<string, TaxonomyWizardInitial>) => Map<string, TaxonomyWizardInitial>) => void;

  // Getters (called synchronously when Swift requests the current state)
  getGraphData: () => GraphIR | null;
  getNodeTypeConfigs: () => NodeTypeConfig[];
  getEdgeColorOverrides: () => Record<string, string>;
  getLayoutPreset: () => LayoutPreset;
  exportToMarkdown: (data: GraphIR, configs: NodeTypeConfig[], overrides?: Record<string, string>, layoutPreset?: LayoutPreset) => string;

  // Factories
  createEmptyFilterState: () => FilterState;
}

export function useSwiftBridge(deps: SwiftBridgeDeps): void {
  // Hold the latest deps in a ref so the bridge handlers (installed once)
  // always see fresh closures without re-installing the listeners on every
  // App render.
  const depsRef = useRef(deps);
  useEffect(() => {
    depsRef.current = deps;
  }, [deps]);

  useEffect(() => {
    const uninstalls: Array<() => void> = [];

    uninstalls.push(installBridgeReceiver());
    uninstalls.push(registerSyncGetters({
      getGraphMarkdown: () => {
        const d = depsRef.current;
        const g = d.getGraphData();
        if (!g) return "";
        return d.exportToMarkdown(g, d.getNodeTypeConfigs(), d.getEdgeColorOverrides(), d.getLayoutPreset());
      },
      getCanvasImage: () => {
        const canvas = document.querySelector("canvas");
        return canvas ? canvas.toDataURL("image/png") : "";
      },
    }));

    uninstalls.push(subscribe("fileLoaded", (p) => {
      const d = depsRef.current;
      const decoded = base64ToUtf8(p.content);
      const ecMatch = decoded.match(/<!--\s*edge-colors:\s*(\{.+?\})\s*-->/);
      if (ecMatch) {
        try { d.setEdgeColorOverrides(JSON.parse(ecMatch[1])); } catch { /* ignore */ }
      } else {
        d.setEdgeColorOverrides({});
      }
      d.loadFileContent(decoded, p.filename, p.filePath ?? undefined);
    }));

    uninstalls.push(subscribe("mapLoaded", (p) => {
      const d = depsRef.current;
      try {
        const decoded = base64ToUtf8(p.mapContent);
        let tmpl: TaxonomyTemplate | null = null;
        if (p.templateContent) {
          const tmplStr = base64ToUtf8(p.templateContent);
          if (tmplStr && tmplStr !== "null") tmpl = JSON.parse(tmplStr) as TaxonomyTemplate;
        }
        const normalized = d.normalizeFencedKV(decoded);
        const result = d.parseMarkdown(normalized);
        const data = result.graph;
        if (data.nodes.length === 0) return;
        const { template: migratedTemplate, data: migratedData } = d.migrateFromParser(data, tmpl);
        const ir = d.graphIRFromData(migratedTemplate, migratedData);
        const tmplMatch = decoded.match(/<!--\s*template:\s*(.+?)\s*-->/i);
        const tmplRef = tmplMatch?.[1]?.trim();
        if (tmplRef) ir.metadata.source_template = tmplRef.endsWith(".cmt") ? tmplRef : `${tmplRef}.cmt`;
        const edgeColorsMatch = decoded.match(/<!--\s*edge-colors:\s*(\{.+?\})\s*-->/);
        if (edgeColorsMatch) {
          try { d.setEdgeColorOverrides(JSON.parse(edgeColorsMatch[1]) as Record<string, string>); } catch { /* ignore */ }
        } else {
          d.setEdgeColorOverrides({});
        }
        // Restore saved view options: layout preset + per-attribute classifier
        // layouts (see utils/viewOptions).
        const view = parseViewComment(decoded);
        d.setLayoutPreset(view?.layout ?? "force");
        // When a view was saved it is authoritative for classifier layouts:
        // apply to the IR (which drives rendering) and the template.
        if (view) {
          const layouts = view.classifierLayouts ?? {};
          const applyTo = (cs?: Classifier[]) =>
            cs?.map((c) => ({ ...c, layout: layouts[c.id] as Classifier["layout"] }));
          const reIr = applyTo(ir.metadata.classifiers);
          if (reIr) ir.metadata.classifiers = reIr;
          const reTmpl = applyTo(migratedTemplate.classifiers);
          if (reTmpl) migratedTemplate.classifiers = reTmpl;
        }
        d.loadGraphFresh(ir);
        d.setTemplate(migratedTemplate);
        d.setSelectedNodeNull();
        d.setRevealedNodesEmpty();
        d.setFilters(d.createEmptyFilterState());
        d.setError(null);
        d.setSourceFilePath(p.filePath ?? null);
      } catch (err) {
        console.error("[Bridge] mapLoaded handler error:", err);
      }
    }));

    uninstalls.push(subscribe("templatesAvailable", (p) => {
      // Each template still needs its content fetched (the catalogue only
      // carries name + path). Request them one by one.
      for (const t of p.templates) {
        postToSwift("loadTemplate", { path: t.path });
      }
    }));

    uninstalls.push(subscribe("templateAvailable", (p) => {
      const d = depsRef.current;
      try {
        const tmpl = JSON.parse(p.content) as TaxonomyTemplate;
        if (d.getGraphData()) {
          d.setTemplate(tmpl);
        }
        d.setLoadedNativeTemplates((prev) => {
          const next = new Map(prev);
          next.set(tmpl.title, {
            title: tmpl.title,
            description: tmpl.description,
            classifiers: tmpl.classifiers,
            node_types: tmpl.node_types,
            edge_types: tmpl.edge_types,
          });
          return next;
        });
      } catch (err) {
        console.error("[Bridge] templateAvailable parse error:", err);
      }
    }));

    uninstalls.push(subscribe("mapsAvailable", (p) => {
      depsRef.current.setNativeMaps(p.maps);
    }));

    uninstalls.push(subscribe("taxonomySaved", (p) => {
      depsRef.current.setSourceFilePath(p.path);
    }));

    uninstalls.push(subscribe("showTaxonomyWizard", () => {
      depsRef.current.setShowTaxonomyWizard(true);
    }));

    uninstalls.push(subscribe("notesFileAttached", (p) => {
      window.dispatchEvent(new CustomEvent("notesFileAttached", { detail: p }));
    }));

    uninstalls.push(subscribe("notesFileRead", (p) => {
      window.dispatchEvent(new CustomEvent("notesFileRead", { detail: p }));
    }));

    return () => {
      for (const u of uninstalls.reverse()) u();
    };
  }, []);
}

function base64ToUtf8(b64: string): string {
  if (!b64) return "";
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
