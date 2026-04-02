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
import { getNodeColor } from "./node-color";
import { communityColor } from "../ui/AnalysisPanel";
import { computeFlowDepths, computeFlowPositions, computeRadialTargets } from "./layout-presets";

// --- Organic rendering helpers ---

/** Deterministic hash from a string, for stable jitter per node */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

/** Deterministic pseudo-random from seed, returns -1 to 1 */
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297 + 233280) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

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

/** Catmull-Rom smoothing factor for blob control handles (0–1, higher = rounder) */
const MINDMAP_BLOB_SMOOTH = 0.55;

/**
 * Draw a smooth closed blob shape through guide points using cubic Bézier splines.
 * Uses Catmull-Rom-to-Bézier conversion for C2-continuous curves.
 * Wobble is applied radially from centroid for a hand-drawn feel.
 */
function drawMindmapBlob(
  ctx: CanvasRenderingContext2D,
  guidePoints: Array<[number, number]>,
  seed: number,
  wobbleAmount: number,
) {
  const n = guidePoints.length;
  // Compute centroid
  let centX = 0, centY = 0;
  for (const p of guidePoints) { centX += p[0]; centY += p[1]; }
  centX /= n; centY /= n;

  // Apply radial wobble to each guide point
  const pts: Array<[number, number]> = guidePoints.map((p, i) => {
    const dx = p[0] - centX;
    const dy = p[1] - centY;
    const wobble = 1 + seededRandom(seed, i) * wobbleAmount;
    return [centX + dx * wobble, centY + dy * wobble];
  });

  // Build smooth closed cubic Bézier spline via Catmull-Rom tangents
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const next2 = pts[(i + 2) % n];

    // Catmull-Rom tangent at curr → cp1, tangent at next → cp2
    const t1x = (next[0] - prev[0]) * MINDMAP_BLOB_SMOOTH / 3;
    const t1y = (next[1] - prev[1]) * MINDMAP_BLOB_SMOOTH / 3;
    const t2x = (next2[0] - curr[0]) * MINDMAP_BLOB_SMOOTH / 3;
    const t2y = (next2[1] - curr[1]) * MINDMAP_BLOB_SMOOTH / 3;

    if (i === 0) ctx.moveTo(curr[0], curr[1]);
    ctx.bezierCurveTo(
      curr[0] + t1x, curr[1] + t1y,
      next[0] - t2x, next[1] - t2y,
      next[0], next[1],
    );
  }
  ctx.closePath();
}

/** Compute centroid positions for region layout, arranged in a grid */
function computeRegionCentroids(
  regionCls: Classifier,
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  const n = regionCls.values.length;
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const result = new Map<string, { x: number; y: number }>();
  regionCls.values.forEach((v, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = width * (X_LAYOUT_START + (X_LAYOUT_RANGE * col) / Math.max(cols - 1, 1));
    const y = height * (Y_LAYOUT_START + (Y_LAYOUT_RANGE * row) / Math.max(rows - 1, 1));
    result.set(v.id, { x, y });
  });
  return result;
}

/** Compute proportional column positions based on node counts per value.
 *  Columns with more nodes get more width. Minimum width ensures small groups are visible. */
function computeRegionColumns(
  regionCls: Classifier,
  width: number,
  nodeCounts?: Map<string, number>,
): { positions: Map<string, number>; widths: Map<string, number>; leftEdges: Map<string, number> } {
  const n = regionCls.values.length;
  if (n === 0) return { positions: new Map(), widths: new Map(), leftEdges: new Map() };

  const minColFraction = 0.06; // minimum 6% of width for any column
  const total = nodeCounts ? [...nodeCounts.values()].reduce((a, b) => a + b, 0) : 0;

  // Compute raw proportions, then enforce minimums
  const rawFractions = regionCls.values.map((v) => {
    const count = nodeCounts?.get(v.id) ?? 0;
    return total > 0 ? Math.max(minColFraction, count / total) : 1 / n;
  });
  const fractionSum = rawFractions.reduce((a, b) => a + b, 0);
  const normalized = rawFractions.map((f) => f / fractionSum); // normalize to sum=1

  const positions = new Map<string, number>();
  const widths = new Map<string, number>();
  const leftEdges = new Map<string, number>();
  let x = 0;
  regionCls.values.forEach((v, i) => {
    const colW = width * normalized[i];
    leftEdges.set(v.id, x);
    widths.set(v.id, colW);
    positions.set(v.id, x + colW / 2); // center of column
    x += colW;
  });
  return { positions, widths, leftEdges };
}

// --- Configuration constants ---
/* eslint-disable @typescript-eslint/no-unused-vars */

// D3 force simulation
const CHARGE_STRENGTH_NORMAL = -400;
const CHARGE_STRENGTH_EXPLODED = -1500;
const CHARGE_DISTANCE_MAX_NORMAL = 800;
const CHARGE_DISTANCE_MAX_EXPLODED = 3000;
const COLLISION_PADDING_NORMAL = 12;
const COLLISION_PADDING_EXPLODED = 40;
const LINK_DISTANCE_BASE = 120;
const LINK_FORCE_STRENGTH = 0.2;
const ALPHA_DECAY = 0.015;
const ALPHA_RESTART = 0.8;
const ALPHA_RESTART_MILD = 0.3;
const ALPHA_DRAG_TARGET = 0.3;

// Layout axis force strengths
const X_AXIS_CLASSIFIER_STRENGTH = 0.3;
const X_AXIS_CENTER_STRENGTH = 0.05;
const Y_AXIS_CLASSIFIER_STRENGTH = 0.5;
const Y_AXIS_CENTER_STRENGTH = 0.05;
// Region positioning is handled in the tick handler, not via D3 forces
// (region centroid pull strength is hardcoded in tick handler as 0.15)

// Layout positioning offsets (fraction of canvas dimension)
const X_LAYOUT_START = 0.15;
const X_LAYOUT_RANGE = 0.7;
const Y_LAYOUT_START = 0.1;
const Y_LAYOUT_RANGE = 0.8;
const INITIAL_SPREAD_FACTOR = 0.6;
const NEW_NODE_SPAWN_SPREAD = 200;

// Fit-to-view and zoom
const FIT_TO_VIEW_PADDING = 80;
const FIT_TO_VIEW_MAX_SCALE = 1.2;
const MARQUEE_ZOOM_SCALE = 0.9;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_IN_FACTOR = 1.5;
const ZOOM_OUT_FACTOR = 0.67;
const CENTER_ON_NODE_SCALE = 1.5;

// Animation durations (ms)
const FIT_TO_VIEW_DURATION = 400;
const TRANSITION_DURATION = 500;
const ZOOM_BUTTON_DURATION = 300;
const COLLAPSE_FIT_DELAY = 600;
const RESIZE_FIT_DELAY = 500;

// Canvas defaults
const DEFAULT_CANVAS_WIDTH = 800;
const DEFAULT_CANVAS_HEIGHT = 600;

// Visual: hit detection
const NODE_HIT_PADDING = 4;
const EDGE_HIT_THRESHOLD = 8;
const MARQUEE_MIN_SIZE = 10;
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

// Visual: mindmap blob wobble
const MINDMAP_BLOB_SEGMENTS = 8;
const MINDMAP_BLOB_WOBBLE = 0.12;

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

// Layout preset: flow (directed/hierarchical)
const FLOW_Y_STRENGTH = 0.8;
const FLOW_X_STRENGTH = 0.5;

// Layout preset: radial (centrality-based)
const RADIAL_POSITION_STRENGTH = 0.4;
const RADIAL_CHARGE = -350;
/* eslint-enable @typescript-eslint/no-unused-vars */

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

export function GraphCanvas({ data, onSelectNode, selectedNodeId, viewMode, revealedNodes, interactionMode, edgeSourceId, filters, theme, look, nodeTypeConfigs, collapsedNodes, onToggleCollapse, onSelectEdge, selectedEdgeKey, centerOnNode, fitToViewTrigger, zoomAction, onRegisterFitToView, onRegisterZoom, hiddenLabelTypes, communityOverlay, highlightedPath, highlightedCommunity, exploded, layoutPreset, fontScale = 1, edgeTypeConfigs, focusMode = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const transformRef = useRef(d3.zoomIdentity);
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
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const onSelectNodeRef = useRef(onSelectNode);
  const dataRef = useRef(data);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const isMarqueeRef = useRef(false);
  const canvasSizeRef = useRef({ width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT });
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const simInitializedRef = useRef(false);
  const classifiersRef = useRef<Classifier[]>([]);
  const regionColumnWidthsRef = useRef<Map<string, number>>(new Map());
  const regionColumnPositionsRef = useRef<Map<string, number>>(new Map());
  const regionColumnLeftEdgesRef = useRef<Map<string, number>>(new Map());
  const regionTargetsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
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
      const factor = isExploded ? Math.max(3, Math.ceil(Math.sqrt(nodesRef.current.length) / 3)) : 1;
      applyLayoutForces(simulation, width * factor, height * factor, newCls, isExploded, layoutPresetRef.current);
      simulation.alpha(ALPHA_RESTART).restart();
    }
  }, [data]);

  // Sync prop values to refs and trigger canvas redraw. These effects intentionally
  // omit `redraw` from deps — it reads only from refs and is stable.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => { collapsedRef.current = collapsedNodes ?? new Set(); redraw(); }, [collapsedNodes]);
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

  /** Apply all layout forces to the simulation using given virtual dimensions */
  function applyLayoutForces(simulation: d3.Simulation<SimNode, SimLink>, vw: number, vh: number, cls: Classifier[], isExploded: boolean, preset: LayoutPreset = "force") {
    const xCls = cls.find((c) => c.layout === "x");
    const yCls = cls.find((c) => c.layout === "y");

    // Pre-compute layout targets for presets when no classifier overrides
    let radialTargets: Map<string, { x: number; y: number }> | null = null;
    let flowPositions: Map<string, { x: number; y: number }> | null = null;
    if (preset === "radial" && !xCls && !yCls) {
      radialTargets = computeRadialTargets(nodesRef.current, dataRef.current.edges, vw / 2, vh / 2);
    }
    if (preset === "flow" && (!xCls || !yCls)) {
      // Build edge-directedness map from the edge data itself
      const edgeDirected = new Map<string, boolean>();
      let hasAnyDirected = false;
      for (const e of dataRef.current.edges) {
        edgeDirected.set(e.from + "→" + e.to, e.directed);
        if (e.directed) hasAnyDirected = true;
      }
      // If no edges are directed, treat all edges as directed for flow layout
      if (!hasAnyDirected) {
        for (const e of dataRef.current.edges) {
          edgeDirected.set(e.from + "→" + e.to, true);
        }
      }
      const depths = computeFlowDepths(nodesRef.current, dataRef.current.edges, edgeDirected);
      flowPositions = computeFlowPositions(nodesRef.current, dataRef.current.edges, edgeDirected, depths);
    }

    // X-axis force
    if (xCls) {
      const sorted = [...xCls.values].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
      const xPos = new Map<string, number>();
      sorted.forEach((v, i) => { xPos.set(v.id, vw * (X_LAYOUT_START + (X_LAYOUT_RANGE * i) / Math.max(sorted.length - 1, 1))); });
      simulation.force("x", d3.forceX<SimNode>((d) => {
        const val = d.classifiers?.[xCls.id];
        return val ? xPos.get(String(val)) ?? vw / 2 : vw / 2;
      }).strength(X_AXIS_CLASSIFIER_STRENGTH));
    } else if (radialTargets) {
      simulation.force("x", d3.forceX<SimNode>((d) => radialTargets!.get(d.id)?.x ?? vw / 2).strength(RADIAL_POSITION_STRENGTH));
    } else if (flowPositions) {
      simulation.force("x", d3.forceX<SimNode>((d) => flowPositions!.get(d.id)?.x ?? vw / 2).strength(FLOW_X_STRENGTH));
    } else {
      simulation.force("x", d3.forceX<SimNode>(vw / 2).strength(X_AXIS_CENTER_STRENGTH));
    }

    // Y-axis force
    if (yCls) {
      const sorted = [...yCls.values].sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
      const yPos = new Map<string, number>();
      sorted.forEach((v, i) => { yPos.set(v.id, vh * (Y_LAYOUT_START + (Y_LAYOUT_RANGE * i) / Math.max(sorted.length - 1, 1))); });
      simulation.force("y", d3.forceY<SimNode>((d) => {
        const val = d.classifiers?.[yCls.id];
        return val ? yPos.get(String(val)) ?? vh / 2 : vh / 2;
      }).strength(Y_AXIS_CLASSIFIER_STRENGTH));
    } else if (flowPositions) {
      simulation.force("y", d3.forceY<SimNode>((d) => flowPositions!.get(d.id)?.y ?? vh / 2).strength(FLOW_Y_STRENGTH));
    } else if (radialTargets) {
      simulation.force("y", d3.forceY<SimNode>((d) => radialTargets!.get(d.id)?.y ?? vh / 2).strength(RADIAL_POSITION_STRENGTH));
    } else {
      simulation.force("y", d3.forceY<SimNode>(vh / 2).strength(Y_AXIS_CENTER_STRENGTH));
    }

    // Charge and collision — stronger when exploded, weaker for radial
    const chargeStrength = isExploded ? CHARGE_STRENGTH_EXPLODED
      : (preset === "radial" && !xCls && !yCls) ? RADIAL_CHARGE
      : CHARGE_STRENGTH_NORMAL;
    const collideExtra = isExploded ? COLLISION_PADDING_EXPLODED : COLLISION_PADDING_NORMAL;
    simulation.force("charge", d3.forceManyBody().strength(chargeStrength).distanceMax(isExploded ? CHARGE_DISTANCE_MAX_EXPLODED : CHARGE_DISTANCE_MAX_NORMAL));
    const fontCollideExtra = (fontScaleRef.current - 1) * 20; // extra padding when font is scaled up
    simulation.force("collide", d3.forceCollide<SimNode>((d) => getNodeRadius(d, "full", nodeTypeConfigsRef.current) + collideExtra + Math.max(0, fontCollideExtra)));

    // Region/column positioning — computed here, applied in the tick handler.
    // NO D3 forces are used for regions; the tick handler directly sets node positions.
    const regionCls = cls.find((c) => c.layout === "region" || c.layout === "region-column");
    simulation.force("regionX", null);
    simulation.force("regionY", null);
    if (regionCls) {
      if (regionCls.layout === "region-column") {
        const counts = new Map<string, number>();
        for (const n of nodesRef.current) { const v = n.classifiers?.[regionCls.id]; if (v) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1); }
        const { positions, widths, leftEdges } = computeRegionColumns(regionCls, vw, counts);
        regionColumnPositionsRef.current = positions;
        regionColumnWidthsRef.current = widths;
        regionColumnLeftEdgesRef.current = leftEdges;
        regionTargetsRef.current = new Map();
      } else {
        const centroids = computeRegionCentroids(regionCls, vw, vh);
        regionTargetsRef.current = centroids;
        regionColumnPositionsRef.current = new Map();
        regionColumnWidthsRef.current = new Map();
        regionColumnLeftEdgesRef.current = new Map();
      }
    } else {
      regionColumnPositionsRef.current = new Map();
      regionColumnWidthsRef.current = new Map();
      regionColumnLeftEdgesRef.current = new Map();
      regionTargetsRef.current = new Map();
    }
  }

  // Explode/collapse: recalculate forces using a larger virtual canvas
  useEffect(() => {
    explodedRef.current = exploded ?? false;
    const simulation = simRef.current;
    if (!simulation || !simInitializedRef.current) return;
    const { width, height } = canvasSizeRef.current;
    const cls = classifiersRef.current;
    const isExploded = exploded ?? false;
    const factor = isExploded ? Math.max(3, Math.ceil(Math.sqrt(nodesRef.current.length) / 3)) : 1;
    const vw = width * factor;
    const vh = height * factor;
    applyLayoutForces(simulation, vw, vh, cls, isExploded, layoutPresetRef.current);
    simulation.alpha(ALPHA_RESTART).restart();
    if (!isExploded) {
      // When collapsing back, fit to view after settling
      setTimeout(() => fitToView(), COLLAPSE_FIT_DELAY);
    }
  }, [exploded]);

  // Re-apply forces when layout preset changes
  useEffect(() => {
    layoutPresetRef.current = layoutPreset ?? "force";
    const simulation = simRef.current;
    if (!simulation || !simInitializedRef.current) return;
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
    const collapsed = collapsedRef.current;
    const { hiddenByCollapse } = computeCollapseState(dataRef.current.edges, collapsed);
    const visible = ns.filter((n) => {
      if (hiddenByCollapse.has(n.id)) return false;
      if (!isNodeFilterVisible(n, currentFilters)) return false;
      return isNodePrimary(n, mode, configs) || revealed.has(n.id);
    });
    const fitNodes = visible.length > 0 ? visible : ns;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of fitNodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }
    const padding = FIT_TO_VIEW_PADDING;
    const gw = maxX - minX + padding * 2;
    const gh = maxY - minY + padding * 2;
    const { width: cw, height: ch } = canvasSizeRef.current;
    const scale = Math.min(cw / gw, ch / gh, FIT_TO_VIEW_MAX_SCALE);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const t = d3.zoomIdentity
      .translate(cw / 2, ch / 2)
      .scale(scale)
      .translate(-cx, -cy);
    if (zoomBehaviorRef.current) {
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
      const factor = isExploded ? Math.max(3, Math.ceil(Math.sqrt(nodesRef.current.length) / 3)) : 1;
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

    const spread = Math.min(width, height) * INITIAL_SPREAD_FACTOR;
    const nodes: SimNode[] = data.nodes.map((n) => ({
      ...n, x: width / 2 + (Math.random() - 0.5) * spread, y: height / 2 + (Math.random() - 0.5) * spread,
    }));
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
        const colPositions = regionColumnPositionsRef.current;
        for (const n of nodesRef.current) {
          const val = n.classifiers?.[rCls.id];
          if (val) {
            const cx = colPositions.get(String(val));
            if (cx != null) { n.x = cx; n.vx = 0; }
          }
        }
      } else if (rCls?.layout === "region") {
        // Pull nodes toward region centroids on both axes
        const targets = regionTargetsRef.current;
        const pull = 0.2;
        for (const n of nodesRef.current) {
          const val = n.classifiers?.[rCls.id];
          if (val) {
            const target = targets.get(String(val));
            if (target) {
              n.x += (target.x - n.x) * pull;
              n.y += (target.y - n.y) * pull;
              n.vx = (n.vx ?? 0) * 0.7;
              n.vy = (n.vy ?? 0) * 0.7;
            }
          }
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
        const mx = (event.offsetX - t.x) / t.k;
        const my = (event.offsetY - t.y) / t.k;
        const configs = nodeTypeConfigsRef.current;
        for (const node of nodesRef.current) {
          const r = getNodeRadius(node, viewModeRef.current, configs);
          const indicatorR = Math.max(COLLAPSE_INDICATOR_MIN_R, COLLAPSE_INDICATOR_BASE_R / t.k);
          const ix = node.x + r + indicatorR + COLLAPSE_INDICATOR_OFFSET;
          const iy = node.y - r;
          if (Math.sqrt((mx - ix) ** 2 + (my - iy) ** 2) <= indicatorR * COLLAPSE_INDICATOR_HIT_SCALE) {
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

      // Edge hover tooltip
      const tooltip = tooltipRef.current;
      if (!newHovered && tooltip) {
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

        const mw = Math.abs(m.endX - m.startX);
        const mh = Math.abs(m.endY - m.startY);
        if (mw > MARQUEE_MIN_SIZE && mh > MARQUEE_MIN_SIZE) {
          const mx = Math.min(m.startX, m.endX);
          const my = Math.min(m.startY, m.endY);
          const size = canvasSizeRef.current;
          const scale = Math.min(size.width / mw, size.height / mh) * MARQUEE_ZOOM_SCALE;
          const cx = mx + mw / 2;
          const cy = my + mh / 2;
          const newTransform = d3.zoomIdentity
            .translate(size.width / 2, size.height / 2)
            .scale(scale)
            .translate(-cx, -cy);

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
            const mx = (event.offsetX - t.x) / t.k;
            const my = (event.offsetY - t.y) / t.k;
            const configs = nodeTypeConfigsRef.current;
            const r = getNodeRadius(clickedNode as SimNode, viewModeRef.current, configs);
            const indicatorR = Math.max(COLLAPSE_INDICATOR_MIN_R, COLLAPSE_INDICATOR_BASE_R / t.k);
            const ix = clickedNode.x + r + indicatorR + COLLAPSE_INDICATOR_OFFSET;
            const iy = clickedNode.y - r;
            const dist = Math.sqrt((mx - ix) ** 2 + (my - iy) ** 2);
            if (dist <= indicatorR * COLLAPSE_INDICATOR_CLICK_SCALE) {
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
        const mx = (event.offsetX - t.x) / t.k;
        const my = (event.offsetY - t.y) / t.k;
        let hitIndicator = false;
        if (onToggleCollapseRef.current) {
          const configs = nodeTypeConfigsRef.current;
          for (const node of nodesRef.current) {
            if (!hasChildrenRef.current.has(node.id)) continue;
            const r = getNodeRadius(node, viewModeRef.current, configs);
            const indicatorR = Math.max(COLLAPSE_INDICATOR_MIN_R, COLLAPSE_INDICATOR_BASE_R / t.k);
            const ix = node.x + r + indicatorR + COLLAPSE_INDICATOR_OFFSET;
            const iy = node.y - r;
            const dist = Math.sqrt((mx - ix) ** 2 + (my - iy) ** 2);
            if (dist <= indicatorR * COLLAPSE_INDICATOR_CLICK_SCALE) {
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
        existing.generation = n.generation;
        existing.stream = n.stream;
        existing.properties = n.properties;
        existing.notes = n.notes;
      }
    }

    const { width, height } = canvasSizeRef.current;
    const addedNodes: SimNode[] = data.nodes
      .filter((n) => !existingNodeIds.has(n.id))
      .map((n) => ({
        ...n,
        x: width / 2 + (Math.random() - 0.5) * NEW_NODE_SPAWN_SPREAD,
        y: height / 2 + (Math.random() - 0.5) * NEW_NODE_SPAWN_SPREAD,
      }));

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
    const x = (canvasX - t.x) / t.k;
    const y = (canvasY - t.y) / t.k;
    const mode = viewModeRef.current;
    const revealed = revealedRef.current;
    const isAdding = interactionRef.current !== "normal";
    const configs = nodeTypeConfigsRef.current;
    const currentFilters = filtersRef.current;

    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      if (!isNodeFilterVisible(node, currentFilters)) continue;
      if (!isAdding && !isNodePrimary(node, mode, configs) && !revealed.has(node.id)) continue;
      const r = getNodeRadius(node, mode, configs);
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy < (r + NODE_HIT_PADDING) * (r + NODE_HIT_PADDING)) return node;
    }
    return null;
  }

  function findEdgeAt(canvasX: number, canvasY: number): SimLink | null {
    const t = transformRef.current;
    const x = (canvasX - t.x) / t.k;
    const y = (canvasY - t.y) / t.k;
    const threshold = EDGE_HIT_THRESHOLD / t.k;

    for (const l of linksRef.current) {
      const source = l.source as SimNode;
      const target = l.target as SimNode;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      let param = ((x - source.x) * dx + (y - source.y) * dy) / lenSq;
      param = Math.max(0, Math.min(1, param));
      const projX = source.x + param * dx;
      const projY = source.y + param * dy;
      const distSq = (x - projX) * (x - projX) + (y - projY) * (y - projY);
      if (distSq < threshold * threshold) return l;
    }
    return null;
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

    // Compute collapse state (works for all edge types, not just directed)
    const collapsed = collapsedRef.current;
    const { hasChildren, hiddenByCollapse } = computeCollapseState(currentData.edges, collapsed);
    hasChildrenRef.current = hasChildren;

    const currentFilters = filtersRef.current;
    const isVisible = (node: SimNode) => {
      if (hiddenByCollapse.has(node.id)) return false;
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
          const cachedPositions = regionColumnPositionsRef.current;
          const cachedWidths = regionColumnWidthsRef.current;
          const cachedLeftEdges = regionColumnLeftEdgesRef.current;
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
          // Circle layout: draw around members, or at target centroid if no members visible yet
          const targets = regionTargetsRef.current;
          const target = targets.get(rv.id);
          let cx: number, cy: number, radius: number;
          if (members.length > 0) {
            cx = 0; cy = 0;
            for (const m of members) { cx += m.x; cy += m.y; }
            cx /= members.length;
            cy /= members.length;
            let maxDist = 0;
            for (const m of members) {
              const dx = m.x - cx, dy = m.y - cy;
              maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dy * dy));
            }
            radius = maxDist + REGION_CIRCLE_PADDING;
          } else if (target) {
            // No visible members but we know where the region should be
            cx = target.x;
            cy = target.y;
            radius = REGION_CIRCLE_PADDING;
          } else {
            continue;
          }

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
      const isMindmap = lookRef.current === "mindmap";
      const nodeSeed = hashCode(node.id);

      if (isMindmap) {
        // Mindmap: smooth blob shapes via cubic Bézier splines
        if (shape === "rectangle" || shape === "pill") {
          const w = effectiveR * (shape === "pill" ? PILL_WIDTH_SCALE : RECT_WIDTH_SCALE);
          const h = effectiveR * (shape === "pill" ? PILL_HEIGHT_SCALE : RECT_HEIGHT_SCALE);
          const hw = w / 2, hh = h / 2;
          const ins = 0.15; // corners pulled inward for pillow effect
          drawMindmapBlob(ctx, [
            [node.x, node.y - hh],
            [node.x + hw * (1 - ins), node.y - hh * (1 - ins)],
            [node.x + hw, node.y],
            [node.x + hw * (1 - ins), node.y + hh * (1 - ins)],
            [node.x, node.y + hh],
            [node.x - hw * (1 - ins), node.y + hh * (1 - ins)],
            [node.x - hw, node.y],
            [node.x - hw * (1 - ins), node.y - hh * (1 - ins)],
          ], nodeSeed, MINDMAP_BLOB_WOBBLE);
        } else if (shape === "diamond") {
          const s = effectiveR * DIAMOND_SCALE;
          drawMindmapBlob(ctx, [
            [node.x, node.y - s],
            [node.x + s * 0.5, node.y - s * 0.5],
            [node.x + s, node.y],
            [node.x + s * 0.5, node.y + s * 0.5],
            [node.x, node.y + s],
            [node.x - s * 0.5, node.y + s * 0.5],
            [node.x - s, node.y],
            [node.x - s * 0.5, node.y - s * 0.5],
          ], nodeSeed, MINDMAP_BLOB_WOBBLE);
        } else if (shape === "hexagon") {
          const s = effectiveR * HEXAGON_SCALE;
          const pts: Array<[number, number]> = [];
          for (let i = 0; i < 12; i++) {
            const angle = (Math.PI / 6) * i - Math.PI / 6;
            const rr = (i % 2 === 0) ? s : s * 0.97;
            pts.push([node.x + rr * Math.cos(angle), node.y + rr * Math.sin(angle)]);
          }
          drawMindmapBlob(ctx, pts, nodeSeed, MINDMAP_BLOB_WOBBLE);
        } else if (shape === "triangle") {
          const s = effectiveR * TRIANGLE_SCALE;
          drawMindmapBlob(ctx, [
            [node.x, node.y - s],
            [node.x + s * 0.435, node.y - s * 0.25],
            [node.x + s * 0.87, node.y + s * 0.5],
            [node.x, node.y + s * 0.5],
            [node.x - s * 0.87, node.y + s * 0.5],
            [node.x - s * 0.435, node.y - s * 0.25],
          ], nodeSeed, MINDMAP_BLOB_WOBBLE);
        } else {
          // Circle: equidistant points → amoeba blob
          const pts: Array<[number, number]> = [];
          for (let i = 0; i < MINDMAP_BLOB_SEGMENTS; i++) {
            const angle = (Math.PI * 2 / MINDMAP_BLOB_SEGMENTS) * i;
            pts.push([node.x + effectiveR * Math.cos(angle), node.y + effectiveR * Math.sin(angle)]);
          }
          drawMindmapBlob(ctx, pts, nodeSeed, MINDMAP_BLOB_WOBBLE);
        }
      } else {
        // Formal: precise geometry
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
        ctx.fillText(node.name, node.x, baseY);

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
      const newK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, t.k * factor));
      const newT = d3.zoomIdentity
        .translate(cx - (cx - t.x) * (newK / t.k), cy - (cy - t.y) * (newK / t.k))
        .scale(newK);
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
    const newK = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, t.k * factor));
    const newT = d3.zoomIdentity
      .translate(cx - (cx - t.x) * (newK / t.k), cy - (cy - t.y) * (newK / t.k))
      .scale(newK);
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
    const t = d3.zoomIdentity
      .translate(cw / 2, ch / 2)
      .scale(CENTER_ON_NODE_SCALE)
      .translate(-node.x, -node.y);
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
