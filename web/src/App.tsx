import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { GraphIR, GraphNode, GraphEdge, NodeTypeConfig, TaxonomyTemplate } from "./types/graph-ir";
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
import { ExportImageModal } from "./ui/ExportImageModal";
import { AnalysisPanel } from "./ui/AnalysisPanel";
import { EdgeNotesPane } from "./ui/EdgeNotesPane";
import { analyzeNetwork, findShortestPaths } from "./utils/graph-analysis";
import type { PathResult } from "./utils/graph-analysis";
import type { ExportImageOptions } from "./ui/ExportImageModal";
import { jsPDF } from "jspdf";
import { HelpPanel } from "./ui/HelpPanel";
import { EdgePopover } from "./ui/EdgePopover";
import { IconSearch } from "./ui/Icons";
import { parseMarkdown } from "./parser";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { DEFAULT_NODE_TYPES, migrateFromParser, graphIRFromData, getTemplateClassifiers } from "./migration";
import { createEmptyFilterState } from "./utils/filters";
import type { FilterState } from "./utils/filters";
import { normalizeFencedKV } from "./utils/normalize";
import { useFileLoader } from "./hooks/useFileLoader";
import "./App.css";

export type ViewMode = string; // "full" or a node type id
export type { InteractionMode } from "./stores/useGraphStore";

function mergeNodeUpdate(node: GraphNode, updates: Partial<GraphNode>): GraphNode {
  const merged = { ...node, ...updates };
  if (updates.properties && node.properties) {
    merged.properties = { ...node.properties, ...updates.properties };
  }
  return merged;
}

function AppInner() {
  const { theme, look, edgeColorOverrides, setEdgeColorOverrides } = useTheme();
  const [graphData, setGraphDataRaw] = useState<GraphIR | null>(null);
  const undoStack = useRef<GraphIR[]>([]);
  const redoStack = useRef<GraphIR[]>([]);

  // Wrapper that pushes to undo history before mutating
  const setGraphData = useCallback((data: GraphIR | null | ((prev: GraphIR | null) => GraphIR | null)) => {
    setGraphDataRaw((prev) => {
      const next = typeof data === 'function' ? data(prev) : data;
      if (prev && next && prev !== next) {
        undoStack.current = [...undoStack.current.slice(-49), prev];
        redoStack.current = [];
      }
      return next;
    });
  }, []);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [viewMode, setViewMode] = useState("full");
  const [revealedNodes, setRevealedNodes] = useState<Set<string>>(new Set());
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [showAddNode, setShowAddNode] = useState<string | null>(null); // node type id or null
  const [interactionMode, setInteractionMode] = useState<import("./stores/useGraphStore").InteractionMode>("normal");
  const [edgeSource, setEdgeSource] = useState<string | null>(null);
  const [edgeTarget, setEdgeTarget] = useState<string | null>(null);
  const [showAddEdgeModal, setShowAddEdgeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exploded, setExploded] = useState(false);
  const [layoutPreset, setLayoutPreset] = useState<import("./types/graph-ir").LayoutPreset>("force");
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
  const [centerOnNode, setCenterOnNode] = useState<{ id: string; ts: number } | null>(null);
  const fitToViewRef = useRef<(() => void) | null>(null);
  const zoomFnsRef = useRef<{ zoomIn: () => void; zoomOut: () => void } | null>(null);
  const [showExportImage, setShowExportImage] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [hiddenLabelTypes, setHiddenLabelTypes] = useState<Set<string>>(new Set());
  const [mcpConfigured, setMcpConfigured] = useState(false);

  // Check MCP status (injected by Swift after page load)
  useEffect(() => {
    const check = () => {
      const val = (window as unknown as Record<string, unknown>).__MCP_CONFIGURED__;
      if (val === true) setMcpConfigured(true);
    };
    check();
    const timer = setTimeout(check, 1000); // re-check after Swift injection
    return () => clearTimeout(timer);
  }, []);
  const [labelMenuOpen, setLabelMenuOpen] = useState(false);
  // analysis is computed via useMemo above
  const [analysisNodeTypes, setAnalysisNodeTypes] = useState<Set<string> | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [pathFrom, setPathFrom] = useState<string | null>(null);
  const [pathTo, setPathTo] = useState<string | null>(null);
  const [highlightedCommunity, setHighlightedCommunity] = useState<number | null>(null);
  const [communityOverlay, setCommunityOverlay] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<string[] | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<import("./types/graph-ir").GraphEdge | null>(null);
  const [edgePopoverPos, setEdgePopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [loadedNativeTemplates, setLoadedNativeTemplates] = useState<Map<string, TaxonomyWizardInitial>>(new Map());
  const [nativeMaps, setNativeMaps] = useState<{ name: string; path: string }[]>([]);

  // File loading: WASM parser init + file content loading
  const resetUI = useCallback(() => {
    setSelectedNode(null);
    setRevealedNodes(new Set());
    setFilters(createEmptyFilterState());
  }, []);
  const { parserReady, error, setError, loadFileContent } = useFileLoader(
    template, setGraphData, setTemplate, resetUI, setSourceFilePath
  );

  // Active node type configs — from template or defaults
  const nodeTypeConfigs: NodeTypeConfig[] = template?.node_types ?? DEFAULT_NODE_TYPES;

  // Compute network analysis when graph data or node type filter changes
  const analysis = useMemo(() => {
    if (!graphData || graphData.nodes.length === 0) return null;
    let filteredNodes = graphData.nodes;
    let filteredEdges = graphData.edges;
    if (analysisNodeTypes !== null) {
      const nodeIds = new Set(filteredNodes.filter((n) => analysisNodeTypes.has(n.node_type)).map((n) => n.id));
      filteredNodes = graphData.nodes.filter((n) => nodeIds.has(n.id));
      filteredEdges = graphData.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));
    }
    return analyzeNetwork(filteredNodes, filteredEdges);
  }, [graphData, analysisNodeTypes]);

  // Path finder handler
  const handleFindPath = useCallback((fromId: string, toId: string) => {
    if (!graphData) return;
    const result = findShortestPaths(graphData.nodes, graphData.edges, fromId, toId);
    setPathResult(result);
    if (result.paths.length > 0) {
      setHighlightedPath(result.paths[0]);
    }
  }, [graphData]);

  const handleClearPath = useCallback(() => {
    setPathResult(null);
    setHighlightedPath(null);
  }, []);

  // Expose bridge functions for Swift WKWebView
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;

    win.loadFileContentBase64 = (base64: string, filename: string, filePath?: string) => {
      try {
        const content = atob(base64);
        const bytes = Uint8Array.from(content, (c) => c.charCodeAt(0));
        const decoded = new TextDecoder().decode(bytes);
        // Restore edge colors from .cm header
        const ecMatch = decoded.match(/<!--\s*edge-colors:\s*(\{.+?\})\s*-->/);
        if (ecMatch) {
          try { setEdgeColorOverrides(JSON.parse(ecMatch[1])); } catch { /* ignore */ }
        } else {
          setEdgeColorOverrides({});
        }
        loadFileContent(decoded, filename, filePath);
      } catch (err) {
        console.error("[Bridge] decode error:", err);
      }
    };

    // Load a map with its template in one call (avoids race conditions)
    win.loadMapWithTemplate = (mapBase64: string, _filename: string, filePath: string, tmplBase64: string) => {
      try {
        const mapBytes = Uint8Array.from(atob(mapBase64), (c) => c.charCodeAt(0));
        const decoded = new TextDecoder().decode(mapBytes);
        // Decode template from base64
        let tmpl: TaxonomyTemplate | null = null;
        if (tmplBase64) {
          try {
            const tmplBytes = Uint8Array.from(atob(tmplBase64), (c) => c.charCodeAt(0));
            const tmplStr = new TextDecoder().decode(tmplBytes);
            if (tmplStr !== "null") tmpl = JSON.parse(tmplStr) as TaxonomyTemplate;
          } catch { /* ignore */ }
        }
        // Parse and migrate with the template
        const normalized = normalizeFencedKV(decoded);
        const result = parseMarkdown(normalized);
        const data = result.graph;
        if (data.nodes.length > 0) {
          const { template: migratedTemplate, data: migratedData } = migrateFromParser(data, tmpl);
          const ir = graphIRFromData(migratedTemplate, migratedData);
          // Preserve template reference from the .cm file header
          const tmplMatch = decoded.match(/<!--\s*template:\s*(.+?)\s*-->/i);
          const tmplRef = tmplMatch?.[1]?.trim();
          if (tmplRef) ir.metadata.source_template = tmplRef.endsWith(".cmt") ? tmplRef : `${tmplRef}.cmt`;
          // Restore edge color overrides from .cm file header
          const edgeColorsMatch = decoded.match(/<!--\s*edge-colors:\s*(\{.+?\})\s*-->/);
          if (edgeColorsMatch) {
            try {
              const colors = JSON.parse(edgeColorsMatch[1]) as Record<string, string>;
              setEdgeColorOverrides(colors);
            } catch { /* ignore malformed */ }
          } else {
            setEdgeColorOverrides({});
          }
          setGraphData(ir);
          setTemplate(migratedTemplate);
          setSelectedNode(null);
          setRevealedNodes(new Set());
          setFilters(createEmptyFilterState());
          setError(null);
          setSourceFilePath(filePath ?? null);
        }
      } catch (err) {
        console.error("[Bridge] loadMapWithTemplate error:", err);
      }
    };

    win.getGraphJSON = (): string => {
      if (!graphData) return "";
      return exportToMarkdown(graphData, nodeTypeConfigs, edgeColorOverrides);
    };

    win.getGraphMarkdown = (): string => {
      if (!graphData) return "";
      return exportToMarkdown(graphData, nodeTypeConfigs, edgeColorOverrides);
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
  }, [loadFileContent, graphData, nodeTypeConfigs, templateFilePath, setGraphData]);

  const handleViewModeChange = useCallback((mode: string) => {
    setViewMode(mode);
    setRevealedNodes(new Set());
  }, []);

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
    [graphData, setGraphData]
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
    (nodeType: string, name: string, classifierValues: Record<string, string>, tags: string[], properties: Record<string, string | undefined>) => {
      if (!graphData) return;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

      const newNode: GraphNode = {
        id,
        node_type: nodeType,
        name,
        classifiers: classifierValues,
        tags: tags.length > 0 ? tags : undefined,
        properties: { ...properties },
      };

      setGraphData({ ...graphData, nodes: [...graphData.nodes, newNode] });
      setShowAddNode(null);
      setSelectedNode(newNode);
    },
    [graphData, setGraphData]
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
    [graphData, setGraphData, edgeSource, edgeTarget, template?.edge_types]
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
  }, [graphData, setGraphData]);

  const handleDeleteEdge = useCallback((fromId: string, toId: string) => {
    if (!graphData) return;
    setGraphData({
      ...graphData,
      edges: graphData.edges.filter((e) => !(e.from === fromId && e.to === toId)),
    });
    setSelectedEdge(null);
    setEdgePopoverPos(null);
  }, [graphData, setGraphData]);

  // Export image handler — captures current canvas to PNG or PDF
  const handleExportImage = useCallback((options: ExportImageOptions) => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    setShowExportImage(false);

    // Create an off-screen canvas at the desired scale
    const w = canvas.width;
    const h = canvas.height;
    const scale = options.scale;
    const offscreen = document.createElement("canvas");
    offscreen.width = w * scale / (window.devicePixelRatio || 1);
    offscreen.height = h * scale / (window.devicePixelRatio || 1);
    const ctx = offscreen.getContext("2d")!;

    // Fill background
    const bgColor = options.background === "as-viewed"
      ? theme.canvasBg
      : options.customColor;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    // Draw current canvas content onto the off-screen canvas
    ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);

    const title = graphData?.metadata.title ?? "concept-map";
    const filename = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const sendToSwift = (handler: string, payload: string) => {
      const webkit = (window as unknown as Record<string, unknown>).webkit as
        | { messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }> }
        | undefined;
      webkit?.messageHandlers?.[handler]?.postMessage(payload);
    };
    const isNativeApp = !!(window as unknown as Record<string, unknown>).webkit;

    if (options.format === "png") {
      const dataURL = offscreen.toDataURL("image/png");
      const base64 = dataURL.split(",")[1];
      if (isNativeApp) {
        sendToSwift("saveToDownloads", JSON.stringify({ data: base64, filename: `${filename}.png` }));
      } else {
        // Browser fallback
        const a = document.createElement("a");
        a.href = dataURL;
        a.download = `${filename}.png`;
        a.click();
      }
    } else {
      // PDF using jsPDF
      const imgData = offscreen.toDataURL("image/png");
      const pxToMm = 0.264583;
      const pdfW = offscreen.width * pxToMm;
      const pdfH = offscreen.height * pxToMm;
      const pdf = new jsPDF({ orientation: pdfW > pdfH ? "landscape" : "portrait", unit: "mm", format: [pdfW, pdfH] });
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      if (isNativeApp) {
        const pdfBase64 = pdf.output("datauristring").split(",")[1];
        sendToSwift("saveToDownloads", JSON.stringify({ data: pdfBase64, filename: `${filename}.pdf` }));
      } else {
        pdf.save(`${filename}.pdf`);
      }
    }
  }, [theme, graphData]);

  // Keyboard shortcuts: Escape to cancel edge drawing, Delete/Backspace to delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        if (undoStack.current.length > 0) {
          const prev = undoStack.current[undoStack.current.length - 1];
          undoStack.current = undoStack.current.slice(0, -1);
          setGraphDataRaw((current) => {
            if (current) redoStack.current = [current, ...redoStack.current];
            return prev;
          });
          setSelectedNode(null);
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        if (redoStack.current.length > 0) {
          const next = redoStack.current[0];
          redoStack.current = redoStack.current.slice(1);
          setGraphDataRaw((current) => {
            if (current) undoStack.current = [...undoStack.current, current];
            return next;
          });
          setSelectedNode(null);
        }
        return;
      }
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

  // Request native templates and maps on mount; clear stale localStorage cache
  useEffect(() => {
    if (isNativeApp) {
      localStorage.removeItem("cm-templates");
      sendToSwift("listTemplates");
      sendToSwift("listMaps");
    }
  }, [isNativeApp, sendToSwift]);

  // Auto-save to source file path (debounced) — saves markdown
  const autoSave = useCallback(() => {
    if (!graphData || !sourceFilePath || !isNativeApp) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const md = exportToMarkdown(graphData, nodeTypeConfigs, edgeColorOverrides);
      sendToSwift("saveToPath", JSON.stringify({ path: sourceFilePath, content: md }));
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 2000);
    }, 2000);
  }, [graphData, sourceFilePath, isNativeApp, sendToSwift, nodeTypeConfigs, edgeColorOverrides]);

  // Trigger auto-save when graph data or edge colors change
  const graphDataRef = useRef(graphData);
  const edgeColorsRef = useRef(edgeColorOverrides);
  useEffect(() => {
    if (graphDataRef.current && graphData && graphDataRef.current !== graphData) {
      autoSave();
    }
    graphDataRef.current = graphData;
  }, [graphData, autoSave]);
  useEffect(() => {
    if (graphData && edgeColorsRef.current !== edgeColorOverrides) {
      autoSave();
    }
    edgeColorsRef.current = edgeColorOverrides;
  }, [edgeColorOverrides, graphData, autoSave]);

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
      classifiers: data.classifiers,
      node_types: data.node_types,
      edge_types: data.edge_types,
    };

    if (graphData && taxonomyEditData) {
      // Edit mode: update metadata + template on existing graph
      const updated: GraphIR = {
        ...graphData,
        metadata: {
          ...graphData.metadata,
          title: data.title,
          classifiers: data.classifiers,
          streams: [],
          generations: [],
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
          classifiers: data.classifiers,
          generations: [],
          streams: [],
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
  }, [isNativeApp, sendToSwift, graphData, setGraphData, taxonomyEditData]);

  // Create a new empty map using an existing template's structure (no wizard)
  const handleNewFileFromTemplate = useCallback((tmplData: TaxonomyWizardInitial) => {
    const mapTitle = "Untitled Map";
    const newTemplate: TaxonomyTemplate = {
      title: tmplData.title,
      description: tmplData.description,
      classifiers: tmplData.classifiers,
      streams: tmplData.streams,
      generations: tmplData.generations,
      node_types: tmplData.node_types ?? DEFAULT_NODE_TYPES,
      edge_types: tmplData.edge_types,
    };
    const classifiers = getTemplateClassifiers(newTemplate);

    const newGraph: GraphIR = {
      version: "2.0",
      metadata: {
        title: mapTitle,
        classifiers,
        generations: tmplData.generations ?? [],
        streams: tmplData.streams ?? [],
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
  }, [isNativeApp, sendToSwift, setGraphData]);

  // Open wizard in edit mode with current taxonomy data
  const handleEditTaxonomy = useCallback(() => {
    if (!graphData) return;
    setTaxonomyEditData({
      title: graphData.metadata.title ?? "",
      description: graphData.metadata.structural_observations[0] ?? undefined,
      classifiers: graphData.metadata.classifiers,
      streams: graphData.metadata.streams,
      generations: graphData.metadata.generations,
      node_types: nodeTypeConfigs,
      edge_types: template?.edge_types,
    });
    setShowTaxonomyWizard(true);
  }, [graphData, nodeTypeConfigs, template]);

  // Save taxonomy as a reusable template
  const handleSaveTemplate = useCallback((data: TaxonomyWizardResult) => {
    const tmpl: TaxonomyWizardInitial = {
      title: data.title,
      description: data.description,
      classifiers: data.classifiers,
      node_types: data.node_types,
      edge_types: data.edge_types,
    };

    if (isNativeApp) {
      const templateJson = JSON.stringify({
        title: data.title,
        description: data.description,
        format_instructions: "When generating .cm files from this template: use markdown with fenced code blocks for nodes. Every property line MUST use 'key: value' format with a colon separator. Required node keys: id, name. Classifier values use the classifier id as the key. Tags use comma-separated format. Edges use 'from: [id] to: [id] type: [edge_type]' format.",
        classifiers: data.classifiers,
        node_types: data.node_types,
        edge_types: data.edge_types,
      }, null, 2);
      sendToSwift("saveTemplate", JSON.stringify({ content: templateJson, title: data.title }));
    }

    // Also store in localStorage
    const stored = JSON.parse(localStorage.getItem("cm-templates") || "[]");
    stored.push(tmpl);
    localStorage.setItem("cm-templates", JSON.stringify(stored));
  }, [isNativeApp, sendToSwift]);

  const getSavedTemplates = useCallback((): TaxonomyWizardInitial[] => {
    // In native app, templates come exclusively from the file system
    if (isNativeApp) {
      return Array.from(loadedNativeTemplates.values());
    }
    // Browser fallback: localStorage only
    try { return JSON.parse(localStorage.getItem("cm-templates") || "[]"); }
    catch { return []; }
  }, [isNativeApp, loadedNativeTemplates]);

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
    if (edge) { setSelectedNode(null); setNotesOpen(true); }
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
  }, [graphData, setGraphData]);

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

  const handleAttributeToggle = (nodeType: string, field: string, value: string, allValues: string[]) => {
    setFilters((prev) => {
      const attrs = [...prev.attributes];
      const idx = attrs.findIndex((a) => a.nodeType === nodeType && a.field === field);
      if (idx < 0) {
        // First click: uncheck this value (show all EXCEPT this one)
        const next = new Set(allValues);
        next.delete(value);
        attrs.push({ nodeType, field, values: next });
      } else {
        const current = attrs[idx].values;
        if (!current) {
          const next = new Set(allValues);
          next.delete(value);
          attrs[idx] = { nodeType, field, values: next };
        } else {
          const next = new Set(current);
          if (next.has(value)) {
            next.delete(value);
            attrs[idx] = { nodeType, field, values: next };
          } else {
            next.add(value);
            if (next.size >= allValues.length) {
              // All re-checked → remove filter entry
              attrs.splice(idx, 1);
            } else {
              attrs[idx] = { nodeType, field, values: next };
            }
          }
        }
      }
      return { ...prev, attributes: attrs };
    });
  };

  const handleDateRangeChange = (nodeType: string, fromField: string, toField: string | undefined, bound: "from" | "to", value: string) => {
    setFilters((prev) => {
      const ranges = [...prev.dateRanges];
      const idx = ranges.findIndex((d) => d.nodeType === nodeType && d.fromField === fromField && d.toField === (toField ?? undefined));
      const current = idx >= 0 ? ranges[idx].range : { from: null, to: null };
      const updated = { ...current, [bound]: value || null };
      if (updated.from === null && updated.to === null) {
        if (idx >= 0) ranges.splice(idx, 1);
      } else if (idx >= 0) {
        ranges[idx] = { nodeType, fromField, toField, range: updated };
      } else {
        ranges.push({ nodeType, fromField, toField, range: updated });
      }
      return { ...prev, dateRanges: ranges };
    });
  };

  const handleShowAllFilters = () => {
    setFilters(createEmptyFilterState());
  };

  const handleClassifierToggle = (classifierId: string, valueId: string, allValueIds: string[]) => {
    setFilters((prev) => {
      const cfs = [...prev.classifiers];
      const idx = cfs.findIndex((c) => c.classifierId === classifierId);
      if (idx < 0) {
        const next = new Set(allValueIds);
        next.delete(valueId);
        cfs.push({ classifierId, values: next });
      } else {
        const current = cfs[idx].values;
        if (!current) {
          const next = new Set(allValueIds);
          next.delete(valueId);
          cfs[idx] = { classifierId, values: next };
        } else {
          const next = new Set(current);
          if (next.has(valueId)) {
            next.delete(valueId);
            cfs[idx] = { classifierId, values: next };
          } else {
            next.add(valueId);
            if (next.size >= allValueIds.length) {
              cfs.splice(idx, 1);
            } else {
              cfs[idx] = { classifierId, values: next };
            }
          }
        }
      }
      return { ...prev, classifiers: cfs };
    });
  };

  const handleClassifierLayoutChange = useCallback((classifierId: string, newLayout: string) => {
    if (!graphData) return;
    const layout = newLayout === "none" ? undefined : newLayout as "x" | "y" | "region" | "region-column";
    // Clear conflicting layouts: only one classifier can own each layout axis
    // "region" and "region-column" share the same slot
    const isRegionType = (l?: string) => l === "region" || l === "region-column";
    const conflicts = (existing?: string) => {
      if (!layout) return false;
      if (layout === existing) return true;
      if (isRegionType(layout) && isRegionType(existing)) return true;
      return false;
    };
    const updatedClassifiers = (graphData.metadata.classifiers ?? []).map((cls) => {
      if (cls.id === classifierId) return { ...cls, layout };
      if (conflicts(cls.layout)) return { ...cls, layout: undefined };
      return cls;
    });
    setGraphData({
      ...graphData,
      metadata: { ...graphData.metadata, classifiers: updatedClassifiers },
    });
    if (template) {
      setTemplate({
        ...template,
        classifiers: updatedClassifiers,
      });
    }
  }, [graphData, template, setGraphData]);

  const handleResetLayout = useCallback(() => {
    if (!graphData) return;
    const clearedClassifiers = (graphData.metadata.classifiers ?? []).map(
      (cls) => ({ ...cls, layout: undefined }),
    );
    setGraphData({
      ...graphData,
      metadata: { ...graphData.metadata, classifiers: clearedClassifiers },
    });
    if (template) {
      setTemplate({ ...template, classifiers: clearedClassifiers });
    }
  }, [graphData, template, setGraphData]);

  const handlePromoteAttributeToClassifier = useCallback((field: string, label: string, values: string[], newLayout: string) => {
    if (!graphData) return;
    const layout = newLayout === "none" ? undefined : newLayout as "x" | "y" | "region" | "region-column";
    const DEFAULT_COLORS = ["#4A90D9", "#50C878", "#FF7F50", "#9B59B6", "#F1C40F", "#E74C3C", "#1ABC9C", "#E67E22"];
    const newClassifier: import("./types/graph-ir").Classifier = {
      id: field,
      label,
      layout,
      values: values.map((v, i) => ({ id: v, label: v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " "), color: DEFAULT_COLORS[i % DEFAULT_COLORS.length] })),
    };
    // Clear conflicting layouts from existing classifiers
    const isRegionType = (l?: string) => l === "region" || l === "region-column";
    const conflicts = (existing?: string) => {
      if (!layout) return false;
      if (layout === existing) return true;
      if (isRegionType(layout) && isRegionType(existing)) return true;
      return false;
    };
    const clearedClassifiers = (graphData.metadata.classifiers ?? []).map((cls) =>
      conflicts(cls.layout) ? { ...cls, layout: undefined } : cls
    );
    const updatedClassifiers = [...clearedClassifiers, newClassifier];
    // Move field values from properties to classifiers on each node
    const updatedNodes = graphData.nodes.map((n) => {
      const val = n.properties?.[field];
      if (val && typeof val === "string") {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [field]: _, ...restProps } = (n.properties ?? {}) as Record<string, string | string[] | number | undefined>;
        return { ...n, classifiers: { ...(n.classifiers ?? {}), [field]: val }, properties: restProps };
      }
      return n;
    });
    setGraphData({
      ...graphData,
      nodes: updatedNodes,
      metadata: { ...graphData.metadata, classifiers: updatedClassifiers },
    });
    if (template) {
      setTemplate({ ...template, classifiers: updatedClassifiers });
    }
  }, [graphData, template, setGraphData]);

  const handleTagToggle = (tag: string, allTags: string[]) => {
    setFilters((prev) => {
      const tags = prev.tags;
      if (!tags) {
        const next = new Set(allTags);
        next.delete(tag);
        return { ...prev, tags: next };
      }
      const next = new Set(tags);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
        if (next.size >= allTags.length) return { ...prev, tags: null };
      }
      return { ...prev, tags: next };
    });
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
                        {(t.classifiers?.length ?? 0) > 0 ? ` \u00B7 ${t.classifiers!.length} classifier${t.classifiers!.length > 1 ? "s" : ""}` : ""}
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
          onViewModeChange={handleViewModeChange}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSettings={() => setShowSettings(true)}
          onEditTaxonomy={handleEditTaxonomy}
          onOpenHelp={() => setShowHelp(true)}
          onFitToView={() => fitToViewRef.current?.()}
          onExportImage={() => setShowExportImage(true)}
          onToggleAnalysis={() => setAnalysisOpen(!analysisOpen)}
          analysisOpen={analysisOpen}
          nodeTypeConfigs={nodeTypeConfigs}
          onExplode={() => setExploded((v) => !v)}
          exploded={exploded}
          layoutPreset={layoutPreset}
          onLayoutPresetChange={setLayoutPreset}
          onResetLayout={handleResetLayout}
          onToggleProperties={() => {
            if (selectedNode) {
              setSelectedNode(null);
            } else if (graphData.nodes.length > 0) {
              setSelectedNode(graphData.nodes[0]);
            }
          }}
          propertiesOpen={!!selectedNode}
          onToggleNotes={() => {
            if (notesOpen) {
              setNotesOpen(false);
            } else {
              setNotesOpen(true);
              if (!selectedNode && !selectedEdge && graphData.nodes.length > 0) {
                setSelectedNode(graphData.nodes[0]);
              }
            }
          }}
          notesOpen={notesOpen}
        />

        {sidebarOpen && (
          <Sidebar
            nodes={graphData.nodes}
            classifiers={graphData.metadata.classifiers ?? []}
            nodeTypeConfigs={nodeTypeConfigs}
            filters={filters}
            onClassifierToggle={handleClassifierToggle}
            onClassifierLayoutChange={handleClassifierLayoutChange}
            onPromoteAttributeToClassifier={handlePromoteAttributeToClassifier}
            onTagToggle={handleTagToggle}
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
              look={look}
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
              onRegisterZoom={(fns) => { zoomFnsRef.current = fns; }}
              hiddenLabelTypes={hiddenLabelTypes}
              communityOverlay={communityOverlay ? analysis?.communities : undefined}
              highlightedPath={highlightedPath}
              highlightedCommunity={highlightedCommunity}
              exploded={exploded}
              layoutPreset={layoutPreset}
              edgeTypeConfigs={template?.edge_types}
            />
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={() => zoomFnsRef.current?.zoomIn()} title="Zoom in">+</button>
              <button className="zoom-btn" onClick={() => zoomFnsRef.current?.zoomOut()} title="Zoom out">-</button>
              <button className="zoom-btn zoom-btn-fit" onClick={() => fitToViewRef.current?.()} title="Fit to view">Fit</button>
              <button
                className={`zoom-btn zoom-btn-fit ${hiddenLabelTypes.size > 0 ? "zoom-btn-off" : ""}`}
                onClick={() => setLabelMenuOpen(!labelMenuOpen)}
                title="Label visibility"
              >Aa</button>
              {labelMenuOpen && (
                <div className="label-menu">
                  <div className="label-menu-header">Show Labels</div>
                  <label className="label-menu-item">
                    <input type="checkbox" checked={hiddenLabelTypes.size === 0}
                      onChange={() => setHiddenLabelTypes(new Set())} />
                    <span>All</span>
                  </label>
                  <div className="label-menu-group">Nodes</div>
                  {nodeTypeConfigs.map((nt) => (
                    <label key={nt.id} className="label-menu-item">
                      <input type="checkbox" checked={!hiddenLabelTypes.has(`node:${nt.id}`)}
                        onChange={() => {
                          const next = new Set(hiddenLabelTypes);
                          const key = `node:${nt.id}`;
                          if (next.has(key)) next.delete(key); else next.add(key);
                          setHiddenLabelTypes(next);
                        }} />
                      <span>{nt.label}</span>
                    </label>
                  ))}
                  {template?.edge_types && template.edge_types.length > 0 && (
                    <>
                      <div className="label-menu-group">Edges</div>
                      {template.edge_types.map((et) => (
                        <label key={et.id} className="label-menu-item">
                          <input type="checkbox" checked={!hiddenLabelTypes.has(`edge:${et.id}`)}
                            onChange={() => {
                              const next = new Set(hiddenLabelTypes);
                              const key = `edge:${et.id}`;
                              if (next.has(key)) next.delete(key); else next.add(key);
                              setHiddenLabelTypes(next);
                            }} />
                          <span>{et.label}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
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
          {selectedNode && notesOpen && (
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
          {!selectedNode && selectedEdge && notesOpen && (
            <>
              <div className="pane-resizer-h" onMouseDown={makeVerticalResizeHandler(setNotesHeight, notesHeight)} />
              <div className="notes-bottom-pane" style={{ height: notesHeight }}>
                <EdgeNotesPane
                  edge={selectedEdge}
                  nodes={graphData.nodes}
                  onEdgeUpdate={handleEdgeUpdate}
                />
              </div>
            </>
          )}
          {!selectedNode && !selectedEdge && notesOpen && (
            <>
              <div className="pane-resizer-h" onMouseDown={makeVerticalResizeHandler(setNotesHeight, notesHeight)} />
              <div className="notes-bottom-pane" style={{ height: notesHeight }}>
                <div style={{ padding: 16, color: "var(--text-dim)", fontSize: 12, fontStyle: "italic" }}>
                  Select a node or edge to see its notes.
                </div>
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
                classifiers={graphData.metadata.classifiers ?? []}
                nodeTypeConfigs={nodeTypeConfigs}
                template={template}
                onNodeUpdate={handleNodeUpdate}
                onNavigateToNode={handleNavigateToNode}
                onOpenNotes={() => setNotesOpen(!notesOpen)}
                notesOpen={notesOpen}
                onNodeDelete={handleDeleteNode}
                analysis={analysis}
              />
            </div>
          </>
        )}

        {analysisOpen && (
          <AnalysisPanel
            analysis={analysis}
            nodes={graphData.nodes}
            nodeTypeConfigs={nodeTypeConfigs}
            analysisNodeTypes={analysisNodeTypes}
            onSetAnalysisNodeTypes={setAnalysisNodeTypes}
            selectedNodeId={selectedNode?.id ?? null}
            pathResult={pathResult}
            onSelectNode={(id) => {
              const node = graphData.nodes.find((n) => n.id === id);
              if (node) { setSelectedNode(node); setHighlightedCommunity(null); }
            }}
            onDeselectNode={() => { setSelectedNode(null); }}
            onHighlightCommunity={(idx) => { setHighlightedCommunity(idx); if (idx != null) setSelectedNode(null); }}
            onFocusCommunity={(memberIds) => {
              // Reveal only community members and their inter-connections, then fit to view
              setRevealedNodes(new Set(memberIds));
              setCommunityOverlay(true);
              setHighlightedCommunity(analysis?.communities.get(memberIds[0]) ?? null);
              // Brief delay to let render update, then fit to view
              setTimeout(() => fitToViewRef.current?.(), 100);
            }}
            highlightedCommunity={highlightedCommunity}
            communityOverlay={communityOverlay}
            onToggleCommunityOverlay={() => setCommunityOverlay(!communityOverlay)}
            onFindPath={handleFindPath}
            onClearPath={handleClearPath}
            pathFrom={pathFrom}
            pathTo={pathTo}
            onSetPathFrom={setPathFrom}
            onSetPathTo={setPathTo}
          />
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        nodeCount={graphData.nodes.length}
        edgeCount={graphData.edges.length}
        saveIndicator={saveIndicator}
        interactionMode={interactionMode}
        themeName={theme.name}
        mcpConfigured={mcpConfigured}
      />

      {showAddNode && (
        <AddNodeModal
          nodeTypeConfigs={nodeTypeConfigs}
          classifiers={graphData.metadata.classifiers ?? []}
          onAdd={handleAddNode}
          onCancel={() => setShowAddNode(null)}
          initialNodeType={showAddNode}
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
      {showHelp && (
        <HelpPanel onClose={() => setShowHelp(false)} />
      )}
      {showExportImage && (
        <ExportImageModal
          onExport={handleExportImage}
          onCancel={() => setShowExportImage(false)}
          currentBgColor={theme.canvasBg}
        />
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

function exportToMarkdown(data: GraphIR, nodeTypeConfigs: NodeTypeConfig[], edgeColorOverrides?: Record<string, string>): string {
  const lines: string[] = [];
  const title = data.metadata.title || "Concept Map";
  lines.push(`# ${title}\n`);
  if (data.metadata.source_template) {
    lines.push(`<!-- template: ${data.metadata.source_template} -->`);
  }
  // Persist edge color overrides as an HTML comment so they survive round-trips
  if (edgeColorOverrides && Object.keys(edgeColorOverrides).length > 0) {
    lines.push(`<!-- edge-colors: ${JSON.stringify(edgeColorOverrides)} -->`);
  }
  lines.push(`<!-- Exported from concept-mapper, ${new Date().toISOString().split("T")[0]}. -->\n`);

  // Structure (classifiers, node types, edge types) lives in the .cmt template.
  // The .cm file only stores content: nodes, edges, and observations.

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

      // Write classifier values (e.g. category: idea, urgency: now)
      if (node.classifiers) {
        for (const [key, value] of Object.entries(node.classifiers)) {
          if (value != null && value !== "") {
            lines.push(`${key}: ${value}`);
          }
        }
      }

      // Write tags
      if (node.tags && node.tags.length > 0) {
        lines.push(`tags: ${node.tags.join(", ")}`);
      }

      // Write properties
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
    <ErrorBoundary>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
