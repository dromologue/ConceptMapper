import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import type { GraphIR, GraphNode, NodeTypeConfig, TaxonomyTemplate, LayoutPreset } from "./types/graph-ir";
import { GraphCanvas } from "./graph/GraphCanvas";
import { TextmapView } from "./views/TextmapView";
import { useViewport } from "./hooks/useViewport";
import { DetailPanel } from "./ui/DetailPanel";
import { NotesPane } from "./ui/NotesPane";
import { ActivityBar } from "./ui/ActivityBar";
import { Sidebar } from "./ui/Sidebar";
import { PhoneTabBar } from "./ui/PhoneTabBar";
import { StatusBar } from "./ui/StatusBar";
import { AddNodeModal } from "./ui/AddNodeModal";
import { collectAllTags } from "./utils/tags";
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
import { getNodeColor } from "./graph/node-color";
import { computeHierarchy, computeVisibility } from "./graph/hierarchy";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { DEFAULT_NODE_TYPES, migrateFromParser, graphIRFromData, getTemplateClassifiers } from "./migration";
import { createEmptyFilterState } from "./utils/filters";
import { normalizeFencedKV } from "./utils/normalize";
import { serializeViewComment } from "./utils/viewOptions";
import { escapeKVValue } from "./utils/kv-escape";
import { searchNodes } from "./utils/search";
import { useFileLoader } from "./hooks/useFileLoader";
import { isNativeApp as detectNativeApp, isIOSDevice, postToSwift, subscribe } from "./utils/swiftBridge";
import { useSwiftBridge } from "./hooks/useSwiftBridge";
import { useGraphStore } from "./stores/useGraphStore";
import { useUIStore } from "./stores/useUIStore";
import { useSecondBrainStore } from "./stores/useSecondBrainStore";
import { SecondBrainPanel } from "./ui/SecondBrainPanel";
import "./App.css";

export type ViewMode = string; // "full" or a node type id
export type { InteractionMode } from "./stores/useGraphStore";

function AppInner() {
  const { theme, look, edgeColorOverrides, setEdgeColorOverrides } = useTheme();

  // ── Graph state (Zustand) ────────────────────────────────────────────────
  const graphData = useGraphStore((s) => s.graphData);
  const setGraphDataStore = useGraphStore((s) => s.setGraphData);
  const selectedNode = useGraphStore((s) => s.selectedNode);
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode);
  const selectedEdge = useGraphStore((s) => s.selectedEdge);
  const setSelectedEdge = useGraphStore((s) => s.setSelectedEdge);
  const edgePopoverPos = useGraphStore((s) => s.edgePopoverPos);
  const setEdgePopoverPos = useGraphStore((s) => s.setEdgePopoverPos);
  const viewMode = useGraphStore((s) => s.viewMode);
  const setViewModeStore = useGraphStore((s) => s.setViewMode);
  const revealedNodes = useGraphStore((s) => s.revealedNodes);
  const setRevealedNodes = useGraphStore((s) => s.setRevealedNodes);
  const interactionMode = useGraphStore((s) => s.interactionMode);
  const setInteractionMode = useGraphStore((s) => s.setInteractionMode);
  const edgeSource = useGraphStore((s) => s.edgeSource);
  const setEdgeSource = useGraphStore((s) => s.setEdgeSource);
  const edgeTarget = useGraphStore((s) => s.edgeTarget);
  const setEdgeTarget = useGraphStore((s) => s.setEdgeTarget);
  const filters = useGraphStore((s) => s.filters);
  const setFiltersStore = useGraphStore((s) => s.setFilters);
  const centerOnNode = useGraphStore((s) => s.centerOnNode);
  const setCenterOnNode = useGraphStore((s) => s.setCenterOnNode);
  const storeLoadGraphFresh = useGraphStore((s) => s.loadGraphFresh);

  // ── UI state (Zustand) ───────────────────────────────────────────────────
  const activeModal = useUIStore((s) => s.activeModal);
  const modalData = useUIStore((s) => s.modalData);
  const openModal = useUIStore((s) => s.openModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const notesOpen = useUIStore((s) => s.notesOpen);
  const setNotesOpen = useUIStore((s) => s.setNotesOpen);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const phoneTab = useUIStore((s) => s.phoneTab);
  const setPhoneTab = useUIStore((s) => s.setPhoneTab);
  const analysisOpen = useUIStore((s) => s.analysisOpen);
  const toggleAnalysis = useUIStore((s) => s.toggleAnalysis);
  const labelMenuOpen = useUIStore((s) => s.labelMenuOpen);
  const toggleLabelMenu = useUIStore((s) => s.toggleLabelMenu);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQueryStore = useUIStore((s) => s.setSearchQuery);
  const searchFocused = useUIStore((s) => s.searchFocused);
  const setSearchFocused = useUIStore((s) => s.setSearchFocused);
  const searchHighlight = useUIStore((s) => s.searchHighlight);
  const setSearchHighlight = useUIStore((s) => s.setSearchHighlight);
  const auxPanelWidth = useUIStore((s) => s.auxPanelWidth);
  const setAuxPanelWidth = useUIStore((s) => s.setAuxPanelWidth);
  const notesHeight = useUIStore((s) => s.notesHeight);
  const setNotesHeight = useUIStore((s) => s.setNotesHeight);
  const hiddenLabelTypes = useUIStore((s) => s.hiddenLabelTypes);
  const setHiddenLabelTypes = useUIStore((s) => s.setHiddenLabelTypes);
  const secondBrainOpen = useUIStore((s) => s.secondBrainOpen);
  const toggleSecondBrain = useUIStore((s) => s.toggleSecondBrain);

  // Search query wrapper — also resets highlight as before.
  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryStore(q);
    setSearchHighlight(-1);
  }, [setSearchQueryStore, setSearchHighlight]);

  // setGraphData with undo bookkeeping — pushes the previous state onto the
  // store's history before swapping in the new one. Mirrors the original
  // wrapper but routes everything through the Zustand store.
  const setGraphData = useCallback((data: GraphIR | null | ((prev: GraphIR | null) => GraphIR | null)) => {
    const prev = useGraphStore.getState().graphData;
    const next = typeof data === 'function'
      ? (data as (p: GraphIR | null) => GraphIR | null)(prev)
      : data;
    if (prev && next && prev !== next) {
      useGraphStore.getState().pushState();
    }
    setGraphDataStore(next);
  }, [setGraphDataStore]);

  // REQ-088: expand-to-level. Default on map load is fully expanded
  // (maxDepth) so users see the full graph and its links; they can step the
  // level down to collapse. Manual +/- clicks populate userCollapsed /
  // userExpanded and ALWAYS win over the stepper.
  const [expandLevel, setExpandLevel] = useState(0);
  const [userCollapsed, setUserCollapsed] = useState<Set<string>>(new Set());
  const [userExpanded, setUserExpanded] = useState<Set<string>>(new Set());

  // Distinct from setGraphData: called when a fresh map is *loaded* (from disk,
  // a new wizard-created map, or a Swift bridge load). Seeds the view to
  // "fully expanded" — REQ-088 — and clears the undo stack via the store.
  const loadGraphFresh = useCallback((next: GraphIR | null) => {
    storeLoadGraphFresh(next);
    const maxDepth = next ? computeHierarchy(next.nodes, next.edges).maxDepth : 0;
    setExpandLevel(maxDepth);
    setUserCollapsed(new Set());
    setUserExpanded(new Set());
  }, [storeLoadGraphFresh]);

  const hierarchy = useMemo(() => {
    if (!graphData) return null;
    return computeHierarchy(graphData.nodes, graphData.edges);
  }, [graphData]);

  // REQ-088 unified visibility. computeVisibility does BFS from the roots and
  // honours both the stepper (depth < expandLevel) and manual overrides
  // (userCollapsed / userExpanded), which always win. Cumulative reveal:
  // expandLevel=N shows every node at depth ≤ N unless an ancestor was
  // manually collapsed; manual + on a collapsed node reveals its direct
  // children regardless of level.
  const visibility = useMemo(
    () => hierarchy
      ? computeVisibility(hierarchy, graphData?.edges ?? [], expandLevel, userCollapsed, userExpanded)
      : null,
    [hierarchy, graphData, expandLevel, userCollapsed, userExpanded],
  );
  const hiddenByLevel = visibility?.hidden ?? new Set<string>();
  // `collapsedNodes` for GraphCanvas drives the +/- glyph: nodes whose
  // children are currently hidden render "+", everything else with children
  // renders "−".
  const collapsedNodes = visibility?.showsPlus ?? new Set<string>();

  const handleExpandLevelChange = useCallback((level: number) => {
    setExpandLevel(level);
  }, []);

  // ── Local orchestration state ────────────────────────────────────────────
  // Modals are tracked in useUIStore via activeModal; addNode's "data" (the
  // node-type id seed) lives in modalData.
  const showAddNode: string | null = activeModal === 'addNode' ? (modalData as string | null) : null;
  const showAddEdgeModal = activeModal === 'addEdge';
  const showSettings = activeModal === 'settings';
  const showHelp = activeModal === 'help';
  const showTaxonomyWizard = activeModal === 'taxonomyWizard';
  const showExportImage = activeModal === 'exportImage';

  const [exploded, setExploded] = useState(false);
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("force");
  const [fontScale, setFontScale] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(true);

  // Wizard "initial data" — transient and tied to the wizard launch flow,
  // so it stays local. Setters wrap openModal/closeModal for the wizard.
  const [taxonomyEditData, setTaxonomyEditData] = useState<TaxonomyWizardInitial | undefined>(undefined);
  const openTaxonomyWizard = useCallback((edit?: TaxonomyWizardInitial) => {
    setTaxonomyEditData(edit);
    openModal('taxonomyWizard');
  }, [openModal]);
  const closeTaxonomyWizard = useCallback(() => {
    setTaxonomyEditData(undefined);
    closeModal();
  }, [closeModal]);

  const [sourceFilePath, setSourceFilePath] = useState<string | null>(null);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [template, setTemplate] = useState<TaxonomyTemplate | null>(null);
  const fitToViewRef = useRef<(() => void) | null>(null);
  const zoomFnsRef = useRef<{ zoomIn: () => void; zoomOut: () => void } | null>(null);
  const [analysisNodeTypes, setAnalysisNodeTypes] = useState<Set<string> | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [pathFrom, setPathFrom] = useState<string | null>(null);
  const [pathTo, setPathTo] = useState<string | null>(null);
  const [highlightedCommunity, setHighlightedCommunity] = useState<number | null>(null);
  const [communityOverlay, setCommunityOverlay] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<string[] | null>(null);
  const [loadedNativeTemplates, setLoadedNativeTemplates] = useState<Map<string, TaxonomyWizardInitial>>(new Map());
  const [nativeMaps, setNativeMaps] = useState<{ name: string; path: string }[]>([]);

  // Compatibility shim: useSwiftBridge expects an updater-style
  // setLoadedNativeTemplates; expose it as such while leaving the canonical
  // useState setter available locally.
  const setLoadedNativeTemplatesUpdater = useCallback(
    (updater: (prev: Map<string, TaxonomyWizardInitial>) => Map<string, TaxonomyWizardInitial>) => {
      setLoadedNativeTemplates(updater);
    },
    [],
  );

  // File loading: WASM parser init + file content loading
  const resetUI = useCallback(() => {
    setSelectedNode(null);
    setRevealedNodes(new Set());
    setFiltersStore(createEmptyFilterState());
  }, [setSelectedNode, setRevealedNodes, setFiltersStore]);
  // File loader uses loadGraphFresh so newly-opened maps start fully expanded
  // (REQ-088). In-app mutations go through setGraphData and keep the user's view.
  const { parserReady, error, setError, loadFileContent, loadWarnings, setLoadWarnings } = useFileLoader(
    template, loadGraphFresh, setTemplate, resetUI, setSourceFilePath
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

  // Wire the typed Swift bridge. The hook installs the inbound receiver, sync
  // getters, and event subscribers once; the deps ref keeps closures fresh.
  useSwiftBridge({
    loadFileContent,
    parseMarkdown,
    migrateFromParser,
    graphIRFromData,
    normalizeFencedKV,
    setEdgeColorOverrides,
    loadGraphFresh,
    setTemplate,
    setSelectedNodeNull: () => useGraphStore.getState().setSelectedNode(null),
    setRevealedNodesEmpty: () => useGraphStore.setState({ revealedNodes: new Set() }),
    setFilters: (f) => useGraphStore.getState().setFilters(f),
    setError,
    setSourceFilePath,
    setShowTaxonomyWizard: (v) => {
      if (v) useUIStore.getState().openModal('taxonomyWizard');
      else useUIStore.getState().closeModal();
    },
    setNativeMaps,
    setLoadedNativeTemplates: setLoadedNativeTemplatesUpdater,
    getGraphData: () => useGraphStore.getState().graphData,
    getNodeTypeConfigs: () => nodeTypeConfigs,
    getEdgeColorOverrides: () => edgeColorOverrides,
    getLayoutPreset: () => layoutPreset,
    setLayoutPreset,
    exportToMarkdown,
    createEmptyFilterState,
  });

  // ── Second Brain bridge subscriptions ───────────────────────────────────
  useEffect(() => {
    const unsubs = [
      subscribe("secondBrainReady", (p) => {
        useSecondBrainStore.getState().setFolders(p.folders);
        useSecondBrainStore.getState().setHasWorkflowyKey(p.hasWorkflowyKey);
      }),
      subscribe("secondBrainFoldersChanged", (p) => {
        useSecondBrainStore.getState().setFolders(p.folders);
      }),
      subscribe("secondBrainScanned", (p) => {
        try {
          const graph = JSON.parse(p.graphJson) as GraphIR;
          const tmpl = JSON.parse(p.templateJson) as TaxonomyTemplate;
          setTemplate(tmpl);
          loadGraphFresh(graph);
          useSecondBrainStore.getState().setLastScanned(new Date(), p.fileCount);
        } catch {
          // malformed payload — ignore
        }
      }),
      subscribe("workflowyOutlineLoaded", (p) => {
        useSecondBrainStore.getState().setOutline(p.nodeUrl, p.nodes);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewModeChange = useCallback((mode: string) => {
    setViewModeStore(mode); // store clears revealedNodes too
  }, [setViewModeStore]);

  // `isPhone` drives the compact, single-surface, tab-bar UX. It applies to a
  // phone-class browser viewport AND to every iOS device — iPhone *and* iPad
  // share one iOS layout, so an iPad (which is tablet/desktop by width) still
  // gets the tabbed shell. macOS and desktop browsers keep the inline panels.
  const viewport = useViewport();
  const [iosDevice] = useState(isIOSDevice);
  const isPhone = viewport.kind === "phone" || iosDevice;

  // First time we enter the compact layout, default to the textmap (the visual
  // canvas is cramped) and collapse the sidebar. Fires once; the user can still
  // switch views afterwards.
  const didPhoneDefaultRef = useRef(false);
  useEffect(() => {
    if (didPhoneDefaultRef.current) return;
    if (isPhone) {
      didPhoneDefaultRef.current = true;
      setViewModeStore("textmap");
      setSidebarOpen(false);
    }
  }, [isPhone, setViewModeStore, setSidebarOpen]);

  // Which workbench surface is visible. On tablet/desktop the panels dock
  // inline (driven by their own open flags); on phone exactly one full-screen
  // surface shows, chosen by the bottom tab bar (REQ-119).
  const showMap = !isPhone || phoneTab === "map";
  const showExplorer = isPhone ? phoneTab === "explorer" : sidebarOpen;
  const showProperties = isPhone ? phoneTab === "properties" : (!!selectedNode && propertiesOpen);
  const showAnalysis = isPhone ? phoneTab === "analysis" : analysisOpen;
  // Notes render differently per platform (desktop bottom pane vs phone tab),
  // so each path uses its own condition below rather than a shared flag.

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
        openModal('addEdge');
        return;
      }

      setSelectedNode(node);

      if (!node) {
        setRevealedNodes(new Set());
        setCommunityOverlay(false);
        setHighlightedCommunity(null);
        return;
      }

      if (viewMode !== "full" && graphData) {
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
    [interactionMode, viewMode, graphData, setEdgeSource, setEdgeTarget, setInteractionMode, openModal, setSelectedNode, setRevealedNodes, setCommunityOverlay, setHighlightedCommunity]
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<GraphNode>) => {
      // Store handler does undo bookkeeping + selectedNode sync internally.
      useGraphStore.getState().handleNodeUpdate(nodeId, updates);
    },
    []
  );

  const handleNavigateToNode = useCallback(
    (nodeId: string) => {
      useGraphStore.getState().handleNavigateToNode(nodeId);
    },
    []
  );

  // Unified add node handler — store handles graphData mutation, undo push,
  // selectedNode update, and modal close.
  const handleAddNode = useCallback(
    (nodeType: string, name: string, classifierValues: Record<string, string>, tags: string[], properties: Record<string, string | undefined>, links: import("./types/graph-ir").NodeLink[] = []) => {
      useGraphStore.getState().handleAddNode(nodeType, name, classifierValues, tags, properties, links, template ?? null);
    },
    [template]
  );

  const handleAddEdge = useCallback(
    (edgeType: string, weight: number = 1.0) => {
      useGraphStore.getState().handleAddEdge(edgeType, weight, template ?? null);
    },
    [template]
  );

  const handleStartAddEdge = useCallback(() => {
    setEdgeTarget(null);
    if (selectedNode) {
      // Use the currently selected node as the source
      setEdgeSource(selectedNode.id);
      setInteractionMode("add-edge-target");
    } else {
      setEdgeSource(null);
      setInteractionMode("add-edge-source");
    }
  }, [selectedNode, setEdgeTarget, setEdgeSource, setInteractionMode]);

  const handleCancelAddEdge = useCallback(() => {
    setInteractionMode("normal");
    setEdgeSource(null);
    setEdgeTarget(null);
    closeModal();
  }, [setInteractionMode, setEdgeSource, setEdgeTarget, closeModal]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    useGraphStore.getState().handleDeleteNode(nodeId);
    // store also closes the notes pane via useUIStore.setNotesOpen(false)
  }, []);

  const handleDeleteEdge = useCallback((fromId: string, toId: string) => {
    useGraphStore.getState().handleDeleteEdge(fromId, toId);
  }, []);

  // Export image handler — captures current canvas to PNG or PDF
  const handleExportImage = useCallback((options: ExportImageOptions) => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    closeModal();

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

    const native = detectNativeApp();

    if (options.format === "png") {
      const dataURL = offscreen.toDataURL("image/png");
      const base64 = dataURL.split(",")[1];
      if (native) {
        postToSwift("saveToDownloads", { data: base64, filename: `${filename}.png` });
      } else {
        const a = document.createElement("a");
        a.href = dataURL;
        a.download = `${filename}.png`;
        a.click();
      }
    } else {
      const imgData = offscreen.toDataURL("image/png");
      const pxToMm = 0.264583;
      const pdfW = offscreen.width * pxToMm;
      const pdfH = offscreen.height * pxToMm;
      const pdf = new jsPDF({ orientation: pdfW > pdfH ? "landscape" : "portrait", unit: "mm", format: [pdfW, pdfH] });
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      if (native) {
        const pdfBase64 = pdf.output("datauristring").split(",")[1];
        postToSwift("saveToDownloads", { data: pdfBase64, filename: `${filename}.pdf` });
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
        useGraphStore.getState().undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        useGraphStore.getState().redo();
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

  const isNativeApp = detectNativeApp();

  // Request native templates and maps on mount; clear stale localStorage cache
  useEffect(() => {
    if (isNativeApp) {
      localStorage.removeItem("cm-templates");
      postToSwift("listTemplates", undefined as never);
      postToSwift("listMaps", undefined as never);
    }
  }, [isNativeApp]);

  // Auto-save to source file path (debounced) — saves markdown
  const autoSave = useCallback(() => {
    if (!graphData || !sourceFilePath || !isNativeApp) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const md = exportToMarkdown(graphData, nodeTypeConfigs, edgeColorOverrides, layoutPreset);
      postToSwift("saveToPath", { path: sourceFilePath, content: md });
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 2000);
    }, 2000);
  }, [graphData, sourceFilePath, isNativeApp, nodeTypeConfigs, edgeColorOverrides, layoutPreset]);

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
  // Persist the view option (layout preset) to the map file when it changes.
  const layoutPresetRef = useRef(layoutPreset);
  useEffect(() => {
    if (graphData && layoutPresetRef.current !== layoutPreset) {
      autoSave();
    }
    layoutPresetRef.current = layoutPreset;
  }, [layoutPreset, graphData, autoSave]);

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
          notes: data.description
            ? [data.description, ...graphData.metadata.notes.slice(1)]
            : graphData.metadata.notes,
          template: newTemplate,
        },
      };
      setGraphData(updated);
      setTemplate(newTemplate);
      // REQ-090: auto-save the .cmt to the same path the loaded map references,
      // silently (no dialog), so the next map load picks up the edits.
      if (isNativeApp) {
        const templateJson = JSON.stringify({
          title: data.title,
          description: data.description,
          format_instructions: "When generating .cm files from this template: use markdown with fenced code blocks for nodes. Every property line MUST use 'key: value' format with a colon separator. Required node keys: id, name. Classifier values use the classifier id as the key. Tags use comma-separated format. Edges use 'from: [id] to: [id] type: [edge_type]' format.",
          classifiers: data.classifiers,
          node_types: data.node_types,
          edge_types: data.edge_types,
        }, null, 2);
        postToSwift("saveTemplate", {
          content: templateJson,
          title: data.title,
          sourceTemplate: graphData.metadata.source_template ?? undefined,
          sourceMapPath: sourceFilePath ?? undefined,
          silent: !!graphData.metadata.source_template,
        });
      }
    } else {
      // Create mode: new empty graph
      const newGraph: GraphIR = {
        version: "2.0",
        metadata: {
          title: data.title,
          classifiers: data.classifiers,
          notes: data.description ? [data.description] : [],
          template: newTemplate,
        },
        nodes: [],
        edges: [],
      };

      setTemplate(newTemplate);

      // Save as markdown .cm file
      const md = exportToMarkdown(newGraph, newTemplate.node_types);

      if (isNativeApp) {
        postToSwift("saveNewTaxonomy", { content: md, title: data.title });
        loadGraphFresh(newGraph);
      } else {
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.cm`;
        a.click();
        URL.revokeObjectURL(url);
        loadGraphFresh(newGraph);
      }

      setSelectedNode(null);
      setError(null);
    }

    closeTaxonomyWizard();
  }, [isNativeApp, graphData, setGraphData, loadGraphFresh, taxonomyEditData, setError, sourceFilePath, setSelectedNode, closeTaxonomyWizard]);

  // Create a new empty map using an existing template's structure (no wizard)
  const handleNewFileFromTemplate = useCallback((tmplData: TaxonomyWizardInitial) => {
    const mapTitle = "Untitled Map";
    const newTemplate: TaxonomyTemplate = {
      title: tmplData.title,
      description: tmplData.description,
      classifiers: tmplData.classifiers,
      node_types: tmplData.node_types ?? DEFAULT_NODE_TYPES,
      edge_types: tmplData.edge_types,
    };
    const classifiers = getTemplateClassifiers(newTemplate);

    const newGraph: GraphIR = {
      version: "2.0",
      metadata: {
        title: mapTitle,
        classifiers,
        notes: [],
        template: newTemplate,
      },
      nodes: [],
      edges: [],
    };

    setTemplate(newTemplate);
    loadGraphFresh(newGraph);
    setSelectedNode(null);
    setError(null);

    // Save to disk
    const md = exportToMarkdown(newGraph, newTemplate.node_types);
    if (isNativeApp) {
      postToSwift("saveNewTaxonomy", { content: md, title: mapTitle });
    }
  }, [isNativeApp, loadGraphFresh, setError, setSelectedNode]);

  // Open wizard in edit mode with current taxonomy data
  const handleEditTaxonomy = useCallback(() => {
    if (!graphData) return;
    openTaxonomyWizard({
      title: graphData.metadata.title ?? "",
      description: graphData.metadata.notes?.[0] ?? undefined,
      classifiers: graphData.metadata.classifiers,
      node_types: nodeTypeConfigs,
      edge_types: template?.edge_types,
    });
  }, [graphData, nodeTypeConfigs, template, openTaxonomyWizard]);

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
      postToSwift("saveTemplate", { content: templateJson, title: data.title });
    }

    // Also store in localStorage
    const stored = JSON.parse(localStorage.getItem("cm-templates") || "[]");
    stored.push(tmpl);
    localStorage.setItem("cm-templates", JSON.stringify(stored));
  }, [isNativeApp]);

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
      postToSwift("openFile", undefined as never);
    } else {
      fileInputRef.current?.click();
    }
  }, [isNativeApp]);

  const handleSelectEdge = useCallback((edge: import("./types/graph-ir").GraphEdge | null, pos?: { x: number; y: number }) => {
    useGraphStore.getState().handleSelectEdge(edge, pos);
  }, []);

  const handleEdgeUpdate = useCallback((fromId: string, toId: string, updates: Partial<import("./types/graph-ir").GraphEdge>) => {
    useGraphStore.getState().handleEdgeUpdate(fromId, toId, updates);
  }, []);

  const makeResizeHandler = useCallback(
    (setter: (n: number) => void, currentWidth: number) =>
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
    (setter: (n: number) => void, currentHeight: number) =>
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
    setFiltersStore((prev) => {
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
    setFiltersStore((prev) => {
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
    setFiltersStore(createEmptyFilterState());
  };

  const handleClassifierToggle = (classifierId: string, valueId: string, allValueIds: string[]) => {
    setFiltersStore((prev) => {
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
    setFiltersStore((prev) => {
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
    ? searchNodes(graphData.nodes, searchQuery)
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
    [viewMode, setSelectedNode, setSearchQuery, setSearchFocused, setCenterOnNode, setRevealedNodes]
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
                      onClick={() => openTaxonomyWizard(t)}
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
              <button className="start-action" onClick={() => openTaxonomyWizard(undefined)}>
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
                    onClick={() => postToSwift("loadMap", { path: m.path })}
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
            onCancel={closeTaxonomyWizard}
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
    <div className={`app ${isPhone ? "phone" : viewport.kind}`}>
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
            onChange={(e) => { setSearchQuery(e.target.value); }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSearchHighlight(Math.min(searchHighlight + 1, searchResults.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSearchHighlight(Math.max(searchHighlight - 1, 0));
              } else if (e.key === "Enter" && searchHighlight >= 0 && searchResults[searchHighlight]) {
                e.preventDefault();
                handleSearchSelect(searchResults[searchHighlight]);
                setSearchHighlight(-1);
              } else if (e.key === "Escape") {
                setSearchQuery("");
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
                        backgroundColor: getNodeColor(n, graphData.metadata.classifiers ?? []),
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
        {showMap && (
        <ActivityBar
          isPhone={isPhone}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          onOpenSettings={() => openModal('settings')}
          onEditTaxonomy={handleEditTaxonomy}
          onOpenHelp={() => openModal('help')}
          onFitToView={() => fitToViewRef.current?.()}
          onExportImage={() => openModal('exportImage')}
          onToggleAnalysis={() => {
            if (analysisOpen) {
              setCommunityOverlay(false);
              setHighlightedCommunity(null);
              setRevealedNodes(new Set());
            }
            toggleAnalysis();
          }}
          analysisOpen={analysisOpen}
          nodeTypeConfigs={nodeTypeConfigs}
          onExplode={() => setExploded((v) => !v)}
          exploded={exploded}
          layoutPreset={layoutPreset}
          onLayoutPresetChange={setLayoutPreset}
          onResetLayout={handleResetLayout}
          onToggleProperties={() => setPropertiesOpen(!propertiesOpen)}
          propertiesOpen={propertiesOpen}
          onToggleNotes={() => setNotesOpen(!notesOpen)}
          notesOpen={notesOpen}
          onToggleSecondBrain={toggleSecondBrain}
          secondBrainOpen={secondBrainOpen}
          expandLevel={expandLevel}
          maxExpandLevel={hierarchy?.maxDepth ?? 0}
          onExpandLevelChange={handleExpandLevelChange}
        />
        )}

        {showExplorer && (
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
            onAddNode={(nodeType) => openModal('addNode', nodeType)}
            onAddEdge={handleStartAddEdge}
            interactionMode={interactionMode}
            onCancelAddEdge={handleCancelAddEdge}
            focusMode={focusMode}
            onToggleFocusMode={() => setFocusMode(!focusMode)}
            onResetView={() => {
              setSelectedNode(null);
              setSelectedEdge(null);
              setEdgePopoverPos(null);
              setFiltersStore(createEmptyFilterState());
              setRevealedNodes(new Set());
              setPropertiesOpen(false);
              setTimeout(() => fitToViewRef.current?.(), 50);
            }}
          />
        )}
        {showMap && (
        <div className="editor-area">
          {loadWarnings.length > 0 && (
            <div className="load-warnings-banner">
              <div className="load-warnings-content">
                <strong>Template mismatch:</strong>
                <ul>{loadWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
              <button className="close-btn" onClick={() => setLoadWarnings([])}>×</button>
            </div>
          )}
          <div className="canvas-container">
            {viewMode === "textmap" ? (
            <TextmapView
              data={graphData}
              selectedNodeId={selectedNode?.id ?? null}
              onSelectNode={handleSelectNode}
              onNodeUpdate={handleNodeUpdate}
              onAddNode={() => openModal('addNode')}
              nodeTypeConfigs={nodeTypeConfigs}
              edgeTypeConfigs={template?.edge_types}
            />
            ) : (
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
              hiddenIds={hiddenByLevel}
              onToggleCollapse={(nodeId) => {
                // REQ-088: clicking +/- ALWAYS overrides the stepper. The
                // toggle is based on the node's current state ("+" shown →
                // user wants to expand; "−" shown → user wants to collapse).
                const currentlyCollapsed = collapsedNodes.has(nodeId);
                if (currentlyCollapsed) {
                  setUserExpanded((prev) => {
                    const next = new Set(prev);
                    next.add(nodeId);
                    return next;
                  });
                  setUserCollapsed((prev) => {
                    if (!prev.has(nodeId)) return prev;
                    const next = new Set(prev);
                    next.delete(nodeId);
                    return next;
                  });
                } else {
                  setUserCollapsed((prev) => {
                    const next = new Set(prev);
                    next.add(nodeId);
                    return next;
                  });
                  setUserExpanded((prev) => {
                    if (!prev.has(nodeId)) return prev;
                    const next = new Set(prev);
                    next.delete(nodeId);
                    return next;
                  });
                }
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
              fontScale={fontScale}
              edgeTypeConfigs={template?.edge_types}
              focusMode={focusMode}
            />
            )}
            {viewMode !== "textmap" && (
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={() => zoomFnsRef.current?.zoomIn()} title="Zoom in">+</button>
              <button className="zoom-btn" onClick={() => zoomFnsRef.current?.zoomOut()} title="Zoom out">-</button>
              <button className="zoom-btn zoom-btn-fit" onClick={() => fitToViewRef.current?.()} title="Fit to view">Fit</button>
              <div className="zoom-separator" />
              <button className="zoom-btn" onClick={() => setFontScale((s) => Math.min(3, s + 0.2))} title="Increase font size">A+</button>
              <button className="zoom-btn" onClick={() => setFontScale((s) => Math.max(0.4, s - 0.2))} title="Decrease font size">A-</button>
              {fontScale !== 1 && <button className="zoom-btn zoom-btn-fit" onClick={() => setFontScale(1)} title="Reset font size">A0</button>}
              <button
                className={`zoom-btn zoom-btn-fit ${hiddenLabelTypes.size > 0 ? "zoom-btn-off" : ""}`}
                onClick={toggleLabelMenu}
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
            )}
            {selectedEdge && edgePopoverPos && (
              <EdgePopover
                edge={selectedEdge}
                position={edgePopoverPos}
                onUpdate={handleEdgeUpdate}
                onClose={() => { setSelectedEdge(null); setEdgePopoverPos(null); }}
                onDelete={handleDeleteEdge}
                edgeTypeLabel={
                  (template?.edge_types?.find((et) => et.id === selectedEdge!.edge_type)?.label
                    ?? selectedEdge!.edge_type)
                }
              />
            )}
          </div>
          {/* Desktop docks Notes as a resizable bottom pane under the canvas;
              on phone Notes is its own full-screen tab (rendered below). */}
          {!isPhone && selectedNode && notesOpen && (
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
          {!isPhone && !selectedNode && selectedEdge && notesOpen && (
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
          {!isPhone && !selectedNode && !selectedEdge && notesOpen && (
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
        )}

        {showProperties && (
          <>
            {!isPhone && (
              <div className="pane-resizer" onMouseDown={makeResizeHandler(setAuxPanelWidth, auxPanelWidth)} />
            )}
            <div className="auxiliary-panel" style={isPhone ? undefined : { width: auxPanelWidth }}>
              <div className="aux-panel-header">
                <span className="aux-panel-title">Properties</span>
                {!isPhone && <button className="close-btn" onClick={() => setPropertiesOpen(false)}>&times;</button>}
              </div>
              {selectedNode ? (
                <DetailPanel
                  node={selectedNode}
                  edges={selectedEdges}
                  nodes={graphData.nodes}
                  classifiers={graphData.metadata.classifiers ?? []}
                  nodeTypeConfigs={nodeTypeConfigs}
                  template={template}
                  onNodeUpdate={handleNodeUpdate}
                  onNavigateToNode={handleNavigateToNode}
                  onOpenNotes={() => (isPhone ? setPhoneTab("notes") : setNotesOpen(!notesOpen))}
                  notesOpen={notesOpen}
                  onNodeDelete={handleDeleteNode}
                  analysis={analysis}
                />
              ) : (
                <div className="panel-empty-hint">Select a node in the Map to see its properties.</div>
              )}
            </div>
          </>
        )}

        {showAnalysis && (
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
              setRevealedNodes(new Set(memberIds));
              setCommunityOverlay(true);
              setHighlightedCommunity(analysis?.communities.get(memberIds[0]) ?? null);
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

        {secondBrainOpen && (
          <>
            {!isPhone && (
              <div className="pane-resizer" onMouseDown={makeResizeHandler(setAuxPanelWidth, auxPanelWidth)} />
            )}
            <div className="auxiliary-panel" style={isPhone ? undefined : { width: auxPanelWidth }}>
              <div className="aux-panel-header">
                <span className="aux-panel-title">Second Brain</span>
                {!isPhone && <button className="close-btn" onClick={toggleSecondBrain}>&times;</button>}
              </div>
              <SecondBrainPanel />
            </div>
          </>
        )}

        {/* Phone-only: Notes as its own full-screen tab. Desktop docks Notes
            inside the editor area instead (above). */}
        {isPhone && phoneTab === "notes" && (
          <div className="notes-bottom-pane">
            {selectedNode ? (
              <NotesPane
                node={selectedNode}
                edges={selectedEdges}
                nodes={graphData.nodes}
                onNodeUpdate={handleNodeUpdate}
              />
            ) : selectedEdge ? (
              <EdgeNotesPane
                edge={selectedEdge}
                nodes={graphData.nodes}
                onEdgeUpdate={handleEdgeUpdate}
              />
            ) : (
              <div className="panel-empty-hint">Select a node or edge in the Map to see its notes.</div>
            )}
          </div>
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

      {/* Phone: bottom tab bar is the primary navigation (lives below the
          status bar so it owns the home-indicator safe area). */}
      {isPhone && <PhoneTabBar active={phoneTab} onChange={setPhoneTab} />}

      {activeModal === 'addNode' && (
        <AddNodeModal
          nodeTypeConfigs={nodeTypeConfigs}
          classifiers={graphData.metadata.classifiers ?? []}
          existingTags={collectAllTags(graphData.nodes)}
          nodes={graphData.nodes}
          edgeTypes={template?.edge_types}
          onAdd={handleAddNode}
          onCancel={closeModal}
          initialNodeType={showAddNode ?? undefined}
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
          edgeTypes={[...new Set(graphData.edges.map((e) => e.edge_type))]}
          classifiers={graphData.metadata.classifiers ?? []}
          onClose={closeModal}
        />
      )}
      {showTaxonomyWizard && (
        <TaxonomyWizard
          onComplete={handleTaxonomyCreate}
          onCancel={closeTaxonomyWizard}
          initialData={taxonomyEditData}
          onSaveTemplate={handleSaveTemplate}
        />
      )}
      {showHelp && (
        <HelpPanel onClose={closeModal} />
      )}
      {showExportImage && (
        <ExportImageModal
          onExport={handleExportImage}
          onCancel={closeModal}
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

function exportToMarkdown(data: GraphIR, nodeTypeConfigs: NodeTypeConfig[], edgeColorOverrides?: Record<string, string>, layoutPreset?: LayoutPreset): string {
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
  // Persist view options (layout preset + per-attribute classifier layouts) so
  // the chosen view travels with the map file. See utils/viewOptions.
  const viewComment = serializeViewComment({ layoutPreset, classifiers: data.metadata.classifiers });
  if (viewComment) lines.push(viewComment);
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
      lines.push(`name:             ${escapeKVValue(node.name)}`);

      // Write classifier values (e.g. category: idea, urgency: now)
      if (node.classifiers) {
        for (const [key, value] of Object.entries(node.classifiers)) {
          if (value != null && value !== "") {
            lines.push(`${key}: ${escapeKVValue(String(value))}`);
          }
        }
      }

      // Write tags
      if (node.tags && node.tags.length > 0) {
        lines.push(`tags: ${node.tags.join(", ")}`);
      }

      // Write properties (textarea fields may contain newlines — escape them
      // so the round-trip preserves the value).
      const props = node.properties ?? {};
      for (const [key, value] of Object.entries(props)) {
        if (value != null && value !== "") {
          lines.push(`${key}: ${escapeKVValue(String(value))}`);
        }
      }

      // Notes — escape newlines so multi-line outlines survive round-trip.
      if (node.notes) lines.push(`notes:            ${escapeKVValue(node.notes)}`);
      // REQ-111: persist the absolute path of an attached markdown file. The
      // notes pane re-loads from disk on open and writes back on edit.
      if (node.notes_file) lines.push(`notes_file:       ${escapeKVValue(node.notes_file)}`);
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

  if (data.metadata.notes && data.metadata.notes.length > 0) {
    lines.push("## Notes\n");
    for (const o of data.metadata.notes) lines.push(`- ${o}`);
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
