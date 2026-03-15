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
import "./App.css";

export type ViewMode = string; // "full" or a node type id
export type InteractionMode = "normal" | "add-edge-source" | "add-edge-target";

function mergeNodeUpdate(node: GraphNode, updates: Partial<GraphNode>): GraphNode {
  const merged = { ...node, ...updates };
  if (updates.thinker_fields && node.thinker_fields) {
    merged.thinker_fields = { ...node.thinker_fields, ...updates.thinker_fields };
  }
  if (updates.concept_fields && node.concept_fields) {
    merged.concept_fields = { ...node.concept_fields, ...updates.concept_fields };
  }
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auxPanelWidth, setAuxPanelWidth] = useState(340);
  const [notesHeight, setNotesHeight] = useState(250);
  const [notesOpen, setNotesOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeStreams, setActiveStreams] = useState<Set<string> | null>(null);
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
  const [selectedEdge, setSelectedEdge] = useState<import("./types/graph-ir").GraphEdge | null>(null);
  const [edgePopoverPos, setEdgePopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [loadedNativeTemplates, setLoadedNativeTemplates] = useState<Map<string, TaxonomyWizardInitial>>(new Map());

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
          const result = parseMarkdown(content);
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
              };
              const ir = graphIRFromData(tmpl, cmData);
              setGraphData(ir);
              setTemplate(ir.metadata.template ?? tmpl);
              setSelectedNode(null);
              setRevealedNodes(new Set());
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
        // If we have a graph, set as active template
        if (graphData) {
          setTemplate(tmpl);
        }
        // Also cache it by title for the empty state
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

    return () => {
      delete win.loadFileContentBase64;
      delete win.getGraphJSON;
      delete win.getGraphMarkdown;
      delete win.getCanvasImage;
      delete win.taxonomySaved;
      delete win.showTaxonomyWizard;
      delete win.templatesLoaded;
      delete win.templateLoaded;
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

      // Backfill legacy fields for rendering compat
      if (config?.shape === "circle" || nodeType === "person") {
        newNode.thinker_fields = {
          eminence: (properties.importance as string) ?? "minor",
          structural_roles: [],
          key_concept_ids: [],
        };
      }
      if (config?.shape === "rectangle" || nodeType === "concept") {
        newNode.concept_fields = {
          originator_id: (properties.originator_id as string) ?? "unknown_author",
          concept_type: (properties.concept_type as string) ?? "framework",
          abstraction_level: (properties.abstraction_level as string) ?? "operational",
          status: (properties.status as string) ?? "active",
        };
      }

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

      // Determine edge category based on shapes
      const fromConfig = nodeTypeConfigs.find((t) => t.id === fromNode.node_type);
      const toConfig = nodeTypeConfigs.find((t) => t.id === toNode.node_type);
      const fromIsCircle = fromConfig ? fromConfig.shape === "circle" : fromNode.node_type !== "concept";
      const toIsCircle = toConfig ? toConfig.shape === "circle" : toNode.node_type !== "concept";

      const edgeCategory =
        fromIsCircle && toIsCircle ? "thinker_thinker"
        : !fromIsCircle && !toIsCircle ? "concept_concept"
        : "thinker_concept";

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
        edge_category: edgeCategory as GraphEdge["edge_category"],
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

  // Escape key to cancel edge drawing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && interactionMode !== "normal") {
        handleCancelAddEdge();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [interactionMode, handleCancelAddEdge]);

  const isNativeApp = !!(window as unknown as Record<string, unknown>).webkit;

  const sendToSwift = useCallback((handler: string, payload?: unknown) => {
    const webkit = (window as unknown as Record<string, unknown>).webkit as
      | { messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }> }
      | undefined;
    webkit?.messageHandlers?.[handler]?.postMessage(payload ?? {});
  }, []);

  // Request native templates on mount
  useEffect(() => {
    if (isNativeApp) {
      sendToSwift("listTemplates");
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
    };

    if (isNativeApp) {
      const templateJson = JSON.stringify({
        title: data.title,
        description: data.description,
        streams: data.streams,
        generations: data.generations,
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
          const delta = startY - moveEvent.clientX;
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

  const handleStreamToggle = (streamId: string) => {
    setActiveStreams((prev) => {
      if (!prev) {
        return new Set([streamId]);
      }
      const next = new Set(prev);
      if (next.has(streamId)) {
        next.delete(streamId);
        if (next.size === 0) return null;
      } else {
        next.add(streamId);
      }
      return next;
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
          <div className="empty-state-subtitle">Create a new taxonomy or open an existing file</div>

          {/* Templates — shown prominently when available */}
          {templates.length > 0 && (
            <div className="empty-state-templates">
              <div className="empty-state-templates-label">Start from a template</div>
              <div className="empty-state-templates-list">
                {templates.map((t, i) => (
                  <button
                    key={i}
                    className="empty-state-template-btn"
                    onClick={() => { setTaxonomyEditData(t); setShowTaxonomyWizard(true); }}
                  >
                    {t.title}
                    <span className="template-meta">
                      {t.node_types?.length ?? 0} types, {t.streams.length} categories, {t.generations.length} horizons
                    </span>
                    {isLLMConfigured && (
                      <button
                        className="template-map-btn"
                        title="Map text to this template"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMappingModal(true);
                        }}
                      >
                        Map Text
                      </button>
                    )}
                    <button
                      className="template-delete-btn"
                      title="Remove template"
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = templates.filter((_, idx) => idx !== i);
                        localStorage.setItem("cm-templates", JSON.stringify(updated));
                        setError(null);
                      }}
                    >
                      &times;
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="empty-state-actions">
            <button className="empty-state-btn primary" onClick={() => { setTaxonomyEditData(undefined); setShowTaxonomyWizard(true); }}>
              New Taxonomy
            </button>
            {isLLMConfigured && (
              <button className="empty-state-btn primary" onClick={() => setShowMappingModal(true)}>
                Map Text
              </button>
            )}
            <button className="empty-state-btn secondary" onClick={handleImportFile}>
              Open File
            </button>
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
            className="search-input"
            type="text"
            placeholder="Search nodes... (\u2318K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          />
          {searchFocused && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((n) => {
                const typeConfig = nodeTypeConfigs.find((t) => t.id === n.node_type);
                return (
                  <div key={n.id} className="search-result" onMouseDown={() => handleSearchSelect(n)}>
                    <span
                      className={`type-indicator ${typeConfig?.shape === "rectangle" ? "concept" : ""}`}
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
          llmAvailable={isLLMConfigured}
          onOpenHelp={() => setShowHelp(true)}
          nodeTypeConfigs={nodeTypeConfigs}
        />

        {sidebarOpen && (
          <Sidebar
            nodes={graphData.nodes}
            streams={graphData.metadata.streams}
            nodeTypeConfigs={nodeTypeConfigs}
            activeStreams={activeStreams}
            onStreamToggle={handleStreamToggle}
            onShowAll={() => setActiveStreams(null)}
            onSelectNode={(node) => { setSelectedNode(node); }}
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
              activeStreams={activeStreams}
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
            />
            {selectedEdge && edgePopoverPos && (
              <EdgePopover
                edge={selectedEdge}
                position={edgePopoverPos}
                onUpdate={handleEdgeUpdate}
                onClose={() => { setSelectedEdge(null); setEdgePopoverPos(null); }}
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
                onNodeUpdate={handleNodeUpdate}
                onNavigateToNode={handleNavigateToNode}
                onOpenNotes={() => setNotesOpen(!notesOpen)}
                notesOpen={notesOpen}
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

  // Group nodes by type config
  const circleTypes = nodeTypeConfigs.filter((c) => c.shape === "circle").map((c) => c.id);
  const rectTypes = nodeTypeConfigs.filter((c) => c.shape === "rectangle").map((c) => c.id);

  // Write all nodes grouped by type, using the Rust parser's expected format
  const personNodes = data.nodes.filter((n) => circleTypes.includes(n.node_type));
  if (personNodes.length > 0) {
    lines.push("## Thinker Nodes\n");
    for (const t of personNodes) {
      lines.push("```");
      lines.push(`id:               ${t.id}`);
      lines.push(`name:             ${t.name}`);
      const props = t.properties ?? {};
      const tf = t.thinker_fields;
      // dates
      if (tf?.dates) {
        lines.push(`dates:            ${tf.dates}`);
      } else if (props.date_from || props.date_to) {
        const dates = [props.date_from, props.date_to].filter(Boolean).join("–");
        if (dates) lines.push(`dates:            ${dates}`);
      }
      // eminence — required by parser, default to minor
      lines.push(`eminence:         ${tf?.eminence ?? props.importance ?? "minor"}`);
      // generation — required by parser
      lines.push(`generation:       ${t.generation ?? 1}`);
      // stream — required by parser
      lines.push(`stream:           ${t.stream ?? "default"}`);
      // optional fields
      const roles = tf?.structural_roles?.join(", ") ?? props.structural_roles;
      if (roles) lines.push(`structural_role:  ${roles}`);
      const tags = tf?.institutional_base ?? props.tags;
      if (tags) lines.push(`institutional_base: ${tags}`);
      if (t.notes) lines.push(`notes:            ${t.notes}`);
      lines.push("```\n");
    }
  }

  const conceptNodes = data.nodes.filter((n) => rectTypes.includes(n.node_type));
  if (conceptNodes.length > 0) {
    lines.push("## Concept Nodes\n");
    for (const c of conceptNodes) {
      lines.push("```");
      lines.push(`id:               ${c.id}`);
      lines.push(`name:             ${c.name}`);
      const props = c.properties ?? {};
      const cf = c.concept_fields;
      const originator = cf?.originator_id ?? props.originator_id ?? props.precursor ?? "unknown_author";
      lines.push(`originator_id:    ${originator}`);
      if (cf?.date_introduced ?? props.date_introduced) lines.push(`date_introduced:  ${cf?.date_introduced ?? props.date_introduced}`);
      // required by parser — default values
      lines.push(`concept_type:     ${cf?.concept_type ?? props.concept_type ?? "framework"}`);
      lines.push(`abstraction_level: ${cf?.abstraction_level ?? props.abstraction_level ?? "operational"}`);
      lines.push(`status:           ${cf?.status ?? props.status ?? "active"}`);
      if (c.generation != null) lines.push(`generation:       ${c.generation}`);
      if (c.stream) lines.push(`stream:           ${c.stream}`);
      if (c.notes) lines.push(`notes:            ${c.notes}`);
      lines.push("```\n");
    }
  }

  // Write any remaining nodes not yet covered (generic types) as thinker nodes
  const writtenIds = new Set([...personNodes.map((n) => n.id), ...conceptNodes.map((n) => n.id)]);
  const otherNodes = data.nodes.filter((n) => !writtenIds.has(n.id));
  if (otherNodes.length > 0) {
    // Append to Thinker Nodes section if it wasn't written, or add a new one
    if (personNodes.length === 0) lines.push("## Thinker Nodes\n");
    for (const t of otherNodes) {
      lines.push("```");
      lines.push(`id:               ${t.id}`);
      lines.push(`name:             ${t.name}`);
      const props = t.properties ?? {};
      if (props.date_from || props.date_to) {
        const dates = [props.date_from, props.date_to].filter(Boolean).join("–");
        if (dates) lines.push(`dates:            ${dates}`);
      }
      lines.push(`eminence:         ${props.importance ?? "minor"}`);
      lines.push(`generation:       ${t.generation ?? 1}`);
      lines.push(`stream:           ${t.stream ?? "default"}`);
      if (props.structural_roles) lines.push(`structural_role:  ${props.structural_roles}`);
      if (props.tags) lines.push(`institutional_base: ${props.tags}`);
      if (t.notes) lines.push(`notes:            ${t.notes}`);
      lines.push("```\n");
    }
  }

  const edgeGroups = [
    { label: "### Thinker-to-Thinker", edges: data.edges.filter((e) => e.edge_category === "thinker_thinker") },
    { label: "### Thinker-to-Concept", edges: data.edges.filter((e) => e.edge_category === "thinker_concept") },
    { label: "### Concept-to-Concept", edges: data.edges.filter((e) => e.edge_category === "concept_concept") },
  ];

  if (data.edges.length > 0) {
    lines.push("## Edges\n");
    for (const { label, edges } of edgeGroups) {
      if (edges.length === 0) continue;
      lines.push(`${label}\n`);
      lines.push("```");
      for (const e of edges) {
        lines.push(`from: ${e.from.padEnd(16)} to: ${e.to.padEnd(20)} type: ${e.edge_type}`);
        if (e.note) lines.push(`  note: ${e.note}`);
        if (e.weight !== 1.0) lines.push(`  weight: ${e.weight}`);
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
