import { useEffect, useState, useCallback, useRef } from "react";
import type { GraphIR, GraphNode, GraphEdge, NodeTypeConfig, TaxonomyTemplate, ConceptMapData } from "./types/graph-ir";
import { GraphCanvas } from "./graph/GraphCanvas";
import { DetailPanel } from "./ui/DetailPanel";
import { NotesPane } from "./ui/NotesPane";
import { ActivityBar } from "./ui/ActivityBar";
import { Sidebar } from "./ui/Sidebar";
import { StatusBar } from "./ui/StatusBar";
import { AddNodeModal } from "./ui/AddNodeModal";
import { AddEdgeModal } from "./ui/AddEdgeModal";
import { SettingsModal } from "./ui/SettingsModal";
import { TaxonomyWizard } from "./ui/TaxonomyWizard";
import type { TaxonomyWizardResult, TaxonomyWizardInitial } from "./ui/TaxonomyWizard";
import { MappingModal } from "./ui/MappingModal";
import { ChatPane } from "./ui/ChatPane";
import { HelpPanel } from "./ui/HelpPanel";
import { EdgePopover } from "./ui/EdgePopover";
import { IconSearch } from "./ui/Icons";
import { initParser, parseMarkdown } from "./parser";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { LLMProvider, useLLM } from "./llm/LLMContext";
import { registerLLMCallbacks } from "./llm/provider";
import { DEFAULT_NODE_TYPES, migrateFromParser, graphIRFromData } from "./migration";
import { createEmptyFilterState } from "./utils/filters";
import type { FilterState } from "./utils/filters";
import { normalizeFencedKV } from "./utils/normalize";
import "./App.css";

export type ViewMode = string; // "full" or a node type id
export type InteractionMode = "normal" | "add-edge-source" | "add-edge-target";

function mergeNodeUpdate(node: GraphNode, updates: Partial<GraphNode>): GraphNode {
  const merged = { ...node, ...updates };
  if (updates.properties && node.properties) {
    merged.properties = { ...node.properties, ...updates.properties };
  }
  return merged;
}

function AppInner() {
  const { theme } = useTheme();
  const { isLLMConfigured } = useLLM();
  const [graphData, setGraphData] = useState<GraphIR | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [viewMode, setViewMode] = useState("full");
  const [error, setError] = useState<string | null>(null);
  const [revealedNodes, setRevealedNodes] = useState<Set<string>>(new Set());
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [showAddNode, setShowAddNode] = useState<string | null>(null); // node type id or null
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("normal");
  const [edgeSource, setEdgeSource] = useState<string | null>(null);
  const [edgeTarget, setEdgeTarget] = useState<string | null>(null);
  const [showAddEdgeModal, setShowAddEdgeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchHighlight, setSearchHighlight] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auxPanelWidth, setAuxPanelWidth] = useState(340);
  const [notesHeight, setNotesHeight] = useState(250);
  const [notesOpen, setNotesOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState<FilterState>(createEmptyFilterState());
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTaxonomyWizard, setShowTaxonomyWizard] = useState(false);
  const [taxonomyEditData, setTaxonomyEditData] = useState<TaxonomyWizardInitial | undefined>(undefined);
  const [sourceFilePath, setSourceFilePath] = useState<string | null>(null);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [template, setTemplate] = useState<TaxonomyTemplate | null>(null);
  const [templateFilePath] = useState<string | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHeight, setChatHeight] = useState(300);
  const [centerOnNode, setCenterOnNode] = useState<{ id: string; ts: number } | null>(null);
  const fitToViewRef = useRef<(() => void) | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<import("./types/graph-ir").GraphEdge | null>(null);
  const [edgePopoverPos, setEdgePopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [loadedNativeTemplates, setLoadedNativeTemplates] = useState<Map<string, TaxonomyWizardInitial>>(new Map());
  const [nativeMaps, setNativeMaps] = useState<{ name: string; path: string }[]>([]);

  const [parserReady, setParserReady] = useState(false);

  // Active node type configs — from template or defaults
  const nodeTypeConfigs: NodeTypeConfig[] = template?.node_types ?? DEFAULT_NODE_TYPES;

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
          // Normalize key-value lines inside fenced blocks: "key    value" → "key: value"
          const normalized = normalizeFencedKV(content);
          const result = parseMarkdown(normalized);
          const data = result.graph;
          if (result.warnings.length > 0) {
            console.warn("Parse warnings:", result.warnings.map((w) => `line ${w.line}: ${w.message}`));
          }
          if (data.nodes.length > 0) {
            const { template: migratedTemplate, data: migratedData } = migrateFromParser(data);
            const ir = graphIRFromData(migratedTemplate, migratedData);
            setGraphData(ir);
            setTemplate(migratedTemplate);
            setSelectedNode(null);
            setRevealedNodes(new Set());
            setFilters(createEmptyFilterState());
            setError(null);
            setSourceFilePath(filePath ?? null);
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
              setSelectedNode(null);
              setRevealedNodes(new Set());
              setFilters(createEmptyFilterState());
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
    [template]
  );

  // Register LLM response/error callbacks
  useEffect(() => {
    return registerLLMCallbacks();
  }, []);

  // Expose bridge functions for Swift WKWebView
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;

    win.loadFileContentBase64 = (base64: string, filename: string, filePath?: string) => {
      try {
        const content = atob(base64);
        const bytes = Uint8Array.from(content, (c) => c.charCodeAt(0));
        const decoded = new TextDecoder().decode(bytes);
        loadFileContent(decoded, filename, filePath);
      } catch (err) {
        console.error("[Bridge] decode error:", err);
      }
    };

    win.getGraphJSON = (): string => {
      if (!graphData) return "";
      return exportToMarkdown(graphData, nodeTypeConfigs);
    };

    win.getGraphMarkdown = (): string => {
      if (!graphData) return "";
      return exportToMarkdown(graphData, nodeTypeConfigs);
    };

    win.getCanvasImage = (): string => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return "";
      return canvas.toDataURL("image/png");
    };

    win.taxonomySaved = (filePath: string) => {
      setSourceFilePath(filePath);
    };

    win.showTaxonomyWizard = () => {
      setShowTaxonomyWizard(true);
    };

    // Template bridge functions
    win.templatesLoaded = (json: string) => {
      try {
        const list = JSON.parse(json) as { name: string; path: string }[];
        // Load each template's content
        for (const t of list) {
          const webkit = (window as unknown as Record<string, unknown>).webkit as
            | { messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }> }
            | undefined;
          webkit?.messageHandlers?.loadTemplate?.postMessage(JSON.stringify({ path: t.path }));
        }
      } catch (err) {
        console.error("Templates load error:", err);
      }
    };

    win.templateLoaded = (json: string) => {
      try {
        const tmpl = JSON.parse(json) as TaxonomyTemplate;
        // The .cmt template always wins — it defines the canonical structure
        if (graphData) {
          setTemplate(tmpl);
        }
        // Cache it by title for the empty state and taxonomy wizard
        setLoadedNativeTemplates((prev) => {
          const next = new Map(prev);
          next.set(tmpl.title, {
            title: tmpl.title,
            description: tmpl.description,
            streams: tmpl.streams,
            generations: tmpl.generations,
            node_types: tmpl.node_types,
          });
          return next;
        });
      } catch (err) {
        console.error("Template load error:", err);
      }
    };

    // Maps bridge function — receives list of saved .cm files
    win.mapsLoaded = (json: string) => {
      try {
        const list = JSON.parse(json) as { name: string; path: string }[];
        setNativeMaps(list);
      } catch (err) {
        console.error("Maps load error:", err);
      }
    };

    return () => {
      delete win.loadFileContentBase64;
      delete win.getGraphJSON;
      delete win.getGraphMarkdown;
      delete win.getCanvasImage;
      delete win.taxonomySaved;
      delete win.showTaxonomyWizard;
      delete win.templatesLoaded;
      delete win.templateLoaded;
      delete win.mapsLoaded;
    };
  }, [loadFileContent, graphData, nodeTypeConfigs, templateFilePath]);

  // Clear revealed nodes when view mode changes
  useEffect(() => {
    setRevealedNodes(new Set());
  }, [viewMode]);

  const handleSelectNode = useCallback(
    (node: GraphNode | null) => {
      if (interactionMode === "add-edge-source" && node) {
        setEdgeSource(node.id);
        setInteractionMode("add-edge-target");
        return;
      }
      if (interactionMode === "add-edge-target" && node) {
        setEdgeTarget(node.id);
        setInteractionMode("normal");
        setShowAddEdgeModal(true);
        return;
      }

      setSelectedNode(node);

      if (node && viewMode !== "full" && graphData) {
        const connected = new Set<string>();
        graphData.edges.forEach((e) => {
          if (e.from === node.id) connected.add(e.to);
          if (e.to === node.id) connected.add(e.from);
        });
        setRevealedNodes((prev) => {
          const next = new Set(prev);
          connected.forEach((id) => next.add(id));
          return next;
        });
      }
    },
    [interactionMode, viewMode, graphData]
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<GraphNode>) => {
      if (!graphData) return;
      setGraphData({
        ...graphData,
        nodes: graphData.nodes.map((n) =>
          n.id === nodeId ? mergeNodeUpdate(n, updates) : n
        ),
      });
      setSelectedNode((prev) =>
        prev?.id === nodeId ? mergeNodeUpdate(prev, updates) : prev
      );
    },
    [graphData]
  );

  const handleNavigateToNode = useCallback(
    (nodeId: string) => {
      if (!graphData) return;
      const node = graphData.nodes.find((n) => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
        setRevealedNodes((prev) => new Set(prev).add(nodeId));
      }
    },
    [graphData]
  );

  // Unified add node handler
  const handleAddNode = useCallback(
    (nodeType: string, name: string, stream: string, generation: number, properties: Record<string, string | undefined>) => {
      if (!graphData) return;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const config = nodeTypeConfigs.find((t) => t.id === nodeType);

      const newNode: GraphNode = {
        id,
        node_type: nodeType,
        name,
        generation,
        stream,
        properties: { ...properties },
      };

      setGraphData({ ...graphData, nodes: [...graphData.nodes, newNode] });
      setShowAddNode(null);
      setSelectedNode(newNode);
    },
    [graphData, nodeTypeConfigs]
  );

  const handleAddEdge = useCallback(
    (edgeType: string, weight: number = 1.0) => {
      if (!graphData || !edgeSource || !edgeTarget) return;
      const fromNode = graphData.nodes.find((n) => n.id === edgeSource);
      const toNode = graphData.nodes.find((n) => n.id === edgeTarget);
      if (!fromNode || !toNode) return;

      // Use template edge type config for visual if available
      const edgeTypeConfig = template?.edge_types?.find((e) => e.id === edgeType);
      const directed = edgeTypeConfig ? edgeTypeConfig.directed : !["rivalry", "alliance", "institutional", "opposes"].includes(edgeType);
      const visual = edgeTypeConfig
        ? { style: edgeTypeConfig.style ?? "solid", color: edgeTypeConfig.color, show_arrow: edgeTypeConfig.directed }
        : getEdgeVisual(edgeType);

      const newEdge: GraphEdge = {
        from: edgeSource,
        to: edgeTarget,
        edge_type: edgeType,
        directed,
        weight,
        visual,
      };

      setGraphData({ ...graphData, edges: [...graphData.edges, newEdge] });
      setShowAddEdgeModal(false);
      setEdgeSource(null);
      setEdgeTarget(null);
    },
    [graphData, edgeSource, edgeTarget, nodeTypeConfigs]
  );

  const handleStartAddEdge = useCallback(() => {
    setInteractionMode("add-edge-source");
    setEdgeSource(null);
    setEdgeTarget(null);
    setSelectedNode(null);
  }, []);

  const handleCancelAddEdge = useCallback(() => {
    setInteractionMode("normal");
    setEdgeSource(null);
    setEdgeTarget(null);
    setShowAddEdgeModal(false);
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (!graphData) return;
    setGraphData({
      ...graphData,
      nodes: graphData.nodes.filter((n) => n.id !== nodeId),
      edges: graphData.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    });
    setSelectedNode(null);
    setNotesOpen(false);
  }, [graphData]);

  const handleDeleteEdge = useCallback((fromId: string, toId: string) => {
    if (!graphData) return;
    setGraphData({
      ...graphData,
      edges: graphData.edges.filter((e) => !(e.from === fromId && e.to === toId)),
    });
    setSelectedEdge(null);
    setEdgePopoverPos(null);
  }, [graphData]);

  // Keyboard shortcuts: Escape to cancel edge drawing, Delete/Backspace to delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "Escape" && interactionMode !== "normal") {
        handleCancelAddEdge();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (selectedEdge) {
          e.preventDefault();
          if (window.confirm("Delete this edge?")) {
            handleDeleteEdge(selectedEdge.from, selectedEdge.to);
          }
        } else if (selectedNode) {
          e.preventDefault();
          if (window.confirm("Delete node and all its connections?")) {
            handleDeleteNode(selectedNode.id);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [interactionMode, handleCancelAddEdge, selectedNode, selectedEdge, handleDeleteNode, handleDeleteEdge]);

  const isNativeApp = !!(window as unknown as Record<string, unknown>).webkit;

  const sendToSwift = useCallback((handler: string, payload?: unknown) => {
    const webkit = (window as unknown as Record<string, unknown>).webkit as
      | { messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }> }
      | undefined;
    webkit?.messageHandlers?.[handler]?.postMessage(payload ?? {});
  }, []);

  // Request native templates and maps on mount
  useEffect(() => {
    if (isNativeApp) {
      sendToSwift("listTemplates");
      sendToSwift("listMaps");
    }
  }, [isNativeApp, sendToSwift]);

  // Auto-save to source file path (debounced) — saves markdown
  const autoSave = useCallback(() => {
    if (!graphData || !sourceFilePath || !isNativeApp) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const md = exportToMarkdown(graphData, nodeTypeConfigs);
      sendToSwift("saveToPath", JSON.stringify({ path: sourceFilePath, content: md }));
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 2000);
    }, 2000);
  }, [graphData, sourceFilePath, isNativeApp, sendToSwift, nodeTypeConfigs]);

  // Trigger auto-save when graph data changes
  const graphDataRef = useRef(graphData);
  useEffect(() => {
    if (graphDataRef.current && graphData && graphDataRef.current !== graphData) {
      autoSave();
    }
    graphDataRef.current = graphData;
  }, [graphData, autoSave]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        loadFileContent(content, file.name);
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [loadFileContent]
  );

  // Handle taxonomy wizard completion (create or edit)
  const handleTaxonomyCreate = useCallback((data: TaxonomyWizardResult) => {
    const newTemplate: TaxonomyTemplate = {
      title: data.title,
      description: data.description,
      streams: data.streams,
      generations: data.generations,
      node_types: data.node_types,
      edge_types: data.edge_types,
      stream_label: data.stream_label,
      generation_label: data.generation_label,
    };

    if (graphData && taxonomyEditData) {
      // Edit mode: update metadata + template on existing graph
      const updated: GraphIR = {
        ...graphData,
        metadata: {
          ...graphData.metadata,
          title: data.title,
          streams: data.streams,
          generations: data.generations,
          structural_observations: data.description
            ? [data.description, ...graphData.metadata.structural_observations.slice(1)]
            : graphData.metadata.structural_observations,
          template: newTemplate,
        },
      };
      setGraphData(updated);
      setTemplate(newTemplate);
    } else {
      // Create mode: new empty graph
      const newGraph: GraphIR = {
        version: "2.0",
        metadata: {
          title: data.title,
          generations: data.generations,
          streams: data.streams,
          external_shocks: [],
          structural_observations: data.description ? [data.description] : [],
          template: newTemplate,
        },
        nodes: [],
        edges: [],
      };

      setTemplate(newTemplate);

      // Save as markdown .cm file
      const md = exportToMarkdown(newGraph, newTemplate.node_types);

      if (isNativeApp) {
        sendToSwift("saveNewTaxonomy", JSON.stringify({ content: md, title: data.title }));
        setGraphData(newGraph);
      } else {
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.cm`;
        a.click();
        URL.revokeObjectURL(url);
        setGraphData(newGraph);
      }

      setSelectedNode(null);
      setError(null);
    }

    setShowTaxonomyWizard(false);
    setTaxonomyEditData(undefined);
  }, [isNativeApp, sendToSwift, graphData, taxonomyEditData]);

  // Create a new empty map using an existing template's structure (no wizard)
  const handleNewFileFromTemplate = useCallback((tmplData: TaxonomyWizardInitial) => {
    const mapTitle = "Untitled Map";
    const newTemplate: TaxonomyTemplate = {
      title: tmplData.title,
      description: tmplData.description,
      streams: tmplData.streams,
      generations: tmplData.generations,
      node_types: tmplData.node_types ?? DEFAULT_NODE_TYPES,
      edge_types: tmplData.edge_types,
      stream_label: tmplData.stream_label,
      generation_label: tmplData.generation_label,
    };

    const newGraph: GraphIR = {
      version: "2.0",
      metadata: {
        title: mapTitle,
        generations: tmplData.generations,
        streams: tmplData.streams,
        external_shocks: [],
        structural_observations: [],
        template: newTemplate,
      },
      nodes: [],
      edges: [],
    };

    setTemplate(newTemplate);
    setGraphData(newGraph);
    setSelectedNode(null);
    setError(null);

    // Save to disk
    const md = exportToMarkdown(newGraph, newTemplate.node_types);
    if (isNativeApp) {
      sendToSwift("saveNewTaxonomy", JSON.stringify({ content: md, title: mapTitle }));
    }
  }, [isNativeApp, sendToSwift]);

  // Open wizard in edit mode with current taxonomy data
  const handleEditTaxonomy = useCallback(() => {
    if (!graphData) return;
    setTaxonomyEditData({
      title: graphData.metadata.title ?? "",
      description: graphData.metadata.structural_observations[0] ?? undefined,
      streams: graphData.metadata.streams,
      generations: graphData.metadata.generations,
      node_types: nodeTypeConfigs,
      edge_types: template?.edge_types,
      stream_label: template?.stream_label,
      generation_label: template?.generation_label,
    });
    setShowTaxonomyWizard(true);
  }, [graphData, nodeTypeConfigs, template]);

  // Save taxonomy as a reusable template
  const handleSaveTemplate = useCallback((data: TaxonomyWizardResult) => {
    const tmpl: TaxonomyWizardInitial = {
      title: data.title,
      description: data.description,
      streams: data.streams,
      generations: data.generations,
      node_types: data.node_types,
      edge_types: data.edge_types,
      stream_label: data.stream_label,
      generation_label: data.generation_label,
    };

    if (isNativeApp) {
      const templateJson = JSON.stringify({
        title: data.title,
        description: data.description,
        format_instructions: "When generating .cm files from this template: use markdown with fenced code blocks for nodes. Every property line MUST use 'key: value' format with a colon separator. Required node keys: id, name, generation, stream. Include all fields defined in the node type. Edges use 'from: [id] to: [id] type: [edge_type]' format.",
        streams: data.streams,
        generations: data.generations,
        node_types: data.node_types,
        edge_types: data.edge_types,
        stream_label: data.stream_label,
        generation_label: data.generation_label,
      }, null, 2);
      sendToSwift("saveTemplate", JSON.stringify({ content: templateJson, title: data.title }));
    }

    // Also store in localStorage
    const stored = JSON.parse(localStorage.getItem("cm-templates") || "[]");
    stored.push(tmpl);
    localStorage.setItem("cm-templates", JSON.stringify(stored));
  }, [isNativeApp, sendToSwift]);

  const getSavedTemplates = useCallback((): TaxonomyWizardInitial[] => {
    const local: TaxonomyWizardInitial[] = (() => {
      try { return JSON.parse(localStorage.getItem("cm-templates") || "[]"); }
      catch { return []; }
    })();
    // Merge in loaded native templates (deduplicate by title)
    const titles = new Set(local.map((t) => t.title));
    const native = Array.from(loadedNativeTemplates.values()).filter((t) => !titles.has(t.title));
    return [...local, ...native];
  }, [loadedNativeTemplates]);

  const handleImportFile = useCallback(() => {
    if (isNativeApp) {
      sendToSwift("openFile");
    } else {
      fileInputRef.current?.click();
    }
  }, [isNativeApp, sendToSwift]);

  const handleCloseNode = useCallback(() => {
    setSelectedNode(null);
    setNotesOpen(false);
  }, []);

  const handleSelectEdge = useCallback((edge: import("./types/graph-ir").GraphEdge | null, pos?: { x: number; y: number }) => {
    setSelectedEdge(edge);
    setEdgePopoverPos(pos ?? null);
    if (edge) setSelectedNode(null);
  }, []);

  const handleEdgeUpdate = useCallback((fromId: string, toId: string, updates: Partial<import("./types/graph-ir").GraphEdge>) => {
    if (!graphData) return;
    setGraphData({
      ...graphData,
      edges: graphData.edges.map((e) =>
        e.from === fromId && e.to === toId ? { ...e, ...updates } : e
      ),
    });
    // Keep selectedEdge in sync
    setSelectedEdge((prev) =>
      prev && prev.from === fromId && prev.to === toId ? { ...prev, ...updates } : prev
    );
  }, [graphData]);

  const handleMappingResult = useCallback((cmData: ConceptMapData, tmpl: TaxonomyTemplate) => {
    if (!cmData.version) cmData.version = "2.0";
    const ir = graphIRFromData(tmpl, cmData);
    setGraphData(ir);
    setTemplate(tmpl);
    setSelectedNode(null);
    setRevealedNodes(new Set());
    setError(null);
    setShowMappingModal(false);
  }, []);

  const makeResizeHandler = useCallback(
    (setter: React.Dispatch<React.SetStateAction<number>>, currentWidth: number) =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = currentWidth;
        const onMouseMove = (moveEvent: MouseEvent) => {
          const delta = startX - moveEvent.clientX;
          setter(Math.max(240, Math.min(600, startW + delta)));
        };
        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      },
    []
  );

  const makeVerticalResizeHandler = useCallback(
    (setter: React.Dispatch<React.SetStateAction<number>>, currentHeight: number) =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const startH = currentHeight;
        const onMouseMove = (moveEvent: MouseEvent) => {
          const delta = startY - moveEvent.clientY;
          setter(Math.max(120, Math.min(500, startH + delta)));
        };
        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      },
    []
  );

  const handleStreamToggle = (streamId: string, allStreamIds: string[]) => {
    setFilters((prev) => {
      const streams = prev.streams;
      if (!streams) {
        // First click: uncheck this stream (show all EXCEPT this one)
        const next = new Set(allStreamIds);
        next.delete(streamId);
        return { ...prev, streams: next };
      }
      const next = new Set(streams);
      if (next.has(streamId)) {
        next.delete(streamId);
        // Empty set = nothing shown (user unticked everything)
        return { ...prev, streams: next };
      } else {
        next.add(streamId);
        // All re-checked → reset to null (all shown)
        return { ...prev, streams: next.size >= allStreamIds.length ? null : next };
      }
    });
  };

  const handleGenerationToggle = (gen: number, allGens: number[]) => {
    setFilters((prev) => {
      const gens = prev.generations;
      if (!gens) {
        const next = new Set(allGens);
        next.delete(gen);
        return { ...prev, generations: next };
      }
      const next = new Set(gens);
      if (next.has(gen)) {
        next.delete(gen);
        return { ...prev, generations: next };
      } else {
        next.add(gen);
        return { ...prev, generations: next.size >= allGens.length ? null : next };
      }
    });
  };

  const handleAttributeToggle = (compositeKey: string, value: string, allValues: string[]) => {
    setFilters((prev) => {
      const attrs = new Map(prev.attributes);
      const current = attrs.get(compositeKey);
      if (!current) {
        // First click: uncheck this value (show all EXCEPT this one)
        const next = new Set(allValues);
        next.delete(value);
        attrs.set(compositeKey, next);
      } else {
        const next = new Set(current);
        if (next.has(value)) {
          next.delete(value);
          // Empty set = nothing shown (user unticked everything)
          attrs.set(compositeKey, next);
        } else {
          next.add(value);
          // All re-checked → reset to null (all shown)
          if (next.size >= allValues.length) {
            attrs.set(compositeKey, null);
          } else {
            attrs.set(compositeKey, next);
          }
        }
      }
      // Clean up null entries
      for (const [k, v] of attrs) {
        if (v === null) attrs.delete(k);
      }
      return { ...prev, attributes: attrs };
    });
  };

  const handleDateRangeChange = (compositeKey: string, field: "from" | "to", value: string) => {
    setFilters((prev) => {
      const ranges = new Map(prev.dateRanges);
      const current = ranges.get(compositeKey) ?? { from: null, to: null };
      const updated = { ...current, [field]: value || null };
      if (updated.from === null && updated.to === null) {
        ranges.delete(compositeKey);
      } else {
        ranges.set(compositeKey, updated);
      }
      return { ...prev, dateRanges: ranges };
    });
  };

  const handleShowAllFilters = () => {
    setFilters(createEmptyFilterState());
  };

  const searchResults = searchQuery.trim().length > 0 && graphData
    ? graphData.nodes
        .filter((n) => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 10)
    : [];

  const handleSearchSelect = useCallback(
    (node: GraphNode) => {
      setSelectedNode(node);
      setSearchQuery("");
      setSearchFocused(false);
      setCenterOnNode({ id: node.id, ts: Date.now() });
      if (viewMode !== "full") {
        setRevealedNodes((prev) => new Set(prev).add(node.id));
      }
    },
    [viewMode]
  );


  if (!parserReady) return <div className="loading">Loading parser...</div>;
  if (error || !graphData) {
    const templates = getSavedTemplates();
    return (
      <>
        <div className="empty-state">
          {error && (
            <div className="empty-state-error">
              <span>{error}</span>
              <button className="empty-state-error-dismiss" onClick={() => setError(null)}>&times;</button>
            </div>
          )}
          <div className="empty-state-title">Concept Mapper</div>

          <div className="start-columns">
            {/* Left column: Templates */}
            <div className="start-column">
              <div className="start-column-header">Templates</div>
              <div className="start-list">
                {templates.map((t, i) => (
                  <div key={`t-${i}`} className="start-item-row">
                    <button
                      className="start-item"
                      onClick={() => { setTaxonomyEditData(t); setShowTaxonomyWizard(true); }}
                      title="Edit template in wizard"
                    >
                      <span className="start-item-name">{t.title}</span>
                      <span className="start-item-meta">
                        {t.node_types?.length ?? 0} types
                        {t.streams.length > 0 ? ` \u00B7 ${t.streams.length} ${t.stream_label?.toLowerCase() ?? "categories"}` : ""}
                        {t.generations.length > 0 ? ` \u00B7 ${t.generations.length} ${t.generation_label?.toLowerCase() ?? "phases"}` : ""}
                      </span>
                    </button>
                    <button
                      className="start-item-action"
                      onClick={() => handleNewFileFromTemplate(t)}
                      title="Create a new empty map from this template"
                    >
                      New File
                    </button>
                  </div>
                ))}
                {templates.length === 0 && (
                  <div className="start-empty">No templates yet</div>
                )}
              </div>
              <button className="start-action" onClick={() => { setTaxonomyEditData(undefined); setShowTaxonomyWizard(true); }}>
                + New Taxonomy
              </button>
            </div>

            {/* Right column: Saved Maps */}
            <div className="start-column">
              <div className="start-column-header">Maps</div>
              <div className="start-list">
                {nativeMaps.map((m, i) => (
                  <button
                    key={`m-${i}`}
                    className="start-item"
                    onClick={() => sendToSwift("loadMap", JSON.stringify({ path: m.path }))}
                  >
                    <span className="start-item-name">{m.name}</span>
                  </button>
                ))}
                {nativeMaps.length === 0 && (
                  <div className="start-empty">No saved maps yet</div>
                )}
              </div>
              <button className="start-action" onClick={handleImportFile}>
                Open File...
              </button>
              {isLLMConfigured && (
                <button className="start-action" onClick={() => setShowMappingModal(true)}>
                  Map Text
                </button>
              )}
            </div>
          </div>
        </div>
        {showTaxonomyWizard && (
          <TaxonomyWizard
            onComplete={handleTaxonomyCreate}
            onCancel={() => { setShowTaxonomyWizard(false); setTaxonomyEditData(undefined); }}
            initialData={taxonomyEditData}
          />
        )}
        {showMappingModal && (
          <MappingModal
            template={null}
            savedTemplates={templates.map((t) => ({
              title: t.title,
              streams: t.streams,
              generations: t.generations,
              node_types: t.node_types ?? DEFAULT_NODE_TYPES,
            }))}
            onResult={handleMappingResult}
            onCancel={() => setShowMappingModal(false)}
            isNativeApp={isNativeApp}
            sendToSwift={sendToSwift}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".cm,.cmt,.json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </>
    );
  }

  const selectedEdges = selectedNode
    ? graphData.edges.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id)
    : [];

  return (
    <div className="app">
      {/* Titlebar */}
      <div className="titlebar">
        <span className="titlebar-title">{graphData.metadata.title || "Concept Map"}</span>
        <div className="search-container">
          <IconSearch size={14} className="search-icon" />
          <input
            ref={searchInputRef}
            className="search-input"
            type="text"
            placeholder="Search nodes... (\u2318K)"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchHighlight(-1); }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSearchHighlight((h) => Math.min(h + 1, searchResults.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSearchHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter" && searchHighlight >= 0 && searchResults[searchHighlight]) {
                e.preventDefault();
                handleSearchSelect(searchResults[searchHighlight]);
                setSearchHighlight(-1);
              } else if (e.key === "Escape") {
                setSearchQuery("");
                setSearchHighlight(-1);
                searchInputRef.current?.blur();
              }
            }}
          />
          {searchFocused && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((n, idx) => {
                const typeConfig = nodeTypeConfigs.find((t) => t.id === n.node_type);
                return (
                  <div key={n.id} className={`search-result${idx === searchHighlight ? " search-result-highlight" : ""}`} onMouseDown={() => handleSearchSelect(n)}>
                    <span
                      className={`type-indicator ${typeConfig?.shape !== "circle" ? "non-circle" : ""}`}
                      style={{
                        backgroundColor:
                          graphData.metadata.streams.find((s) => s.id === n.stream)?.color ?? "#666",
                      }}
                    />
                    {n.name}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <span className="titlebar-spacer" />
      </div>

      {/* Workbench */}
      <div className="workbench">
        <ActivityBar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSettings={() => setShowSettings(true)}
          onEditTaxonomy={handleEditTaxonomy}
          onOpenMapping={() => setShowMappingModal(true)}
          onToggleChat={() => { setChatOpen(!chatOpen); if (chatOpen) return; setNotesOpen(false); }}
          chatOpen={chatOpen}
          llmAvailable={false /* LLM features hidden — enable in a later release */}
          onOpenHelp={() => setShowHelp(true)}
          onFitToView={() => fitToViewRef.current?.()}
          nodeTypeConfigs={nodeTypeConfigs}
        />

        {sidebarOpen && (
          <Sidebar
            nodes={graphData.nodes}
            streams={graphData.metadata.streams}
            nodeTypeConfigs={nodeTypeConfigs}
            template={template}
            filters={filters}
            onStreamToggle={handleStreamToggle}
            onGenerationToggle={handleGenerationToggle}
            onAttributeToggle={handleAttributeToggle}
            onDateRangeChange={handleDateRangeChange}
            onShowAll={handleShowAllFilters}
            onSelectNode={(node) => { setSelectedNode(node); setCenterOnNode({ id: node.id, ts: Date.now() }); }}
            selectedNodeId={selectedNode?.id ?? null}
            onAddNode={(nodeType) => setShowAddNode(nodeType)}
            onAddEdge={handleStartAddEdge}
            interactionMode={interactionMode}
            onCancelAddEdge={handleCancelAddEdge}
          />
        )}

        <div className="editor-area">
          <div className="canvas-container">
            <GraphCanvas
              data={graphData}
              onSelectNode={handleSelectNode}
              selectedNodeId={selectedNode?.id ?? null}
              viewMode={viewMode}
              revealedNodes={revealedNodes}
              interactionMode={interactionMode}
              edgeSourceId={edgeSource}
              filters={filters}
              theme={theme}
              nodeTypeConfigs={nodeTypeConfigs}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={(nodeId) => {
                setCollapsedNodes((prev) => {
                  const next = new Set(prev);
                  if (next.has(nodeId)) next.delete(nodeId);
                  else next.add(nodeId);
                  return next;
                });
              }}
              onSelectEdge={handleSelectEdge}
              selectedEdgeKey={selectedEdge ? `${selectedEdge.from}|${selectedEdge.to}` : null}
              centerOnNode={centerOnNode}
              onRegisterFitToView={(fn) => { fitToViewRef.current = fn; }}
            />
            {selectedEdge && edgePopoverPos && (
              <EdgePopover
                edge={selectedEdge}
                position={edgePopoverPos}
                onUpdate={handleEdgeUpdate}
                onClose={() => { setSelectedEdge(null); setEdgePopoverPos(null); }}
                onDelete={handleDeleteEdge}
                edgeTypeLabel={
                  template?.edge_types?.find((et) => et.id === selectedEdge.edge_type)?.label
                  ?? selectedEdge.edge_type
                }
              />
            )}
          </div>
          {selectedNode && notesOpen && !chatOpen && (
            <>
              <div className="pane-resizer-h" onMouseDown={makeVerticalResizeHandler(setNotesHeight, notesHeight)} />
              <div className="notes-bottom-pane" style={{ height: notesHeight }}>
                <NotesPane
                  node={selectedNode}
                  edges={selectedEdges}
                  nodes={graphData.nodes}
                  onNodeUpdate={handleNodeUpdate}
                />
              </div>
            </>
          )}
          {chatOpen && template && (
            <>
              <div className="pane-resizer-h" onMouseDown={makeVerticalResizeHandler(setChatHeight, chatHeight)} />
              <div className="chat-bottom-pane" style={{ height: chatHeight }}>
                <ChatPane
                  graphData={graphData}
                  template={template}
                  isNativeApp={isNativeApp}
                  sendToSwift={sendToSwift}
                />
              </div>
            </>
          )}
        </div>

        {selectedNode && (
          <>
            <div className="pane-resizer" onMouseDown={makeResizeHandler(setAuxPanelWidth, auxPanelWidth)} />
            <div className="auxiliary-panel" style={{ width: auxPanelWidth }}>
              <div className="aux-panel-header">
                <span className="aux-panel-title">Properties</span>
                <button className="close-btn" onClick={handleCloseNode}>&times;</button>
              </div>
              <DetailPanel
                node={selectedNode}
                edges={selectedEdges}
                nodes={graphData.nodes}
                streams={graphData.metadata.streams}
                generations={graphData.metadata.generations}
                nodeTypeConfigs={nodeTypeConfigs}
                template={template}
                onNodeUpdate={handleNodeUpdate}
                onNavigateToNode={handleNavigateToNode}
                onOpenNotes={() => setNotesOpen(!notesOpen)}
                notesOpen={notesOpen}
                onNodeDelete={handleDeleteNode}
              />
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        nodeCount={graphData.nodes.length}
        edgeCount={graphData.edges.length}
        saveIndicator={saveIndicator}
        interactionMode={interactionMode}
        themeName={theme.name}
      />

      {showAddNode && (
        <AddNodeModal
          nodeTypeConfigs={nodeTypeConfigs}
          streams={graphData.metadata.streams}
          generations={graphData.metadata.generations}
          onAdd={handleAddNode}
          onCancel={() => setShowAddNode(null)}
          initialNodeType={showAddNode}
          template={template}
        />
      )}
      {showAddEdgeModal && edgeSource && edgeTarget && (
        <AddEdgeModal
          sourceNode={graphData.nodes.find((n) => n.id === edgeSource)!}
          targetNode={graphData.nodes.find((n) => n.id === edgeTarget)!}
          onAdd={handleAddEdge}
          onCancel={handleCancelAddEdge}
          edgeTypeConfigs={template?.edge_types}
        />
      )}
      {showSettings && (
        <SettingsModal
          streams={graphData.metadata.streams}
          edgeTypes={[...new Set(graphData.edges.map((e) => e.edge_type))]}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showTaxonomyWizard && (
        <TaxonomyWizard
          onComplete={handleTaxonomyCreate}
          onCancel={() => { setShowTaxonomyWizard(false); setTaxonomyEditData(undefined); }}
          initialData={taxonomyEditData}
          onSaveTemplate={handleSaveTemplate}
        />
      )}
      {showMappingModal && (
        <MappingModal
          template={template}
          savedTemplates={getSavedTemplates().map((t) => ({
            title: t.title,
            streams: t.streams,
            generations: t.generations,
            node_types: t.node_types ?? DEFAULT_NODE_TYPES,
          }))}
          onResult={handleMappingResult}
          onCancel={() => setShowMappingModal(false)}
          isNativeApp={isNativeApp}
          sendToSwift={sendToSwift}
        />
      )}
      {showHelp && (
        <HelpPanel onClose={() => setShowHelp(false)} />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".cm,.cmt,.json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}

function getEdgeVisual(edgeType: string) {
  if (edgeType === "rivalry" || edgeType === "opposes") {
    return { style: "dashed", color: "#D94A4A", show_arrow: false };
  }
  if (edgeType === "alliance" || edgeType === "institutional") {
    return { style: "dotted", color: "#999999", show_arrow: false };
  }
  return { style: "solid", show_arrow: true };
}

function exportToMarkdown(data: GraphIR, nodeTypeConfigs: NodeTypeConfig[]): string {
  const lines: string[] = [];
  const title = data.metadata.title || "Concept Map";
  lines.push(`# ${title}\n`);
  lines.push(`<!-- Exported from concept-mapper, ${new Date().toISOString().split("T")[0]}. -->\n`);

  if (data.metadata.generations.length > 0) {
    lines.push("## Generations\n");
    lines.push("| Gen | Period | Label | Attention Space Count |");
    lines.push("|-----|--------|-------|-----------------------|");
    for (const g of data.metadata.generations) {
      lines.push(`| ${g.number} | ${g.period ?? ""} | ${g.label ?? ""} | ${g.attention_space_count ?? ""} |`);
    }
    lines.push("");
  }

  if (data.metadata.streams.length > 0) {
    lines.push("## Streams\n");
    lines.push("| Stream ID | Name | Colour | Description |");
    lines.push("|-----------|------|--------|-------------|");
    for (const s of data.metadata.streams) {
      lines.push(`| ${s.id} | ${s.name} | ${s.color ?? ""} | ${s.description ?? ""} |`);
    }
    lines.push("");
  }

  // Group nodes by node_type and write each group as "## [Label] Nodes"
  const nodesByType = new Map<string, typeof data.nodes>();
  for (const n of data.nodes) {
    const typeId = n.node_type;
    if (!nodesByType.has(typeId)) nodesByType.set(typeId, []);
    nodesByType.get(typeId)!.push(n);
  }

  const sectionName = (typeId: string): string => {
    const config = nodeTypeConfigs.find((c) => c.id === typeId);
    return config?.label ?? typeId.charAt(0).toUpperCase() + typeId.slice(1);
  };

  for (const [typeId, typeNodes] of nodesByType) {
    const label = sectionName(typeId);

    lines.push(`## ${label} Nodes\n`);

    for (const node of typeNodes) {
      lines.push("```");
      lines.push(`id:               ${node.id}`);
      lines.push(`name:             ${node.name}`);

      // Write generation, stream, then all properties as KV pairs
      if (node.generation != null) lines.push(`generation:       ${node.generation}`);
      if (node.stream) lines.push(`stream:           ${node.stream}`);
      const props = node.properties ?? {};
      for (const [key, value] of Object.entries(props)) {
        if (value != null && value !== "") {
          lines.push(`${key}: ${value}`);
        }
      }

      if (node.notes) lines.push(`notes:            ${node.notes.replace(/\n/g, " ")}`);
      lines.push("```\n");
    }
  }

  // Filter out orphaned edges (referencing deleted nodes)
  const validNodeIds = new Set(data.nodes.map((n) => n.id));
  const validEdges = data.edges.filter((e) => validNodeIds.has(e.from) && validNodeIds.has(e.to));

  if (validEdges.length > 0) {
    lines.push("## Edges\n");

    // Group edges by category, using node type labels for section names
    const nodeTypeOf = new Map(data.nodes.map((n) => [n.id, n.node_type]));
    const edgeBuckets = new Map<string, typeof validEdges>();
    for (const e of validEdges) {
      const fromType = nodeTypeOf.get(e.from) ?? "unknown";
      const toType = nodeTypeOf.get(e.to) ?? "unknown";
      const key = `${fromType}-to-${toType}`;
      if (!edgeBuckets.has(key)) edgeBuckets.set(key, []);
      edgeBuckets.get(key)!.push(e);
    }

    for (const [key, edges] of edgeBuckets) {
      const [fromType, toType] = key.split("-to-");
      const fromLabel = sectionName(fromType);
      const toLabel = sectionName(toType);
      lines.push(`### ${fromLabel}-to-${toLabel}\n`);
      lines.push("```");
      for (const e of edges) {
        lines.push(`from: ${e.from.padEnd(16)} to: ${e.to.padEnd(20)} type: ${e.edge_type}`);
        if (e.note) lines.push(`  note: ${e.note}`);
        if (e.weight != null && e.weight !== 1.0) lines.push(`  weight: ${e.weight}`);
        lines.push("");
      }
      lines.push("```\n");
    }
  }

  if (data.metadata.external_shocks.length > 0) {
    lines.push("## External Shocks\n");
    lines.push("```");
    for (const s of data.metadata.external_shocks) {
      lines.push(`date: ${s.date}`);
      lines.push(`description: ${s.description}`);
      lines.push("");
    }
    lines.push("```\n");
  }

  if (data.metadata.structural_observations.length > 0) {
    lines.push("## Structural Observations\n");
    for (const o of data.metadata.structural_observations) lines.push(`- ${o}`);
    lines.push("");
  }

  return lines.join("\n");
}

function App() {
  return (
    <ThemeProvider>
      <LLMProvider>
        <AppInner />
      </LLMProvider>
    </ThemeProvider>
  );
}

export default App;
