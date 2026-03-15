import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { GraphIR, GraphNode, GraphEdge, SimNode, SimLink, NodeTypeConfig } from "../types/graph-ir";
import type { ViewMode, InteractionMode } from "../App";
import type { ThemeConfig } from "../theme/themes";
import { getNodeTypeConfig, getConfigNodeRadius } from "../migration";
import { computeCollapseState } from "./collapse-utils";

interface Props {
  data: GraphIR;
  onSelectNode: (node: GraphNode | null) => void;
  selectedNodeId: string | null;
  viewMode: ViewMode;
  revealedNodes: Set<string>;
  interactionMode: InteractionMode;
  edgeSourceId: string | null;
  activeStreams: Set<string> | null;
  theme: ThemeConfig;
  nodeTypeConfigs: NodeTypeConfig[];
  collapsedNodes?: Set<string>;
  onToggleCollapse?: (nodeId: string) => void;
  onSelectEdge?: (edge: GraphEdge | null, pos?: { x: number; y: number }) => void;
  selectedEdgeKey?: string | null; // "from|to" key for highlighting
}

const EDGE_LABELS: Record<string, string> = {
  teacher_pupil: "Teacher \u2192 Pupil", chain: "Chain", rivalry: "Rivalry", alliance: "Alliance",
  synthesis: "Synthesis", institutional: "Institutional", originates: "Originates", develops: "Develops",
  contests: "Contests", applies: "Applies", extends: "Extends", opposes: "Opposes",
  subsumes: "Subsumes", enables: "Enables", reframes: "Reframes",
};

function getNodeRadius(node: SimNode, viewMode: ViewMode, nodeTypeConfigs: NodeTypeConfig[]): number {
  const config = getNodeTypeConfig(nodeTypeConfigs, node.node_type);
  if (config) {
    return getConfigNodeRadius(config, node.properties, viewMode);
  }
  // Legacy fallback
  if (node.node_type === "concept") return 8;
  return 10;
}

function getStreamColor(node: SimNode, streams: GraphIR["metadata"]["streams"], overrides?: Record<string, string>): string {
  if (overrides && node.stream && overrides[node.stream]) return overrides[node.stream];
  return streams.find((s) => s.id === node.stream)?.color ?? "#666";
}

function isNodePrimary(node: SimNode, viewMode: ViewMode, nodeTypeConfigs: NodeTypeConfig[]): boolean {
  if (viewMode === "full") return true;
  // Legacy compat
  if (viewMode === "people") {
    const config = getNodeTypeConfig(nodeTypeConfigs, node.node_type);
    return config ? config.shape === "circle" : node.node_type !== "concept";
  }
  if (viewMode === "concepts") {
    const config = getNodeTypeConfig(nodeTypeConfigs, node.node_type);
    return config ? config.shape === "rectangle" : node.node_type === "concept";
  }
  // Dynamic: viewMode is a node type id — show only nodes of that type
  return node.node_type === viewMode;
}

function getNodeShape(node: SimNode, nodeTypeConfigs: NodeTypeConfig[]): "circle" | "rectangle" {
  const config = getNodeTypeConfig(nodeTypeConfigs, node.node_type);
  if (config) return config.shape;
  return node.node_type === "concept" ? "rectangle" : "circle";
}

export function GraphCanvas({ data, onSelectNode, selectedNodeId, viewMode, revealedNodes, interactionMode, edgeSourceId, activeStreams, theme, nodeTypeConfigs, collapsedNodes, onToggleCollapse, onSelectEdge, selectedEdgeKey }: Props) {
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
  const activeStreamsRef = useRef(activeStreams);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const onSelectNodeRef = useRef(onSelectNode);
  const dataRef = useRef(data);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const isMarqueeRef = useRef(false);
  const canvasSizeRef = useRef({ width: 800, height: 600 });
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const simInitializedRef = useRef(false);
  const streamIdsRef = useRef<string[]>([]);
  const gensRef = useRef<number[]>([]);
  const themeRef = useRef(theme);
  const nodeTypeConfigsRef = useRef(nodeTypeConfigs);
  const collapsedRef = useRef(collapsedNodes ?? new Set<string>());
  const onToggleCollapseRef = useRef(onToggleCollapse);
  const onSelectEdgeRef = useRef(onSelectEdge);

  useEffect(() => { onSelectNodeRef.current = onSelectNode; }, [onSelectNode]);
  useEffect(() => { onSelectEdgeRef.current = onSelectEdge; }, [onSelectEdge]);
  useEffect(() => { onToggleCollapseRef.current = onToggleCollapse; }, [onToggleCollapse]);
  useEffect(() => { collapsedRef.current = collapsedNodes ?? new Set(); redraw(); }, [collapsedNodes]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { themeRef.current = theme; redraw(); }, [theme]);
  useEffect(() => { viewModeRef.current = viewMode; redraw(); }, [viewMode]);
  useEffect(() => { revealedRef.current = revealedNodes; redraw(); }, [revealedNodes]);
  useEffect(() => { interactionRef.current = interactionMode; redraw(); }, [interactionMode]);
  useEffect(() => { edgeSourceRef.current = edgeSourceId; redraw(); }, [edgeSourceId]);
  useEffect(() => { activeStreamsRef.current = activeStreams; redraw(); }, [activeStreams]);
  useEffect(() => { redraw(); }, [selectedNodeId]);
  useEffect(() => { nodeTypeConfigsRef.current = nodeTypeConfigs; redraw(); }, [nodeTypeConfigs]);
  useEffect(() => { redraw(); }, [selectedEdgeKey]);

  function redraw() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { width, height } = canvasSizeRef.current;
    if (width && height) draw(ctx, width, height);
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
      const sIds = streamIdsRef.current;
      const gs = gensRef.current;

      simulation.force("x", d3.forceX<SimNode>((d) => {
        const idx = sIds.indexOf(d.stream ?? "");
        if (idx >= 0) return width * (0.15 + (0.7 * idx) / Math.max(sIds.length - 1, 1));
        return width / 2;
      }).strength(0.3));

      simulation.force("y", d3.forceY<SimNode>((d) => {
        const idx = gs.indexOf(d.generation ?? 0);
        if (idx >= 0) return height * (0.1 + (0.8 * idx) / Math.max(gs.length - 1, 1));
        return height / 2;
      }).strength(0.5));

      simulation.alpha(0.3).restart();
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
  }, []);

  // Initial simulation setup (once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();
    const { width, height } = canvasSizeRef.current;

    const spread = Math.min(width, height) * 0.6;
    const nodes: SimNode[] = data.nodes.map((n) => ({
      ...n, x: width / 2 + (Math.random() - 0.5) * spread, y: height / 2 + (Math.random() - 0.5) * spread,
    }));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = data.edges
      .filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to))
      .map((e) => ({ source: e.from, target: e.to, edge: e }));

    nodesRef.current = nodes;
    linksRef.current = links;

    const streamIds = [...new Set(data.nodes.map((n) => n.stream).filter(Boolean))] as string[];
    streamIdsRef.current = streamIds;
    const streamX = new Map<string, number>();
    streamIds.forEach((s, i) => { streamX.set(s, width * (0.15 + (0.7 * i) / Math.max(streamIds.length - 1, 1))); });

    const gens = ([...new Set(data.nodes.map((n) => n.generation).filter((g) => g != null))] as number[]).sort((a, b) => a - b);
    gensRef.current = gens;
    const genY = new Map<number, number>();
    gens.forEach((g, i) => { genY.set(g, height * (0.1 + (0.8 * i) / Math.max(gens.length - 1, 1))); });

    const configs = nodeTypeConfigsRef.current;
    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(80).strength(0.3))
      .force("charge", d3.forceManyBody().strength(-300).distanceMax(500))
      .force("x", d3.forceX<SimNode>((d) => streamX.get(d.stream ?? "") ?? width / 2).strength(0.3))
      .force("y", d3.forceY<SimNode>((d) => genY.get(d.generation ?? 0) ?? height / 2).strength(0.5))
      .force("collide", d3.forceCollide<SimNode>((d) => getNodeRadius(d, "full", configs) + 6))
      .alphaDecay(0.02);

    simRef.current = simulation;
    simInitializedRef.current = true;
    simulation.on("tick", () => {
      const c = ctxRef.current;
      const { width: w, height: h } = canvasSizeRef.current;
      if (c) draw(c, w, h);
    });

    // Fit graph to viewport after simulation settles
    simulation.on("end", () => {
      if (nodes.length === 0) return;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of nodes) {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      }
      const padding = 60;
      const gw = maxX - minX + padding * 2;
      const gh = maxY - minY + padding * 2;
      const { width: cw, height: ch } = canvasSizeRef.current;
      const scale = Math.min(cw / gw, ch / gh, 1.5);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const fitTransform = d3.zoomIdentity
        .translate(cw / 2, ch / 2)
        .scale(scale)
        .translate(-cx, -cy);
      if (zoomBehaviorRef.current && canvas) {
        d3.select(canvas)
          .transition()
          .duration(400)
          .call(zoomBehaviorRef.current.transform, fitTransform);
      }
    });

    // Zoom behavior
    const zoomBehavior = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 5])
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
        dragNodeRef.current = node;
        node.fx = node.x;
        node.fy = node.y;
        simulation.alphaTarget(0.3).restart();
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
        if (Math.abs(dx) + Math.abs(dy) > 3) isDraggingRef.current = true;

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
          const indicatorR = Math.max(5, 3 / t.k);
          const ix = node.x + r + indicatorR + 2;
          const iy = node.y - r;
          if (Math.sqrt((mx - ix) ** 2 + (my - iy) ** 2) <= indicatorR * 2.5) {
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
          const label = EDGE_LABELS[edgeHit.edge.edge_type] ?? edgeHit.edge.edge_type;
          const noteText = edgeHit.edge.note ? `\n${edgeHit.edge.note}` : "";
          tooltip.textContent = `${label}${noteText}`;
          tooltip.style.display = "block";
          tooltip.style.left = `${event.offsetX + 12}px`;
          tooltip.style.top = `${event.offsetY - 8}px`;
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
        if (mw > 10 && mh > 10) {
          const mx = Math.min(m.startX, m.endX);
          const my = Math.min(m.startY, m.endY);
          const size = canvasSizeRef.current;
          const scale = Math.min(size.width / mw, size.height / mh) * 0.9;
          const cx = mx + mw / 2;
          const cy = my + mh / 2;
          const newTransform = d3.zoomIdentity
            .translate(size.width / 2, size.height / 2)
            .scale(scale)
            .translate(-cx, -cy);

          if (zoomBehaviorRef.current) {
            d3.select(canvas)
              .transition()
              .duration(500)
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

          if (clickedNode) {
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
            const r = getNodeRadius(node, viewModeRef.current, configs);
            const indicatorR = Math.max(5, 3 / t.k);
            const ix = node.x + r + indicatorR + 2;
            const iy = node.y - r;
            const dist = Math.sqrt((mx - ix) ** 2 + (my - iy) ** 2);
            if (dist <= indicatorR * 2.5) {
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
  }, []);

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
        existing.thinker_fields = n.thinker_fields;
        existing.concept_fields = n.concept_fields;
        existing.properties = n.properties;
        existing.content = n.content;
        existing.notes = n.notes;
      }
    }

    const { width, height } = canvasSizeRef.current;
    const addedNodes: SimNode[] = data.nodes
      .filter((n) => !existingNodeIds.has(n.id))
      .map((n) => ({
        ...n,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200,
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
      simulation.alpha(0.3).restart();
    } else {
      redraw();
    }
  }, [data]);

  function findNodeAt(canvasX: number, canvasY: number): SimNode | null {
    const t = transformRef.current;
    const x = (canvasX - t.x) / t.k;
    const y = (canvasY - t.y) / t.k;
    const mode = viewModeRef.current;
    const revealed = revealedRef.current;
    const isAdding = interactionRef.current !== "normal";
    const configs = nodeTypeConfigsRef.current;

    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      if (!isAdding && !isNodePrimary(node, mode, configs) && !revealed.has(node.id)) continue;
      const r = getNodeRadius(node, mode, configs);
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy < (r + 4) * (r + 4)) return node;
    }
    return null;
  }

  function findEdgeAt(canvasX: number, canvasY: number): SimLink | null {
    const t = transformRef.current;
    const x = (canvasX - t.x) / t.k;
    const y = (canvasY - t.y) / t.k;
    const threshold = 8 / t.k;

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
    const streams = activeStreamsRef.current;
    const th = themeRef.current;
    const configs = nodeTypeConfigsRef.current;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    const hovered = hoveredRef.current;
    const selected = selectedNodeId;
    const connectedToHighlight = new Set<string>();

    if (hovered || selected) {
      const focusId = hovered || selected;
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

    const isVisible = (node: SimNode) => {
      if (hiddenByCollapse.has(node.id)) return false;
      if (isAdding) return true;
      return isNodePrimary(node, mode, configs) || revealed.has(node.id);
    };

    const isStreamActive = (node: SimNode) => {
      if (!streams) return true;
      return node.stream ? streams.has(node.stream) : false;
    };

    // Draw edges
    linksRef.current.forEach((l) => {
      const source = l.source as SimNode;
      const target = l.target as SimNode;
      if (!isVisible(source) || !isVisible(target)) return;

      const visual = l.edge.visual;
      const isHighlighted = connectedToHighlight.size === 0 || (connectedToHighlight.has(source.id) && connectedToHighlight.has(target.id));
      const isRevealed = !isAdding && (revealed.has(source.id) || revealed.has(target.id));
      const isEdgeHovered = hoveredEdge === l;
      const isEdgeSelected = selectedEdgeKey === `${source.id}|${target.id}` || selectedEdgeKey === `${target.id}|${source.id}`;
      const edgeStreamDimmed = !isStreamActive(source) && !isStreamActive(target);

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      if (visual.style === "dashed") ctx.setLineDash([6, 4]);
      else if (visual.style === "dotted") ctx.setLineDash([2, 4]);
      else ctx.setLineDash([]);

      // Weight scales line thickness: weight 1.0 = normal, 2.0 = double, etc.
      const weightScale = Math.max(0.3, Math.min(4, l.edge.weight ?? 1));

      if (isEdgeHovered || isEdgeSelected) {
        ctx.strokeStyle = th.canvasEdgeHover;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2.5 * weightScale;
      } else {
        const edgeColor = th.edgeColorOverrides[l.edge.edge_type] ?? visual.color;
        ctx.strokeStyle = edgeColor ?? (isHighlighted ? th.canvasEdgeDefault : th.canvasEdgeDim);
        let alpha = isHighlighted ? 0.8 : isRevealed ? 0.4 : 0.15;
        if (edgeStreamDimmed) alpha = 0.08;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = (isHighlighted ? 1.5 : 0.8) * weightScale;
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Arrowhead
      if (visual.show_arrow) {
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const r = getNodeRadius(target, mode, configs) + 4;
        const tipX = target.x - Math.cos(angle) * r;
        const tipY = target.y - Math.sin(angle) * r;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - 8 * Math.cos(angle - 0.4), tipY - 8 * Math.sin(angle - 0.4));
        ctx.lineTo(tipX - 8 * Math.cos(angle + 0.4), tipY - 8 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = isEdgeHovered ? th.canvasEdgeHover : (th.edgeColorOverrides[l.edge.edge_type] ?? visual.color ?? th.canvasEdgeDefault);
        let arrowAlpha = isEdgeHovered ? 0.9 : (isHighlighted ? 0.8 : 0.15);
        if (edgeStreamDimmed) arrowAlpha = 0.08;
        ctx.globalAlpha = arrowAlpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Edge label
      const showInFilteredView = (mode === "people" || mode === "concepts") && !isAdding && t.k > 0.8;
      const showForHighlighted = isHighlighted && t.k > 0.6;

      if (showInFilteredView || showForHighlighted) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const label = EDGE_LABELS[l.edge.edge_type] ?? l.edge.edge_type;

        ctx.save();
        ctx.translate(midX, midY);
        let angle = Math.atan2(target.y - source.y, target.x - source.x);
        if (angle > Math.PI / 2) angle -= Math.PI;
        if (angle < -Math.PI / 2) angle += Math.PI;
        ctx.rotate(angle);

        ctx.font = "9px -apple-system, sans-serif";
        ctx.textAlign = "center";
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = th.canvasLabelBg;
        ctx.fillRect(-tw / 2 - 3, -5, tw + 6, 11);
        ctx.fillStyle = th.edgeColorOverrides[l.edge.edge_type] ?? visual.color ?? th.canvasEdgeDefault;
        ctx.globalAlpha = edgeStreamDimmed ? 0.15 : 0.9;
        ctx.fillText(label, 0, 3);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    });

    // Draw nodes
    nodesRef.current.forEach((node) => {
      if (!isVisible(node)) return;

      const r = getNodeRadius(node, mode, configs);
      const color = getStreamColor(node, currentData.metadata.streams, th.streamColorOverrides);
      const isPrimary = isAdding || isNodePrimary(node, mode, configs);
      const isRevealed = !isPrimary && revealed.has(node.id);
      const isHighlighted = connectedToHighlight.size === 0 || connectedToHighlight.has(node.id);
      const isSelected = node.id === selected;
      const isHovered = node.id === hovered;
      const isEdgeSource = node.id === edgeSrc;
      const streamActive = isStreamActive(node);

      let alpha = isHighlighted ? (isRevealed ? 0.7 : 1) : 0.25;
      if (!streamActive) alpha = 0.15;
      ctx.globalAlpha = alpha;

      const effectiveR = isRevealed ? r * 0.7 : r;
      const shape = getNodeShape(node, configs);

      if (shape === "rectangle") {
        const w = effectiveR * 2.5;
        const h = effectiveR * 1.6;
        ctx.beginPath();
        ctx.roundRect(node.x - w / 2, node.y - h / 2, w, h, 4);
        ctx.fillStyle = color;
        ctx.fill();
        if (isSelected || isHovered || isEdgeSource) {
          ctx.strokeStyle = isEdgeSource ? th.canvasEdgeSourceStroke : th.canvasSelectionStroke;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (!isAdding && mode === "concepts" && node.properties?.status === "contested") {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = th.canvasLabelDim;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, effectiveR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        if (isSelected || isHovered || isEdgeSource) {
          ctx.strokeStyle = isEdgeSource ? th.canvasEdgeSourceStroke : th.canvasSelectionStroke;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Notes indicator
      if (node.notes && t.k > 0.5) {
        ctx.fillStyle = th.canvasNotesIndicator;
        ctx.beginPath();
        ctx.arc(node.x + effectiveR + 2, node.y - effectiveR - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Labels
      const sizeFieldValue = node.properties?.[configs.find((c) => c.id === node.node_type)?.size_field ?? ""];
      const isDominant = sizeFieldValue === "dominant";
      if (t.k > 0.4 || isDominant) {
        const fontSize = Math.max(8, Math.min(16, 11 * Math.sqrt(t.k)));
        ctx.font = `${fontSize}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        const baseY = node.y + effectiveR + fontSize + 2;

        const tagsValue = node.properties?.tags;
        const showTags = mode === "people" && !isAdding && tagsValue && t.k > 0.7;
        const tagsText = showTags ? String(tagsValue) : "";
        const tagsFS = fontSize - 2;

        const nameW = ctx.measureText(node.name).width;
        let bgW = nameW + 6;
        let bgH = fontSize + 2;
        if (showTags) {
          ctx.font = `${tagsFS}px -apple-system, sans-serif`;
          bgW = Math.max(bgW, ctx.measureText(tagsText).width + 6);
          bgH += tagsFS + 2;
          ctx.font = `${fontSize}px -apple-system, sans-serif`;
        }

        ctx.fillStyle = th.canvasLabelBg;
        ctx.fillRect(node.x - bgW / 2, baseY - fontSize + 1, bgW, bgH);
        let labelColor = isHighlighted ? (isRevealed ? th.canvasLabelDim : th.canvasLabelHighlight) : th.canvasLabelDim;
        if (!streamActive) labelColor = th.canvasLabelDim;
        ctx.fillStyle = labelColor;
        ctx.fillText(node.name, node.x, baseY);

        if (showTags) {
          ctx.font = `${tagsFS}px -apple-system, sans-serif`;
          ctx.fillStyle = isHighlighted ? th.canvasLabelDim : th.canvasLabelDim;
          ctx.fillText(tagsText, node.x, baseY + tagsFS + 2);
        }
      }

      // Draw +/- collapse indicator for nodes with directed children
      if (hasChildren.has(node.id) && t.k > 0.4) {
        const isCollapsed = collapsed.has(node.id);
        const indicatorR = Math.max(5, 3 / t.k);
        const ix = node.x + effectiveR + indicatorR + 2;
        const iy = node.y - effectiveR;
        ctx.beginPath();
        ctx.arc(ix, iy, indicatorR, 0, Math.PI * 2);
        ctx.fillStyle = th.bgPanel;
        ctx.fill();
        ctx.strokeStyle = th.textMuted;
        ctx.lineWidth = 1 / t.k;
        ctx.stroke();
        ctx.font = `bold ${indicatorR * 1.4}px -apple-system, sans-serif`;
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
      ctx.lineWidth = 1.5 / t.k;
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
