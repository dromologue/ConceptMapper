import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { GraphIR, GraphNode, GraphEdge, SimNode, SimLink, NodeTypeConfig, EdgeTypeConfig, Classifier, LayoutPreset } from "../types/graph-ir";
import type { ViewMode, InteractionMode } from "../App";
import type { ThemeConfig } from "../theme/themes";
import type { FilterState } from "../utils/filters";
import { isNodeFilterVisible } from "../utils/filters";
import { getNodeTypeConfig, getConfigNodeRadius } from "../migration";
import { computeCollapseState } from "./collapse-utils";
import { EDGE_LABELS } from "../utils/edge-labels";
import { getNodeColor, applyDepthLightness } from "./node-color";
import { computeHierarchy, type HierarchyInfo } from "./hierarchy";
import { communityColor } from "../ui/AnalysisPanel";
import { truncateLabel, LABEL_TRUNCATE_LENGTH } from "../utils/label";
import {
  hashCode,
  seededRandom,
  initialNodePosition,
  newNodeSpawnPosition,
  regionClusterRadius,
} from "./layout/regions";
import {
  findNodeAt as hitTestNode,
  findEdgeAt as hitTestEdge,
  pointerToWorld,
  pointInCollapseIndicator,
  marqueeToRect,
  isMarqueeUsable,
  EDGE_HIT_THRESHOLD,
} from "./hit-testing";
import {
  applyLayoutForces as applyLayoutForcesImpl,
  explodedFactor,
  ALPHA_DECAY,
  ALPHA_RESTART,
  ALPHA_RESTART_MILD,
  ALPHA_DRAG_TARGET,
  COLLISION_PADDING_NORMAL,
  COLLISION_PADDING_EXPLODED,
  LINK_DISTANCE_BASE,
  LINK_FORCE_STRENGTH,
  useGraphSimulation,
} from "./useGraphSimulation";
import {
  useZoomController,
  fitTransform,
  bboxOf,
  zoomByCenterTransform,
  centerOnNodeTransform,
  marqueeZoomTransform,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_IN_FACTOR,
  ZOOM_OUT_FACTOR,
  CENTER_ON_NODE_SCALE,
  FIT_TO_VIEW_DURATION,
  TRANSITION_DURATION,
  ZOOM_BUTTON_DURATION,
} from "./useZoomController";

// --- Organic rendering helpers ---

/** Draw a jittered circle for region backgrounds */
function drawOrganicCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number) {
  const segments = 12;
  const amt = r * 0.05;
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const jr = r + seededRandom(seed, i) * amt;
    const px = cx + jr * Math.cos(angle);
    const py = cy + jr * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}


// --- Mind map rendering helpers ---


// --- Configuration constants (rendering-only; layout / zoom / simulation
// constants live in their own modules) ---

// Animation durations (ms)
const COLLAPSE_FIT_DELAY = 600;
const EXPLODE_FIT_DELAY = 1100;
const RESIZE_FIT_DELAY = 500;

// Canvas defaults
const DEFAULT_CANVAS_WIDTH = 800;
const DEFAULT_CANVAS_HEIGHT = 600;

// Visual: hit detection (drag threshold lives here; node/edge/marquee constants
// are imported from hit-testing.ts to keep them adjacent to the algorithms).
const DRAG_THRESHOLD = 3;

// Visual: legacy node radii
const LEGACY_CONCEPT_RADIUS = 8;
const LEGACY_DEFAULT_RADIUS = 10;

// Visual: tooltip offsets
const TOOLTIP_OFFSET_X = 12;
const TOOLTIP_OFFSET_Y = -8;

// Visual: arrowheads
const ARROWHEAD_SIZE = 8;
const ARROWHEAD_ANGLE = 0.4;
const ARROWHEAD_CLEARANCE = 4;

// Visual: notes indicator
const NOTES_DOT_RADIUS = 3;
const NOTES_DOT_OFFSET = 2;

// Visual: edge labels
const EDGE_LABEL_FONT_SIZE = 9;
const EDGE_LABEL_Y_OFFSET = 3;

// Visual: node labels
const NODE_LABEL_MIN_FONT = 8;
const NODE_LABEL_MAX_FONT = 16;
const NODE_LABEL_BASE_FONT = 11;

// Visual: zoom thresholds for label visibility
const ZOOM_THRESHOLD_LABELS = 0.15;
const ZOOM_THRESHOLD_NOTES = 0.3;
const ZOOM_THRESHOLD_TAGS = 0.5;
const ZOOM_THRESHOLD_EDGE_LABELS_FILTERED = 0.5;
const ZOOM_THRESHOLD_EDGE_LABELS_HIGHLIGHT = 0.4;

// Visual: region backgrounds
const REGION_CIRCLE_PADDING = 100;
const REGION_CIRCLE_BG_ALPHA = 0.15;
const REGION_LABEL_ALPHA = 0.6;
const REGION_LABEL_FONT_SIZE = 14;
const REGION_LABEL_GAP = 4;
const COLUMN_BG_ALPHA = 0.08;
const COLUMN_LABEL_ALPHA = 0.5;
const COLUMN_LABEL_MAX_FONT = 14;
const COLUMN_LABEL_MIN_FONT = 9;
const COLUMN_LABEL_TOP_OFFSET = 10;

// Visual: selection stroke
const SELECTION_STROKE_WIDTH = 2;

// Visual: collapse indicator
const COLLAPSE_INDICATOR_MIN_R = 5;
const COLLAPSE_INDICATOR_BASE_R = 3;
const COLLAPSE_INDICATOR_OFFSET = 2;
const COLLAPSE_INDICATOR_HIT_SCALE = 2.5;
const COLLAPSE_INDICATOR_CLICK_SCALE = 3.5;
const COLLAPSE_INDICATOR_FONT_SCALE = 1.4;

// Visual: mindmap edge taper (dramatic branch effect)
const MINDMAP_EDGE_SRC_WIDTH = 3.5;
const MINDMAP_EDGE_TGT_WIDTH = 0.15;
const MINDMAP_EDGE_CURVE_FACTOR = 0.18;
const MINDMAP_EDGE_CURVE_MAX = 50;
const MINDMAP_EDGE_S_CURVE_MIX = 0.3;

// Visual: marquee rectangle
const MARQUEE_LINE_WIDTH = 1.5;

// Visual: column label width ratio
const COLUMN_LABEL_WIDTH_RATIO = 0.9;
const COLUMN_LABEL_SIZE_FACTOR = 1.5;

// Visual: node shape scale factors
const RECT_WIDTH_SCALE = 2.5;
const RECT_HEIGHT_SCALE = 1.6;
const RECT_CORNER_RADIUS = 4;
const DIAMOND_SCALE = 1.4;
const HEXAGON_SCALE = 1.1;
const TRIANGLE_SCALE = 1.3;
const PILL_WIDTH_SCALE = 2.4;
const PILL_HEIGHT_SCALE = 1.2;
const REVEALED_NODE_SCALE = 0.7;

interface Props {
  data: GraphIR;
  onSelectNode: (node: GraphNode | null) => void;
  selectedNodeId: string | null;
  viewMode: ViewMode;
  revealedNodes: Set<string>;
  interactionMode: InteractionMode;
  edgeSourceId: string | null;
  filters: FilterState;
  theme: ThemeConfig;
  look: "formal" | "mindmap";
  nodeTypeConfigs: NodeTypeConfig[];
  collapsedNodes?: Set<string>;
  /** Nodes hidden unconditionally (e.g. by level-based reveal — REQ-088).
   * Merged with the cascade-derived hidden set in computeCollapseState. */
  hiddenIds?: Set<string>;
  onToggleCollapse?: (nodeId: string) => void;
  onSelectEdge?: (edge: GraphEdge | null, pos?: { x: number; y: number }) => void;
  selectedEdgeKey?: string | null; // "from|to" key for highlighting
  centerOnNode?: { id: string; ts: number } | null;
  fitToViewTrigger?: number;
  zoomAction?: { action: 'in' | 'out'; ts: number } | null;
  onRegisterFitToView?: (fn: () => void) => void;
  onRegisterZoom?: (fns: { zoomIn: () => void; zoomOut: () => void }) => void;
  hiddenLabelTypes?: Set<string>;
  communityOverlay?: Map<string, number>;
  highlightedPath?: string[] | null;
  highlightedCommunity?: number | null;
  exploded?: boolean;
  layoutPreset?: LayoutPreset;
  fontScale?: number;
  edgeTypeConfigs?: EdgeTypeConfig[];
  focusMode?: boolean;
}

function getNodeRadius(node: SimNode, _viewMode: ViewMode, nodeTypeConfigs: NodeTypeConfig[]): number {
  const config = getNodeTypeConfig(nodeTypeConfigs, node.node_type);
  if (config) {
    return getConfigNodeRadius(config, node.properties);
  }
  // Legacy fallback
  if (node.node_type === "concept") return LEGACY_CONCEPT_RADIUS;
  return LEGACY_DEFAULT_RADIUS;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isNodePrimary(node: SimNode, viewMode: ViewMode, _nodeTypeConfigs: NodeTypeConfig[]): boolean {
  if (viewMode === "full") return true;
  // viewMode is a node type id — show only nodes of that type
  return node.node_type === viewMode;
}

type NodeShape = "circle" | "rectangle" | "diamond" | "hexagon" | "triangle" | "pill";

function getNodeShape(node: SimNode, nodeTypeConfigs: NodeTypeConfig[]): NodeShape {
  const config = getNodeTypeConfig(nodeTypeConfigs, node.node_type);
  if (config) return config.shape;
  return "circle";
}

export function GraphCanvas({ data, onSelectNode, selectedNodeId, viewMode, revealedNodes, interactionMode, edgeSourceId, filters, theme, look, nodeTypeConfigs, collapsedNodes, hiddenIds, onToggleCollapse, onSelectEdge, selectedEdgeKey, centerOnNode, fitToViewTrigger, zoomAction, onRegisterFitToView, onRegisterZoom, hiddenLabelTypes, communityOverlay, highlightedPath, highlightedCommunity, exploded, layoutPreset, fontScale = 1, edgeTypeConfigs, focusMode = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Simulation lifecycle — owned by useGraphSimulation; the coordinator wires
  // up the tick handler and pointer events that read the runtime refs below.
  const { simRef, simInitializedRef, regionCachesRef } = useGraphSimulation();
  // Zoom lifecycle — owned by useZoomController; the coordinator attaches the
  // zoom behaviour to the canvas and reads the current transform when drawing.
  const { zoomBehaviorRef, transformRef } = useZoomController();
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const hoveredEdgeRef = useRef<SimLink | null>(null);
  const dragNodeRef = useRef<SimNode | null>(null);
  const isDraggingRef = useRef(false);
  const viewModeRef = useRef(viewMode);
  const revealedRef = useRef(revealedNodes);
  const interactionRef = useRef(interactionMode);
  const edgeSourceRef = useRef(edgeSourceId);
  const filtersRef = useRef(filters);
  const onSelectNodeRef = useRef(onSelectNode);
  const dataRef = useRef(data);
  // BFS depths for the depth-lightness ramp on node colours. Recomputed on
  // every data change; cheap (linear in nodes + edges).
  const hierarchyRef = useRef<HierarchyInfo>(computeHierarchy(data.nodes, data.edges));
  const tooltipRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const isMarqueeRef = useRef(false);
  const canvasSizeRef = useRef({ width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT });
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const classifiersRef = useRef<Classifier[]>([]);
  const explodedRef = useRef(exploded ?? false);
  const layoutPresetRef = useRef<LayoutPreset>(layoutPreset ?? "force");
  const fontScaleRef = useRef(fontScale);
  const themeRef = useRef(theme);
  const lookRef = useRef(look);
  const focusModeRef = useRef(focusMode);
  const selectedNodeIdRef = useRef(selectedNodeId);
  const selectedEdgeKeyRef = useRef(selectedEdgeKey);
  const hiddenLabelTypesRef = useRef(hiddenLabelTypes);
  const communityOverlayRef = useRef(communityOverlay);
  const highlightedPathRef = useRef(highlightedPath);
  const highlightedCommunityRef = useRef(highlightedCommunity);
  const nodeTypeConfigsRef = useRef(nodeTypeConfigs);
  const edgeTypeConfigsRef = useRef(edgeTypeConfigs);
  const collapsedRef = useRef(collapsedNodes ?? new Set<string>());
  const hiddenIdsRef = useRef(hiddenIds ?? new Set<string>());
  const onToggleCollapseRef = useRef(onToggleCollapse);
  const onSelectEdgeRef = useRef(onSelectEdge);
  const hasChildrenRef = useRef<Set<string>>(new Set());

  function redraw() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { width, height } = canvasSizeRef.current;
    if (width && height) draw(ctx, width, height);
  }

  useEffect(() => { onSelectNodeRef.current = onSelectNode; }, [onSelectNode]);
  useEffect(() => { onSelectEdgeRef.current = onSelectEdge; }, [onSelectEdge]);
  useEffect(() => { onToggleCollapseRef.current = onToggleCollapse; }, [onToggleCollapse]);
  useEffect(() => {
    dataRef.current = data;
    hierarchyRef.current = computeHierarchy(data.nodes, data.edges);
    // Re-apply forces when classifiers change (e.g. layout mode switched in sidebar)
    const newCls = data.metadata.classifiers ?? [];
    const oldCls = classifiersRef.current;
    const layoutChanged = newCls.length !== oldCls.length || newCls.some((c, i) => c.layout !== oldCls[i]?.layout || c.id !== oldCls[i]?.id);
    classifiersRef.current = newCls;

    // Sync node data (classifiers, properties) from updated data into simulation nodes
    const simNodes = nodesRef.current;
    const dataNodeMap = new Map(data.nodes.map((n) => [n.id, n]));
    for (const sn of simNodes) {
      const dn = dataNodeMap.get(sn.id);
      if (dn) {
        sn.classifiers = dn.classifiers;
        sn.properties = dn.properties;
        sn.tags = dn.tags;
        sn.notes = dn.notes;
      }
    }

    if (layoutChanged && simRef.current && simInitializedRef.current) {
      const { width, height } = canvasSizeRef.current;
      const simulation = simRef.current;

      const isExploded = explodedRef.current;
      const factor = explodedFactor(isExploded, nodesRef.current.length);
      applyLayoutForces(simulation, width * factor, height * factor, newCls, isExploded, layoutPresetRef.current);
      simulation.alpha(ALPHA_RESTART).restart();
    }
  }, [data]);

  // Sync prop values to refs and trigger canvas redraw. These effects intentionally
  // omit `redraw` from deps — it reads only from refs and is stable.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => { collapsedRef.current = collapsedNodes ?? new Set(); redraw(); }, [collapsedNodes]);
  useEffect(() => { hiddenIdsRef.current = hiddenIds ?? new Set(); redraw(); }, [hiddenIds]);
  useEffect(() => { themeRef.current = theme; redraw(); }, [theme]);
  useEffect(() => { lookRef.current = look; redraw(); }, [look]);
  useEffect(() => { focusModeRef.current = focusMode; redraw(); }, [focusMode]);
  useEffect(() => { selectedNodeIdRef.current = selectedNodeId; redraw(); }, [selectedNodeId]);
  useEffect(() => { hiddenLabelTypesRef.current = hiddenLabelTypes; redraw(); }, [hiddenLabelTypes]);
  useEffect(() => { communityOverlayRef.current = communityOverlay; redraw(); }, [communityOverlay]);
  useEffect(() => { highlightedPathRef.current = highlightedPath; redraw(); }, [highlightedPath]);
  useEffect(() => { highlightedCommunityRef.current = highlightedCommunity; redraw(); }, [highlightedCommunity]);
  useEffect(() => { viewModeRef.current = viewMode; redraw(); }, [viewMode]);
  useEffect(() => { revealedRef.current = revealedNodes; redraw(); }, [revealedNodes]);
  useEffect(() => { interactionRef.current = interactionMode; redraw(); }, [interactionMode]);
  useEffect(() => { edgeSourceRef.current = edgeSourceId; redraw(); }, [edgeSourceId]);
  useEffect(() => { filtersRef.current = filters; redraw(); }, [filters]);
  useEffect(() => { nodeTypeConfigsRef.current = nodeTypeConfigs; redraw(); }, [nodeTypeConfigs]);
  useEffect(() => { edgeTypeConfigsRef.current = edgeTypeConfigs; redraw(); }, [edgeTypeConfigs]);
  useEffect(() => {
    fontScaleRef.current = fontScale;
    // Only update collision force for new font size — don't recompute layout positions
    const simulation = simRef.current;
    if (simulation && simInitializedRef.current) {
      const isExploded = explodedRef.current;
      const collideExtra = isExploded ? COLLISION_PADDING_EXPLODED : COLLISION_PADDING_NORMAL;
      const fontCollideExtra = (fontScale - 1) * 20;
      simulation.force("collide", d3.forceCollide<SimNode>((d) => getNodeRadius(d, "full", nodeTypeConfigsRef.current) + collideExtra + Math.max(0, fontCollideExtra)));
      simulation.alpha(ALPHA_RESTART_MILD).restart();
    } else {
      redraw();
    }
  }, [fontScale]);
  useEffect(() => { selectedEdgeKeyRef.current = selectedEdgeKey; redraw(); }, [selectedEdgeKey]);
  /* eslint-enable react-hooks/exhaustive-deps */

  /**
   * Apply all layout forces to the simulation using given virtual dimensions.
   * Thin wrapper over `applyLayoutForcesImpl` (useGraphSimulation.ts) that
   * supplies the live node/edge data and the region cache slot.
   */
  function applyLayoutForces(simulation: d3.Simulation<SimNode, SimLink>, vw: number, vh: number, cls: Classifier[], isExploded: boolean, preset: LayoutPreset = "force") {
    applyLayoutForcesImpl({
      simulation,
      vw,
      vh,
      classifiers: cls,
      isExploded,
      preset,
      nodes: nodesRef.current,
      edges: dataRef.current.edges,
      nodeTypeConfigs: nodeTypeConfigsRef.current,
      fontCollideExtra: (fontScaleRef.current - 1) * 20,
      regionCaches: regionCachesRef.current,
    });
  }

  // Explode/collapse: recalculate forces using a larger virtual canvas
  useEffect(() => {
    explodedRef.current = exploded ?? false;
    const simulation = simRef.current;
    if (!simulation || !simInitializedRef.current) return;
    const { width, height } = canvasSizeRef.current;
    const cls = classifiersRef.current;
    const isExploded = exploded ?? false;
    const factor = explodedFactor(isExploded, nodesRef.current.length);
    const vw = width * factor;
    const vh = height * factor;
    applyLayoutForces(simulation, vw, vh, cls, isExploded, layoutPresetRef.current);
    simulation.alpha(ALPHA_RESTART).restart();
    // Fit to view after settling in both directions: exploding should bring the
    // fully-spread map back into frame (the one-shot on("end") fit already fired
    // on first load), and collapsing should re-frame the tighter layout. Explode
    // takes longer to settle, so give it a longer delay.
    setTimeout(() => fitToView(), isExploded ? EXPLODE_FIT_DELAY : COLLAPSE_FIT_DELAY);
  }, [exploded]);

  // Re-apply forces when layout preset changes
  useEffect(() => {
    layoutPresetRef.current = layoutPreset ?? "force";
    const simulation = simRef.current;
    if (!simulation || !simInitializedRef.current) return;
    // Clear any pins left by drag-and-drop so the new layout can reposition all nodes
    for (const node of nodesRef.current) {
      node.fx = null;
      node.fy = null;
    }
    const { width, height } = canvasSizeRef.current;
    const cls = classifiersRef.current;
    const isExploded = explodedRef.current;
    const factor = isExploded ? Math.max(3, Math.ceil(Math.sqrt(nodesRef.current.length) / 3)) : 1;
    applyLayoutForces(simulation, width * factor, height * factor, cls, isExploded, layoutPresetRef.current);
    simulation.alpha(ALPHA_RESTART).restart();
    // Fit to view after layout settles
    setTimeout(() => fitToView(), 600);
  }, [layoutPreset]);

  function fitToView() {
    const ns = nodesRef.current;
    const canvas = canvasRef.current;
    if (ns.length === 0 || !canvas) return;

    // Filter to visible nodes only (respecting view mode, filters, collapse)
    const mode = viewModeRef.current;
    const configs = nodeTypeConfigsRef.current;
    const revealed = revealedRef.current;
    const currentFilters = filtersRef.current;
    const hiddenIds = hiddenIdsRef.current;
    const visible = ns.filter((n) => {
      if (hiddenIds.has(n.id)) return false;
      if (!isNodeFilterVisible(n, currentFilters)) return false;
      return isNodePrimary(n, mode, configs) || revealed.has(n.id);
    });
    const fitNodes = visible.length > 0 ? visible : ns;
    const { width: cw, height: ch } = canvasSizeRef.current;
    const t = fitTransform(bboxOf(fitNodes), cw, ch);
    if (t && zoomBehaviorRef.current) {
      d3.select(canvas)
        .transition()
        .duration(FIT_TO_VIEW_DURATION)
        .call(zoomBehaviorRef.current.transform, t);
    }
  }

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvasSizeRef.current = { width, height };
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    ctxRef.current = ctx;

    const simulation = simRef.current;
    if (simulation && simInitializedRef.current) {
      const cls = classifiersRef.current;
      const isExploded = explodedRef.current;
      const factor = explodedFactor(isExploded, nodesRef.current.length);
      applyLayoutForces(simulation, width * factor, height * factor, cls, isExploded, layoutPresetRef.current);
      simulation.alpha(ALPHA_RESTART_MILD).restart();
      setTimeout(() => fitToView(), RESIZE_FIT_DELAY);
    } else {
      redraw();
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one-time setup with stable resizeCanvas

  // Initial simulation setup (once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();
    const { width, height } = canvasSizeRef.current;

    const nodes: SimNode[] = data.nodes.map((n) => {
      const p = initialNodePosition(width, height);
      return { ...n, x: p.x, y: p.y };
    });
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = data.edges
      .filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to))
      .map((e) => ({ source: e.from, target: e.to, edge: e }));

    nodesRef.current = nodes;
    linksRef.current = links;

    const classifiers = data.metadata.classifiers ?? [];
    classifiersRef.current = classifiers;

    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance((d) => LINK_DISTANCE_BASE / Math.max(0.5, (d as SimLink).edge.weight ?? 1)).strength(LINK_FORCE_STRENGTH));

    applyLayoutForces(simulation, width, height, classifiers, false, layoutPresetRef.current);


    simulation.alphaDecay(ALPHA_DECAY);

    simRef.current = simulation;
    simInitializedRef.current = true;
    simulation.on("tick", () => {
      // Region/column positioning — applied directly, not via forces
      const rCls = classifiersRef.current.find((c) => c.layout === "region-column" || c.layout === "region");
      if (rCls?.layout === "region-column") {
        // Hard-pin nodes to their column center line
        const colPositions = regionCachesRef.current.columnPositions;
        for (const n of nodesRef.current) {
          const val = n.classifiers?.[rCls.id];
          if (val) {
            const cx = colPositions.get(String(val));
            if (cx != null) { n.x = cx; n.vx = 0; }
          }
        }
      } else if (rCls?.layout === "region") {
        // Hard-constrain nodes to stay within their region centroid area.
        // Each tick: snap node toward centroid, allow only small offset from collision.
        const targets = regionCachesRef.current.centroids;
        const maxDrift = 120; // max distance a node can drift from centroid (collision spreads them)
        for (const n of nodesRef.current) {
          const val = n.classifiers?.[rCls.id];
          if (val) {
            const target = targets.get(String(val));
            if (target) {
              const dx = n.x - target.x;
              const dy = n.y - target.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > maxDrift) {
                // Clamp to maxDrift radius from centroid
                const scale = maxDrift / dist;
                n.x = target.x + dx * scale;
                n.y = target.y + dy * scale;
              }
              // Also apply a centering pull so nodes cluster near center, not just at edge
              n.x += (target.x - n.x) * 0.05;
              n.y += (target.y - n.y) * 0.05;
              n.vx = (n.vx ?? 0) * 0.9;
              n.vy = (n.vy ?? 0) * 0.9;
            }
          }
        }
      }
      // Containment (explode only): keep every node inside the virtual canvas
      // so a stray, usually low-degree, node can't be flung far outside by the
      // strong exploded repulsion. This keeps the exploded shape even and the
      // fit tight. Skipped when not exploded — normal layouts intentionally
      // overflow the canvas and rely on fitToView to zoom out.
      if (explodedRef.current) {
        const { width: cw, height: ch } = canvasSizeRef.current;
        const factor = explodedFactor(true, nodesRef.current.length);
        const vw = cw * factor;
        const vh = ch * factor;
        const m = 40; // margin from the virtual edge
        for (const n of nodesRef.current) {
          if (n.x < m) { n.x = m; if ((n.vx ?? 0) < 0) n.vx = 0; }
          else if (n.x > vw - m) { n.x = vw - m; if ((n.vx ?? 0) > 0) n.vx = 0; }
          if (n.y < m) { n.y = m; if ((n.vy ?? 0) < 0) n.vy = 0; }
          else if (n.y > vh - m) { n.y = vh - m; if ((n.vy ?? 0) > 0) n.vy = 0; }
        }
      }
      const c = ctxRef.current;
      const { width: w, height: h } = canvasSizeRef.current;
      if (c) draw(c, w, h);
    });

    // Fit graph to viewport only on initial layout (not after user interaction)
    let hasUserZoomed = false;
    simulation.on("end", () => { if (!hasUserZoomed) { fitToView(); hasUserZoomed = true; } });

    // Zoom behavior
    const zoomBehavior = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .filter(() => {
        if (dragNodeRef.current) return false;
        if (isMarqueeRef.current) return false;
        return true;
      })
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        const c = ctxRef.current;
        const { width: w, height: h } = canvasSizeRef.current;
        if (c) draw(c, w, h);
      });

    zoomBehaviorRef.current = zoomBehavior;
    d3.select(canvas).call(zoomBehavior);

    // --- Unified pointer handling ---
    let pointerDownPos = { x: 0, y: 0 };
    let pointerDownNode: SimNode | null = null;

    canvas.addEventListener("pointerdown", (event) => {
      pointerDownPos = { x: event.offsetX, y: event.offsetY };
      isDraggingRef.current = false;

      const node = findNodeAt(event.offsetX, event.offsetY);
      pointerDownNode = node;

      if (!node && event.shiftKey) {
        isMarqueeRef.current = true;
        const t = transformRef.current;
        marqueeRef.current = {
          startX: (event.offsetX - t.x) / t.k,
          startY: (event.offsetY - t.y) / t.k,
          endX: (event.offsetX - t.x) / t.k,
          endY: (event.offsetY - t.y) / t.k,
        };
        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);
        return;
      }

      if (node) {
        // In add-edge mode, select immediately without starting a drag
        if (interactionRef.current !== "normal") {
          const originalNode = dataRef.current.nodes.find((n) => n.id === node.id) ?? null;
          onSelectNodeRef.current(originalNode);
          event.stopPropagation();
          return;
        }
        dragNodeRef.current = node;
        node.fx = node.x;
        node.fy = node.y;
        simulation.alphaTarget(ALPHA_DRAG_TARGET).restart();
        event.stopPropagation();
        canvas.setPointerCapture(event.pointerId);
      }
    });

    canvas.addEventListener("pointermove", (event) => {
      if (isMarqueeRef.current && marqueeRef.current) {
        const t = transformRef.current;
        marqueeRef.current.endX = (event.offsetX - t.x) / t.k;
        marqueeRef.current.endY = (event.offsetY - t.y) / t.k;
        const currentCtx = ctxRef.current;
        const size = canvasSizeRef.current;
        if (currentCtx) draw(currentCtx, size.width, size.height);
        return;
      }

      if (dragNodeRef.current) {
        const dx = event.offsetX - pointerDownPos.x;
        const dy = event.offsetY - pointerDownPos.y;
        if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) isDraggingRef.current = true;

        const t = transformRef.current;
        dragNodeRef.current.fx = (event.offsetX - t.x) / t.k;
        dragNodeRef.current.fy = (event.offsetY - t.y) / t.k;
        const currentCtx = ctxRef.current;
        const size = canvasSizeRef.current;
        if (currentCtx) draw(currentCtx, size.width, size.height);
        return;
      }

      // Hover detection
      const hitNode = findNodeAt(event.offsetX, event.offsetY);
      const newHovered = hitNode?.id ?? null;
      let needsRedraw = false;

      // Check if hovering over a +/- indicator
      let hoverIndicator = false;
      if (!hitNode) {
        const t = transformRef.current;
        const { x: mx, y: my } = pointerToWorld(event.offsetX, event.offsetY, t);
        const configs = nodeTypeConfigsRef.current;
        for (const node of nodesRef.current) {
          const r = getNodeRadius(node, viewModeRef.current, configs);
          const indicatorR = Math.max(COLLAPSE_INDICATOR_MIN_R, COLLAPSE_INDICATOR_BASE_R / t.k);
          if (pointInCollapseIndicator(mx, my, node, r, indicatorR, COLLAPSE_INDICATOR_OFFSET, COLLAPSE_INDICATOR_HIT_SCALE)) {
            hoverIndicator = true;
            break;
          }
        }
      }

      if (newHovered !== hoveredRef.current) {
        hoveredRef.current = newHovered;
        needsRedraw = true;
      }
      const isEdgeMode = interactionRef.current !== "normal";
      canvas.style.cursor = isEdgeMode ? "crosshair" : (newHovered || hoverIndicator) ? "pointer" : "grab";

      // Hover tooltip — shows the full name for nodes whose label was
      // truncated, OR the edge type/note for edges.
      const tooltip = tooltipRef.current;
      if (newHovered && tooltip) {
        if (hoveredEdgeRef.current) {
          hoveredEdgeRef.current = null;
          needsRedraw = true;
        }
        const hoveredNode = nodesRef.current.find((n) => n.id === newHovered);
        if (hoveredNode && hoveredNode.name.length > LABEL_TRUNCATE_LENGTH) {
          tooltip.textContent = hoveredNode.name;
          tooltip.style.display = "block";
          tooltip.style.left = `${event.offsetX + TOOLTIP_OFFSET_X}px`;
          tooltip.style.top = `${event.offsetY + TOOLTIP_OFFSET_Y}px`;
        } else {
          tooltip.style.display = "none";
        }
      } else if (!newHovered && tooltip) {
        const edgeHit = findEdgeAt(event.offsetX, event.offsetY);
        if (edgeHit !== hoveredEdgeRef.current) {
          hoveredEdgeRef.current = edgeHit;
          needsRedraw = true;
        }
        if (edgeHit) {
          const label = edgeTypeConfigsRef.current?.find((et) => et.id === edgeHit.edge.edge_type)?.label ?? EDGE_LABELS[edgeHit.edge.edge_type] ?? edgeHit.edge.edge_type;
          const noteText = edgeHit.edge.note ? `\n${edgeHit.edge.note}` : "";
          tooltip.textContent = `${label}${noteText}`;
          tooltip.style.display = "block";
          tooltip.style.left = `${event.offsetX + TOOLTIP_OFFSET_X}px`;
          tooltip.style.top = `${event.offsetY + TOOLTIP_OFFSET_Y}px`;
        } else {
          tooltip.style.display = "none";
        }
      } else if (tooltip) {
        if (hoveredEdgeRef.current) {
          hoveredEdgeRef.current = null;
          needsRedraw = true;
        }
        tooltip.style.display = "none";
      }

      if (needsRedraw) {
        const currentCtx = ctxRef.current;
        const size = canvasSizeRef.current;
        if (currentCtx) draw(currentCtx, size.width, size.height);
      }
    });

    canvas.addEventListener("pointerup", (event) => {
      if (isMarqueeRef.current && marqueeRef.current) {
        isMarqueeRef.current = false;
        const m = marqueeRef.current;
        marqueeRef.current = null;
        canvas.releasePointerCapture(event.pointerId);

        if (isMarqueeUsable(m)) {
          const size = canvasSizeRef.current;
          const newTransform = marqueeZoomTransform(marqueeToRect(m), size.width, size.height);
          if (zoomBehaviorRef.current) {
            d3.select(canvas)
              .transition()
              .duration(TRANSITION_DURATION)
              .call(zoomBehaviorRef.current.transform, newTransform);
          }
        } else {
          const currentCtx = ctxRef.current;
          const size = canvasSizeRef.current;
          if (currentCtx) draw(currentCtx, size.width, size.height);
        }
        return;
      }

      if (dragNodeRef.current) {
        simulation.alphaTarget(0);

        if (!isDraggingRef.current) {
          dragNodeRef.current.fx = null;
          dragNodeRef.current.fy = null;
          const clickedNode = pointerDownNode;
          dragNodeRef.current = null;
          canvas.releasePointerCapture(event.pointerId);

          // Check if the click was on a collapse indicator near the node
          let hitIndicator = false;
          if (clickedNode && onToggleCollapseRef.current && hasChildrenRef.current.has(clickedNode.id)) {
            const t = transformRef.current;
            const { x: mx, y: my } = pointerToWorld(event.offsetX, event.offsetY, t);
            const configs = nodeTypeConfigsRef.current;
            const r = getNodeRadius(clickedNode as SimNode, viewModeRef.current, configs);
            const indicatorR = Math.max(COLLAPSE_INDICATOR_MIN_R, COLLAPSE_INDICATOR_BASE_R / t.k);
            if (pointInCollapseIndicator(mx, my, clickedNode, r, indicatorR, COLLAPSE_INDICATOR_OFFSET, COLLAPSE_INDICATOR_CLICK_SCALE)) {
              onToggleCollapseRef.current(clickedNode.id);
              hitIndicator = true;
            }
          }

          if (!hitIndicator && clickedNode) {
            const originalNode = dataRef.current.nodes.find((n) => n.id === clickedNode.id) ?? null;
            onSelectNodeRef.current(originalNode);
          }
        } else {
          dragNodeRef.current = null;
          canvas.releasePointerCapture(event.pointerId);
        }

        isDraggingRef.current = false;
        pointerDownNode = null;
        return;
      }

      if (!isDraggingRef.current && !pointerDownNode) {
        // Check if the click was on a +/- collapse indicator (outside node radius)
        const t = transformRef.current;
        const { x: mx, y: my } = pointerToWorld(event.offsetX, event.offsetY, t);
        let hitIndicator = false;
        if (onToggleCollapseRef.current) {
          const configs = nodeTypeConfigsRef.current;
          for (const node of nodesRef.current) {
            if (!hasChildrenRef.current.has(node.id)) continue;
            const r = getNodeRadius(node, viewModeRef.current, configs);
            const indicatorR = Math.max(COLLAPSE_INDICATOR_MIN_R, COLLAPSE_INDICATOR_BASE_R / t.k);
            if (pointInCollapseIndicator(mx, my, node, r, indicatorR, COLLAPSE_INDICATOR_OFFSET, COLLAPSE_INDICATOR_CLICK_SCALE)) {
              onToggleCollapseRef.current(node.id);
              hitIndicator = true;
              break;
            }
          }
        }
        if (!hitIndicator) {
          // Check if click hit an edge
          const edgeHit = findEdgeAt(event.offsetX, event.offsetY);
          if (edgeHit && onSelectEdgeRef.current) {
            onSelectEdgeRef.current(edgeHit.edge, { x: event.offsetX, y: event.offsetY });
          } else {
            if (onSelectEdgeRef.current) onSelectEdgeRef.current(null);
            onSelectNodeRef.current(null);
          }
        }
      }
      pointerDownNode = null;
    });

    return () => { simulation.stop(); simInitializedRef.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- one-time simulation setup

  // Update simulation in-place when data changes
  useEffect(() => {
    if (!simInitializedRef.current) return;
    const simulation = simRef.current;
    if (!simulation) return;

    const existingMap = new Map(nodesRef.current.map((n) => [n.id, n]));
    const newNodeIds = new Set(data.nodes.map((n) => n.id));
    const existingNodeIds = new Set(nodesRef.current.map((n) => n.id));

    for (const n of data.nodes) {
      const existing = existingMap.get(n.id);
      if (existing) {
        existing.name = n.name;
        existing.node_type = n.node_type;
        existing.classifiers = n.classifiers;
        existing.properties = n.properties;
        existing.notes = n.notes;
        existing.tags = n.tags;
      }
    }

    const { width, height } = canvasSizeRef.current;
    const addedNodes: SimNode[] = data.nodes
      .filter((n) => !existingNodeIds.has(n.id))
      .map((n) => {
        const p = newNodeSpawnPosition(width, height);
        return { ...n, x: p.x, y: p.y };
      });

    const updatedNodes = nodesRef.current.filter((n) => newNodeIds.has(n.id)).concat(addedNodes);
    nodesRef.current = updatedNodes;

    const nodeMap = new Map(updatedNodes.map((n) => [n.id, n]));
    const newLinks: SimLink[] = data.edges
      .filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to))
      .map((e) => ({ source: e.from, target: e.to, edge: e }));
    linksRef.current = newLinks;

    simulation.nodes(updatedNodes);
    const linkForce = simulation.force("link") as d3.ForceLink<SimNode, SimLink>;
    if (linkForce) linkForce.links(newLinks);

    if (addedNodes.length > 0 || updatedNodes.length !== existingNodeIds.size) {
      simulation.alpha(ALPHA_RESTART_MILD).restart();
    } else {
      redraw();
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps -- redraw reads from refs

  function findNodeAt(canvasX: number, canvasY: number): SimNode | null {
    const t = transformRef.current;
    const { x, y } = pointerToWorld(canvasX, canvasY, t);
    const mode = viewModeRef.current;
    const revealed = revealedRef.current;
    const isAdding = interactionRef.current !== "normal";
    const configs = nodeTypeConfigsRef.current;
    const currentFilters = filtersRef.current;
    return hitTestNode<SimNode>(
      x,
      y,
      nodesRef.current,
      (n) => getNodeRadius(n, mode, configs),
      (n) => {
        if (!isNodeFilterVisible(n, currentFilters)) return false;
        if (!isAdding && !isNodePrimary(n, mode, configs) && !revealed.has(n.id)) return false;
        return true;
      },
    );
  }

  function findEdgeAt(canvasX: number, canvasY: number): SimLink | null {
    const t = transformRef.current;
    const { x, y } = pointerToWorld(canvasX, canvasY, t);
    return hitTestEdge(x, y, linksRef.current, EDGE_HIT_THRESHOLD / t.k);
  }

  function draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const t = transformRef.current;
    const mode = viewModeRef.current;
    const revealed = revealedRef.current;
    const edgeSrc = edgeSourceRef.current;
    const isAdding = interactionRef.current !== "normal";
    const currentData = dataRef.current;
    const hoveredEdge = hoveredEdgeRef.current;
    const th = themeRef.current;
    const configs = nodeTypeConfigsRef.current;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    const hovered = hoveredRef.current;
    const selected = selectedNodeIdRef.current;
    const connectedToHighlight = new Set<string>();

    if (hovered || selected) {
      const focusId = hovered || selected;
      // Always include the focused node itself (handles isolated nodes with no edges)
      if (focusId) connectedToHighlight.add(focusId);
      linksRef.current.forEach((l) => {
        const src = typeof l.source === "string" ? l.source : l.source.id;
        const tgt = typeof l.target === "string" ? l.target : l.target.id;
        if (src === focusId || tgt === focusId) {
          connectedToHighlight.add(src);
          connectedToHighlight.add(tgt);
        }
      });
    }

    // REQ-088 unified visibility — hiddenIds is computed by computeVisibility
    // in App.tsx and already accounts for both stepper (depth) and manual +/-
    // overrides. We only call computeCollapseState here to derive hasChildren
    // (which nodes get a clickable +/- glyph); its hiddenByCollapse cascade
    // is intentionally ignored.
    const collapsed = collapsedRef.current;
    const hiddenIds = hiddenIdsRef.current;
    const { hasChildren } = computeCollapseState(currentData.edges, collapsed);
    hasChildrenRef.current = hasChildren;

    const currentFilters = filtersRef.current;
    const isVisible = (node: SimNode) => {
      if (hiddenIds.has(node.id)) return false;
      if (!isNodeFilterVisible(node, currentFilters)) return false;
      if (isAdding) return true;
      return isNodePrimary(node, mode, configs) || revealed.has(node.id);
    };

    // Draw region backgrounds (behind everything)
    const regionCls = (currentData.metadata.classifiers ?? []).find((c) => c.layout === "region" || c.layout === "region-column");
    if (regionCls) {
      const visibleNodes = nodesRef.current.filter(isVisible);
      const isOrganic = lookRef.current === "mindmap";
      const isColumn = regionCls.layout === "region-column";

      for (const rv of regionCls.values) {
        const members = visibleNodes.filter((n) => String(n.classifiers?.[regionCls.id]) === rv.id);
        const color = th.classifierColorOverrides?.[rv.id] ?? rv.color ?? "#666";

        if (isColumn) {
          const cachedPositions = regionCachesRef.current.columnPositions;
          const cachedWidths = regionCachesRef.current.columnWidths;
          const cachedLeftEdges = regionCachesRef.current.columnLeftEdges;
          if (cachedPositions.size === 0) continue;
          const colX = cachedPositions.get(rv.id) ?? width / 2;
          const colLeft = cachedLeftEdges.get(rv.id) ?? 0;
          const thisColW = cachedWidths.get(rv.id) ?? 100;
          const viewTop = -t.y / t.k;
          const viewBottom = (height - t.y) / t.k;

          // Subtle tinted background
          ctx.globalAlpha = COLUMN_BG_ALPHA;
          ctx.fillStyle = color;
          ctx.fillRect(colLeft, viewTop, thisColW, viewBottom - viewTop);

          // Separator line on right edge of each column (except last)
          const colRight = colLeft + thisColW;
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = th.canvasEdgeDim;
          ctx.lineWidth = 1 / t.k; // 1px regardless of zoom
          ctx.beginPath();
          ctx.moveTo(colRight, viewTop);
          ctx.lineTo(colRight, viewBottom);
          ctx.stroke();

          // Column label at top center
          const maxLabelW = thisColW * COLUMN_LABEL_WIDTH_RATIO;
          const fontSize = Math.min(COLUMN_LABEL_MAX_FONT, Math.max(COLUMN_LABEL_MIN_FONT, maxLabelW / rv.label.length * COLUMN_LABEL_SIZE_FACTOR));
          ctx.globalAlpha = COLUMN_LABEL_ALPHA;
          ctx.fillStyle = th.canvasLabelHighlight;
          ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          const measured = ctx.measureText(rv.label);
          const label = measured.width > maxLabelW
            ? rv.label.slice(0, Math.floor(rv.label.length * maxLabelW / measured.width) - 1) + "…"
            : rv.label;
          ctx.fillText(label, colX, viewTop + COLUMN_LABEL_TOP_OFFSET);
          ctx.globalAlpha = 1;
        } else {
          // Circle layout: draw circle at region centroid, sized to contain all members
          const targets = regionCachesRef.current.centroids;
          const target = targets.get(rv.id);
          if (!target) continue;
          const cx = target.x;
          const cy = target.y;
          const radius = regionClusterRadius(target, members, REGION_CIRCLE_PADDING, 40);

          // Filled background
          ctx.globalAlpha = REGION_CIRCLE_BG_ALPHA;
          ctx.fillStyle = color;
          if (isOrganic) {
            drawOrganicCircle(ctx, cx, cy, radius, hashCode(rv.id));
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          }
          // Outline stroke for visibility
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5 / t.k;
          if (isOrganic) {
            drawOrganicCircle(ctx, cx, cy, radius, hashCode(rv.id));
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Region label
          ctx.globalAlpha = REGION_LABEL_ALPHA;
          ctx.fillStyle = th.canvasLabelHighlight;
          ctx.font = `bold ${REGION_LABEL_FONT_SIZE}px -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(rv.label, cx, cy - radius - REGION_LABEL_GAP);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Draw edges
    linksRef.current.forEach((l) => {
      const source = l.source as SimNode;
      const target = l.target as SimNode;
      if (!isVisible(source) || !isVisible(target)) return;

      const visual = l.edge.visual;
      const isHighlighted = connectedToHighlight.size === 0 || (connectedToHighlight.has(source.id) && connectedToHighlight.has(target.id));
      const isRevealed = !isAdding && (revealed.has(source.id) || revealed.has(target.id));
      const isEdgeHovered = hoveredEdge === l;
      const isEdgeSelected = selectedEdgeKeyRef.current === `${source.id}|${target.id}` || selectedEdgeKeyRef.current === `${target.id}|${source.id}`;

      // Check if this edge is on the highlighted path
      const hPath = highlightedPathRef.current;
      let isOnPath = false;
      if (hPath && hPath.length > 1) {
        for (let pi = 0; pi < hPath.length - 1; pi++) {
          if ((hPath[pi] === source.id && hPath[pi + 1] === target.id) ||
              (hPath[pi] === target.id && hPath[pi + 1] === source.id)) {
            isOnPath = true;
            break;
          }
        }
      }

      if (visual.style === "dashed") ctx.setLineDash([6, 4]);
      else if (visual.style === "dotted") ctx.setLineDash([2, 4]);
      else ctx.setLineDash([]);

      // Dim edges not connected to highlighted community
      const commMap = communityOverlayRef.current;
      const hCommEdge = highlightedCommunityRef.current;
      const sourceInComm = commMap ? commMap.get(source.id) === hCommEdge : true;
      const targetInComm = commMap ? commMap.get(target.id) === hCommEdge : true;
      const edgeDimmedByCommunity = hCommEdge != null && !sourceInComm && !targetInComm;
      const edgeBridgeToCommunity = hCommEdge != null && (sourceInComm !== targetInComm);

      // Weight scales line thickness: weight 1.0 = normal, 2.0 = double, etc.
      const weightScale = Math.max(0.3, Math.min(4, l.edge.weight ?? 1));

      let edgeLw: number;
      if (edgeDimmedByCommunity) {
        ctx.strokeStyle = "#444444";
        ctx.globalAlpha = 0.02;
        edgeLw = 0.2;
      } else if (edgeBridgeToCommunity) {
        ctx.strokeStyle = "#FF6B35";
        ctx.globalAlpha = 0.7;
        edgeLw = 1.8 * weightScale;
        ctx.setLineDash([4, 3]);
      } else if (isOnPath) {
        ctx.strokeStyle = "#FF6B35";
        ctx.globalAlpha = 1;
        edgeLw = 3 * weightScale;
        ctx.setLineDash([]);
      } else if (isEdgeHovered || isEdgeSelected) {
        ctx.strokeStyle = th.canvasEdgeHover;
        ctx.globalAlpha = 0.9;
        edgeLw = 2.5 * weightScale;
      } else {
        const edgeColor = th.edgeColorOverrides[l.edge.edge_type] ?? visual.color;
        if (focusModeRef.current) {
          const hasNodeSelection = selected && connectedToHighlight.size > 0;
          ctx.strokeStyle = edgeColor ?? (isHighlighted ? th.canvasEdgeDefault : th.canvasEdgeDim);
          const alpha = isHighlighted ? 0.8 : hasNodeSelection ? 0.03 : isRevealed ? 0.4 : 0.15;
          ctx.globalAlpha = alpha;
          edgeLw = (isHighlighted ? 1.5 : 0.8) * weightScale;
        } else {
          ctx.strokeStyle = edgeColor ?? th.canvasEdgeDefault;
          ctx.globalAlpha = isRevealed ? 0.4 : 0.8;
          edgeLw = 1.5 * weightScale;
        }
      }

      if (lookRef.current === "mindmap") {
        // Mindmap: cubic Bézier with dramatic taper and subtle S-curve
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;

        const edgeSeed = hashCode(source.id + target.id);
        const curveSide = seededRandom(edgeSeed, 0) > 0 ? 1 : -1;
        const curveAmount = Math.min(dist * MINDMAP_EDGE_CURVE_FACTOR, MINDMAP_EDGE_CURVE_MAX);

        // Two control points for cubic Bézier (S-curve capable)
        const t1 = 0.33, t2 = 0.67;
        const baseOffsetCP1 = curveAmount * curveSide;
        const baseOffsetCP2 = curveAmount * curveSide * (1 - 2 * MINDMAP_EDGE_S_CURVE_MIX);

        const cp1x = source.x + dx * t1 + nx * baseOffsetCP1;
        const cp1y = source.y + dy * t1 + ny * baseOffsetCP1;
        const cp2x = source.x + dx * t2 + nx * baseOffsetCP2;
        const cp2y = source.y + dy * t2 + ny * baseOffsetCP2;

        // Taper widths (clamped to source node radius and short edges)
        const sourceR = getNodeRadius(source, mode, configs);
        const srcW = Math.min(edgeLw * MINDMAP_EDGE_SRC_WIDTH, sourceR * 0.8, dist * 0.3);
        const tgtW = edgeLw * MINDMAP_EDGE_TGT_WIDTH;
        const cp1W = srcW + (tgtW - srcW) * t1;
        const cp2W = srcW + (tgtW - srcW) * t2;

        // Filled tapered shape: two cubic curves tracing left/right sides
        ctx.beginPath();
        ctx.moveTo(source.x + nx * srcW, source.y + ny * srcW);
        ctx.bezierCurveTo(
          cp1x + nx * cp1W, cp1y + ny * cp1W,
          cp2x + nx * cp2W, cp2y + ny * cp2W,
          target.x + nx * tgtW, target.y + ny * tgtW,
        );
        ctx.bezierCurveTo(
          cp2x - nx * cp2W, cp2y - ny * cp2W,
          cp1x - nx * cp1W, cp1y - ny * cp1W,
          source.x - nx * srcW, source.y - ny * srcW,
        );
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle as string;
        ctx.fill();
        ctx.setLineDash([]);
      } else {
        // Formal: straight line
        ctx.lineWidth = edgeLw;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Arrowhead (skipped in mindmap mode — taper implies direction)
      if (visual.show_arrow && lookRef.current !== "mindmap") {
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const r = getNodeRadius(target, mode, configs) + ARROWHEAD_CLEARANCE;
        const tipX = target.x - Math.cos(angle) * r;
        const tipY = target.y - Math.sin(angle) * r;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - ARROWHEAD_SIZE * Math.cos(angle - ARROWHEAD_ANGLE), tipY - ARROWHEAD_SIZE * Math.sin(angle - ARROWHEAD_ANGLE));
        ctx.lineTo(tipX - ARROWHEAD_SIZE * Math.cos(angle + ARROWHEAD_ANGLE), tipY - ARROWHEAD_SIZE * Math.sin(angle + ARROWHEAD_ANGLE));
        ctx.closePath();
        ctx.fillStyle = isEdgeHovered ? th.canvasEdgeHover : (th.edgeColorOverrides[l.edge.edge_type] ?? visual.color ?? th.canvasEdgeDefault);
        const arrowAlpha = isEdgeHovered ? 0.9 : (isHighlighted ? 0.8 : 0.15);
        ctx.globalAlpha = arrowAlpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Edge label
      const showInFilteredView = (mode === "people" || mode === "concepts") && !isAdding && t.k > ZOOM_THRESHOLD_EDGE_LABELS_FILTERED;
      const showForHighlighted = isHighlighted && t.k > ZOOM_THRESHOLD_EDGE_LABELS_HIGHLIGHT;

      const edgeLabelHidden = hiddenLabelTypesRef.current?.has(`edge:${l.edge.edge_type}`);
      if (!edgeLabelHidden && !edgeDimmedByCommunity && (showInFilteredView || showForHighlighted)) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const label = edgeTypeConfigsRef.current?.find((et) => et.id === l.edge.edge_type)?.label ?? EDGE_LABELS[l.edge.edge_type] ?? l.edge.edge_type;

        ctx.save();
        ctx.translate(midX, midY);
        let angle = Math.atan2(target.y - source.y, target.x - source.x);
        if (angle > Math.PI / 2) angle -= Math.PI;
        if (angle < -Math.PI / 2) angle += Math.PI;
        ctx.rotate(angle);

        ctx.font = `${EDGE_LABEL_FONT_SIZE * fontScaleRef.current}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = isHighlighted ? th.canvasLabelHighlight : th.canvasLabelDim;
        ctx.fillText(label, 0, EDGE_LABEL_Y_OFFSET);
        ctx.restore();
      }
    });

    // Draw nodes
    nodesRef.current.forEach((node) => {
      if (!isVisible(node)) return;

      const r = getNodeRadius(node, mode, configs);
      const communityMap = communityOverlayRef.current;
      const hComm = highlightedCommunityRef.current;
      let color: string;
      if (communityMap) {
        const comm = communityMap.get(node.id);
        color = comm != null ? communityColor(comm) : "#666";
        if (hComm != null && comm !== hComm) {
          color = "#444444";
          ctx.globalAlpha = 0.06;
        }
      } else {
        const classifiers = currentData.metadata.classifiers ?? [];
        color = getNodeColor(node, classifiers, th.streamColorOverrides);
        // Layer BFS depth as a lightness ramp on top of the classifier colour
        // so deeper nodes appear paler — preserves hue, varies the visual field.
        const hier = hierarchyRef.current;
        const depth = hier.depths.get(node.id) ?? 0;
        color = applyDepthLightness(color, depth, hier.maxDepth);
      }
      const isPrimary = isAdding || isNodePrimary(node, mode, configs);
      const isRevealed = !isPrimary && revealed.has(node.id);
      const isHighlighted = connectedToHighlight.size === 0 || connectedToHighlight.has(node.id);
      const isSelected = node.id === selected;
      const isHovered = node.id === hovered;
      const isEdgeSource = node.id === edgeSrc;

      // Dimming: community highlight takes priority over node selection
      const communityActive = hComm != null && communityMap;
      if (!communityActive) {
        if (focusModeRef.current) {
          const hasSelection = selected && connectedToHighlight.size > 0;
          const alpha = isHighlighted
            ? (isRevealed ? 0.7 : 1)
            : (hasSelection ? 0.08 : 0.25);
          ctx.globalAlpha = alpha;
        } else {
          ctx.globalAlpha = isRevealed ? 0.7 : 1;
        }
      }

      const effectiveR = isRevealed ? r * REVEALED_NODE_SCALE : r;
      const shape = getNodeShape(node, configs);

      // Draw shape path
      ctx.beginPath();
      if (shape === "rectangle") {
        const w = effectiveR * RECT_WIDTH_SCALE;
        const h = effectiveR * RECT_HEIGHT_SCALE;
        ctx.roundRect(node.x - w / 2, node.y - h / 2, w, h, RECT_CORNER_RADIUS);
      } else if (shape === "diamond") {
        const s = effectiveR * DIAMOND_SCALE;
        ctx.moveTo(node.x, node.y - s);
        ctx.lineTo(node.x + s, node.y);
        ctx.lineTo(node.x, node.y + s);
        ctx.lineTo(node.x - s, node.y);
        ctx.closePath();
      } else if (shape === "hexagon") {
        const s = effectiveR * HEXAGON_SCALE;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = node.x + s * Math.cos(angle);
          const py = node.y + s * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else if (shape === "triangle") {
        const s = effectiveR * TRIANGLE_SCALE;
        ctx.moveTo(node.x, node.y - s);
        ctx.lineTo(node.x + s * 0.87, node.y + s * 0.5);
        ctx.lineTo(node.x - s * 0.87, node.y + s * 0.5);
        ctx.closePath();
      } else if (shape === "pill") {
        const w = effectiveR * PILL_WIDTH_SCALE;
        const h = effectiveR * PILL_HEIGHT_SCALE;
        ctx.roundRect(node.x - w / 2, node.y - h / 2, w, h, h / 2);
      } else {
        ctx.arc(node.x, node.y, effectiveR, 0, Math.PI * 2);
      }
      ctx.fillStyle = color;
      ctx.fill();
      if (isSelected || isHovered || isEdgeSource) {
        if (isEdgeSource) {
          // Bold double-ring glow for edge source — scaled inversely with zoom so always visible
          const zoomCompensate = Math.max(1, 1.5 / t.k);
          ctx.strokeStyle = th.canvasEdgeSourceStroke;
          ctx.lineWidth = 4 * zoomCompensate;
          ctx.stroke();
          // Outer glow ring
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.lineWidth = 14 * zoomCompensate;
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.strokeStyle = th.canvasSelectionStroke;
          ctx.lineWidth = SELECTION_STROKE_WIDTH;
          ctx.stroke();
        }
      }

      // Per-node ideographic icon (stored in node.properties.node_icon)
      const nodeIcon = node.properties?.node_icon;
      if (nodeIcon && typeof nodeIcon === "string") {
        const iconSize = Math.max(10, effectiveR * 0.85);
        ctx.font = `${iconSize}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.9;
        ctx.fillText(nodeIcon, node.x, node.y);
        ctx.textBaseline = "alphabetic";
        ctx.globalAlpha = 1;
      }

      // Notes indicator
      if (node.notes && t.k > ZOOM_THRESHOLD_NOTES) {
        ctx.fillStyle = th.canvasNotesIndicator;
        ctx.beginPath();
        ctx.arc(node.x + effectiveR + NOTES_DOT_OFFSET, node.y - effectiveR - NOTES_DOT_OFFSET, NOTES_DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      // Labels
      const sizeFieldValue = node.properties?.[configs.find((c) => c.id === node.node_type)?.size_field ?? ""];
      const isDominant = sizeFieldValue === "dominant";
      const nodeLabelHidden = hiddenLabelTypesRef.current?.has(`node:${node.node_type}`);
      if (!nodeLabelHidden && (t.k > ZOOM_THRESHOLD_LABELS || isDominant)) {
        const fontSize = Math.max(NODE_LABEL_MIN_FONT, Math.min(NODE_LABEL_MAX_FONT * fontScaleRef.current, NODE_LABEL_BASE_FONT * Math.sqrt(t.k) * fontScaleRef.current));
        ctx.font = `${fontSize}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        const baseY = node.y + effectiveR + fontSize + 2;

        const tagsValue = node.tags;
        const showTags = mode === "people" && !isAdding && tagsValue && t.k > ZOOM_THRESHOLD_TAGS;
        const tagsStr = showTags && tagsValue ? tagsValue.join(", ") : "";
        const tagsText = showTags ? tagsStr : "";
        const tagsFS = fontSize - 2;

        if (showTags) {
          ctx.font = `${tagsFS}px -apple-system, sans-serif`;
          ctx.measureText(tagsText);
          ctx.font = `${fontSize}px -apple-system, sans-serif`;
        }

        const labelColor = (!focusModeRef.current || isHighlighted) ? (isRevealed ? th.canvasLabelDim : th.canvasLabelHighlight) : th.canvasLabelDim;
        ctx.fillStyle = labelColor;
        ctx.fillText(truncateLabel(node.name), node.x, baseY);

        if (showTags) {
          ctx.font = `${tagsFS}px -apple-system, sans-serif`;
          ctx.fillStyle = isHighlighted ? th.canvasLabelDim : th.canvasLabelDim;
          ctx.fillText(tagsText, node.x, baseY + tagsFS + 2);
        }
      }

      // Draw +/- collapse indicator for nodes with directed children
      if (hasChildren.has(node.id) && t.k > ZOOM_THRESHOLD_LABELS) {
        const isCollapsed = collapsed.has(node.id);
        const indicatorR = Math.max(COLLAPSE_INDICATOR_MIN_R, COLLAPSE_INDICATOR_BASE_R / t.k);
        const ix = node.x + effectiveR + indicatorR + COLLAPSE_INDICATOR_OFFSET;
        const iy = node.y - effectiveR;
        ctx.beginPath();
        ctx.arc(ix, iy, indicatorR, 0, Math.PI * 2);
        ctx.fillStyle = th.bgPanel;
        ctx.fill();
        ctx.strokeStyle = th.textMuted;
        ctx.lineWidth = 1 / t.k;
        ctx.stroke();
        ctx.font = `bold ${indicatorR * COLLAPSE_INDICATOR_FONT_SCALE}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = th.textPrimary;
        ctx.fillText(isCollapsed ? "+" : "\u2212", ix, iy);
      }

      ctx.globalAlpha = 1;
    });

    // Draw marquee rectangle if active
    if (isMarqueeRef.current && marqueeRef.current) {
      const m = marqueeRef.current;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = MARQUEE_LINE_WIDTH / t.k;
      ctx.strokeRect(
        Math.min(m.startX, m.endX),
        Math.min(m.startY, m.endY),
        Math.abs(m.endX - m.startX),
        Math.abs(m.endY - m.startY)
      );
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // Register fitToView callback for parent
  useEffect(() => {
    if (onRegisterFitToView) onRegisterFitToView(() => fitToView());
  }, [onRegisterFitToView]);

  // Register zoom in/out callbacks for parent
  useEffect(() => {
    if (!onRegisterZoom) return;
    const zoomBy = (factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !zoomBehaviorRef.current) return;
      const t = transformRef.current;
      const cx = canvas.width / (2 * (window.devicePixelRatio || 1));
      const cy = canvas.height / (2 * (window.devicePixelRatio || 1));
      const newT = zoomByCenterTransform(t, cx, cy, factor);
      d3.select(canvas).transition().duration(ZOOM_BUTTON_DURATION)
        .call(zoomBehaviorRef.current!.transform, newT);
    };
    onRegisterZoom({
      zoomIn: () => zoomBy(ZOOM_IN_FACTOR),
      zoomOut: () => zoomBy(ZOOM_OUT_FACTOR),
    });
  }, [onRegisterZoom]);

  // Declarative fit-to-view trigger
  useEffect(() => {
    if (fitToViewTrigger && fitToViewTrigger > 0) fitToView();
  }, [fitToViewTrigger]);

  // Declarative zoom action trigger
  useEffect(() => {
    if (!zoomAction) return;
    const canvas = canvasRef.current;
    if (!canvas || !zoomBehaviorRef.current) return;
    const factor = zoomAction.action === 'in' ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
    const t = transformRef.current;
    const cx = canvas.width / (2 * (window.devicePixelRatio || 1));
    const cy = canvas.height / (2 * (window.devicePixelRatio || 1));
    const newT = zoomByCenterTransform(t, cx, cy, factor);
    d3.select(canvas).transition().duration(ZOOM_BUTTON_DURATION)
      .call(zoomBehaviorRef.current!.transform, newT);
  }, [zoomAction]);

  // Center on a specific node when requested
  useEffect(() => {
    if (!centerOnNode) return;
    const canvas = canvasRef.current;
    if (!canvas || !zoomBehaviorRef.current) return;
    const node = nodesRef.current.find((n) => n.id === centerOnNode.id);
    if (!node) return;
    const { width: cw, height: ch } = canvasSizeRef.current;
    const t = centerOnNodeTransform(node.x, node.y, cw, ch, CENTER_ON_NODE_SCALE);
    d3.select(canvas)
      .transition()
      .duration(TRANSITION_DURATION)
      .call(zoomBehaviorRef.current.transform, t);
  }, [centerOnNode]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} />
      <div
        ref={tooltipRef}
        className="edge-tooltip"
        style={{ display: "none" }}
      />
    </div>
  );
}
