import { useEffect, useState, useCallback } from "react";
import type { GraphIR, TaxonomyTemplate, ConceptMapData } from "../types/graph-ir";
import { initParser, parseMarkdown } from "../parser";
import { DEFAULT_NODE_TYPES, migrateFromParser, graphIRFromData } from "../migration";
import { normalizeFencedKV } from "../utils/normalize";

/**
 * Hook that manages WASM parser initialization and .cm/.cmt file loading.
 * Extracts file-loading concerns from App.tsx.
 */
/** Validate that map data matches the template's field definitions. */
function validateMapAgainstTemplate(ir: GraphIR, tmpl: TaxonomyTemplate): string[] {
  const warnings: string[] = [];
  const nodeTypes = tmpl.node_types ?? [];
  const configByType = new Map(nodeTypes.map((c) => [c.id, c]));

  for (const node of ir.nodes) {
    const config = configByType.get(node.node_type);
    if (!config) continue; // unknown node type — not a validation error here

    const templateKeys = new Set(config.fields.map((f) => f.key));
    const nodeKeys = Object.keys(node.properties ?? {});

    // Properties on node not in template
    for (const key of nodeKeys) {
      if (!templateKeys.has(key)) {
        warnings.push(`Node "${node.name}" (${node.node_type}): property "${key}" is not defined in template`);
      }
    }
  }

  // Check template fields missing from ALL nodes of that type
  const nodesByType = new Map<string, typeof ir.nodes>();
  for (const n of ir.nodes) {
    const list = nodesByType.get(n.node_type) ?? [];
    list.push(n);
    nodesByType.set(n.node_type, list);
  }
  for (const config of nodeTypes) {
    const typeNodes = nodesByType.get(config.id) ?? [];
    if (typeNodes.length === 0) continue;
    for (const field of config.fields) {
      if (!field.required) continue;
      const missing = typeNodes.filter((n) => {
        const val = (n.properties ?? {})[field.key];
        return val == null || val === "";
      });
      if (missing.length > 0) {
        warnings.push(`${missing.length} ${config.id} node(s) missing required field "${field.label}"`);
      }
    }
  }

  // Deduplicate similar warnings (group by property name)
  const propWarnings = new Map<string, number>();
  const otherWarnings: string[] = [];
  for (const w of warnings) {
    const match = w.match(/property "(.+)" is not defined/);
    if (match) {
      propWarnings.set(match[1], (propWarnings.get(match[1]) ?? 0) + 1);
    } else {
      otherWarnings.push(w);
    }
  }
  const deduped: string[] = [];
  for (const [prop, count] of propWarnings) {
    deduped.push(`${count} node(s) have property "${prop}" which is not defined in template`);
  }
  return [...deduped, ...otherWarnings];
}

export function useFileLoader(
  template: TaxonomyTemplate | null,
  setGraphData: (data: GraphIR | null) => void,
  setTemplate: (tmpl: TaxonomyTemplate | null) => void,
  resetUI: () => void,
  setSourceFilePath: (path: string | null) => void,
) {
  const [parserReady, setParserReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);

  // Initialize WASM parser on startup
  useEffect(() => {
    initParser()
      .then(() => setParserReady(true))
      .catch((err) => setError(`Failed to load parser: ${err.message}`));
  }, []);

  // Load file content — called from Swift bridge or internal file input
  const loadFileContent = useCallback(
    (content: string, filename: string, filePath?: string) => {
      try {
        // Try markdown parser first (primary format for .cm files)
        if (!content.trimStart().startsWith("{")) {
          const normalized = normalizeFencedKV(content);
          const result = parseMarkdown(normalized);
          const data = result.graph;
          if (result.warnings.length > 0) {
            console.warn("Parse warnings:", result.warnings.map((w) => `line ${w.line}: ${w.message}`));
          }
          if (data.nodes.length > 0) {
            const tmplMatch = content.match(/<!--\s*template:\s*(.+?)\s*-->/i);
            const tmplFile = tmplMatch?.[1]?.trim();

            const finishLoad = (effectiveTemplate: TaxonomyTemplate | null | undefined) => {
              const { template: migratedTemplate, data: migratedData } = migrateFromParser(data, effectiveTemplate);
              const ir = graphIRFromData(migratedTemplate, migratedData);
              if (tmplFile) ir.metadata.source_template = tmplFile.endsWith(".cmt") ? tmplFile : `${tmplFile}.cmt`;
              // Validate map data against template
              const warnings = validateMapAgainstTemplate(ir, migratedTemplate);
              setLoadWarnings(warnings);
              setGraphData(ir);
              setTemplate(migratedTemplate);
              resetUI();
              setError(null);
              setSourceFilePath(filePath ?? null);
            };

            if (tmplFile) {
              const cmtName = tmplFile.endsWith(".cmt") ? tmplFile : `${tmplFile}.cmt`;
              let loadedTmpl: TaxonomyTemplate | null = null;
              try {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", `templates/${cmtName}`, false);
                xhr.send();
                if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) {
                  loadedTmpl = JSON.parse(xhr.responseText) as TaxonomyTemplate;
                }
              } catch { /* template load failure is non-fatal */ }
              finishLoad(loadedTmpl ?? template);
            } else {
              finishLoad(template);
            }
            return;
          }
        }

        // JSON fallback (legacy v2 JSON .cm files)
        if (content.trimStart().startsWith("{")) {
          try {
            const parsed = JSON.parse(content);
            if (parsed.version && parsed.nodes) {
              const cmData = parsed as ConceptMapData;
              const tmpl: TaxonomyTemplate = {
                title: cmData.title ?? template?.title ?? "Untitled",
                classifiers: cmData.classifiers ?? template?.classifiers,
                streams: cmData.streams ?? template?.streams ?? [],
                generations: cmData.generations ?? template?.generations ?? [],
                node_types: cmData.node_types ?? template?.node_types ?? DEFAULT_NODE_TYPES,
                edge_types: cmData.edge_types ?? template?.edge_types,
                stream_label: (parsed as Record<string, unknown>).stream_label as string | undefined ?? template?.stream_label,
                generation_label: (parsed as Record<string, unknown>).generation_label as string | undefined ?? template?.generation_label,
              };
              const ir = graphIRFromData(tmpl, cmData);
              setGraphData(ir);
              setTemplate(ir.metadata.template ?? tmpl);
              resetUI();
              setError(null);
              setSourceFilePath(filePath ?? null);
              return;
            }
          } catch {
            // Not valid JSON either
          }
        }

        setError(
          `No nodes found in "${filename}". ` +
          "Expected a markdown concept map with fenced code blocks defining nodes."
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [template, setGraphData, setTemplate, resetUI, setSourceFilePath]
  );

  return { parserReady, error, setError, loadFileContent, loadWarnings, setLoadWarnings };
}
