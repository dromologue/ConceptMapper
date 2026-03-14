import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { GraphIR, GraphNode, SimNode, SimLink } from "../types/graph-ir";
import type { ViewMode, InteractionMode } from "../App";

interface Props {
  data: GraphIR;
  onSelectNode: (node: GraphNode | null) => void;
  selectedNodeId: string | null;
  viewMode: ViewMode;
  revealedNodes: Set<string>;
  interactionMode: InteractionMode;
  edgeSourceId: string | null;
  activeStreams: Set<string> | null;
}

const EMINENCE_RADIUS: Record<string, number> = { dominant: 20, major: 14, secondary: 10, minor: 6 };
const ABSTRACTION_RADIUS: Record<string, number> = { "meta-theoretical": 16, theoretical: 13, operational: 10, concrete: 7 };
const EDGE_LABELS: Record<string, string> = {
  teacher_pupil: "Teacher \u2192 Pupil", chain: "Chain", rivalry: "Rivalry", alliance: "Alliance",
  synthesis: "Synthesis", institutional: "Institutional", originates: "Originates", develops: "Develops",
  contests: "Contests", applies: "Applies", extends: "Extends", opposes: "Opposes",
  subsumes: "Subsumes", enables: "Enables", reframes: "Reframes",
};

function getNodeRadius(node: SimNode, viewMode: ViewMode): number {
  if (node.node_type === "concept") {
    if (viewMode === "concepts") return ABSTRACTION_RADIUS[node.concept_fields?.abstraction_level ?? "operational"] ?? 10;
    return 8;
  }
  return EMINENCE_RADIUS[node.thinker_fields?.eminence ?? "minor"] ?? 8;
}

function getStreamColor(node: SimNode, streams: GraphIR["metadata"]["streams"]): string {
  return streams.find((s) => s.id === node.stream)?.color ?? "#666";
}

function isNodePrimary(node: SimNode, viewMode: ViewMode): boolean {
  if (viewMode === "full") return true;
  if (viewMode === "people") return node.node_type === "thinker";
  if (viewMode === "concepts") return node.node_type === "concept";
  return true;
}

export function GraphCanvas({ data, onSelectNode, selectedNodeId, viewMode, revealedNodes, interactionMode, edgeSourceId, activeStreams }: Props) {
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
  // Track whether simulation has been initialized
  const simInitializedRef = useRef(false);

  useEffect(() => { onSelectNodeRef.current = onSelectNode; }, [onSelectNode]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { viewModeRef.current = viewMode; redraw(); }, [viewMode]);
  useEffect(() => { revealedRef.current = revealedNodes; redraw(); }, [revealedNodes]);
  useEffect(() => { interactionRef.current = interactionMode; redraw(); }, [interactionMode]);
  useEffect(() => { edgeSourceRef.current = edgeSourceId; redraw(); }, [edgeSourceId]);
  useEffect(() => { activeStreamsRef.current = activeStreams; redraw(); }, [activeStreams]);
  useEffect(() => { redraw(); }, [selectedNodeId]);

  function redraw() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const { width, height } = canvasSizeRef.current;
    if (width && height) draw(ctx, width, height);
  }

  // Resize canvas to fit container
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
    redraw();
  }

  // ResizeObserver to watch container size
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
    const ctx = ctxRef.current!;

    const nodes: SimNode[] = data.nodes.map((n) => ({
      ...n, x: width / 2 + (Math.random() - 0.5) * 200, y: height / 2 + (Math.random() - 0.5) * 200,
    }));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = data.edges
      .filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to))
      .map((e) => ({ source: e.from, target: e.to, edge: e }));

    nodesRef.current = nodes;
    linksRef.current = links;

    const streamIds = [...new Set(data.nodes.map((n) => n.stream).filter(Boolean))];
    const streamX = new Map<string, number>();
    streamIds.forEach((s, i) => { streamX.set(s!, width * (0.15 + (0.7 * i) / Math.max(streamIds.length - 1, 1))); });

    const gens = [...new Set(data.nodes.map((n) => n.generation).filter((g) => g != null))].sort((a, b) => a! - b!);
    const genY = new Map<number, number>();
    gens.forEach((g, i) => { genY.set(g!, height * (0.1 + (0.8 * i) / Math.max(gens.length - 1, 1))); });

    const simulation = d3.forceSimulation<SimNode>(nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(80).strength(0.3))
      .force("charge", d3.forceManyBody().strength(-200).distanceMax(300))
      .force("x", d3.forceX<SimNode>((d) => streamX.get(d.stream ?? "") ?? width / 2).strength(0.3))
      .force("y", d3.forceY<SimNode>((d) => genY.get(d.generation ?? 0) ?? height / 2).strength(0.5))
      .force("collide", d3.forceCollide<SimNode>((d) => getNodeRadius(d, "full") + 6))
      .alphaDecay(0.02);

    simRef.current = simulation;
    simInitializedRef.current = true;
    simulation.on("tick", () => draw(ctx, width, height));

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
        draw(ctx, width, height);
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

      // Shift+drag on empty space = marquee zoom
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
      // Marquee zoom drag
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

      if (newHovered !== hoveredRef.current) {
        hoveredRef.current = newHovered;
        const isEdgeMode = interactionRef.current !== "normal";
        canvas.style.cursor = isEdgeMode ? "crosshair" : newHovered ? "pointer" : "grab";
        needsRedraw = true;
      }

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
      // Marquee zoom complete
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

      // Click on empty canvas
      if (!isDraggingRef.current && !pointerDownNode) {
        onSelectNodeRef.current(null);
      }
      pointerDownNode = null;
    });

    return () => { simulation.stop(); simInitializedRef.current = false; };
  }, []);

  // Refactor: update simulation in-place when data changes (after initial setup)
  useEffect(() => {
    if (!simInitializedRef.current) return;
    const simulation = simRef.current;
    if (!simulation) return;

    const existingMap = new Map(nodesRef.current.map((n) => [n.id, n]));
    const newNodeIds = new Set(data.nodes.map((n) => n.id));
    const existingNodeIds = new Set(nodesRef.current.map((n) => n.id));

    // Update existing nodes in place (preserve positions)
    for (const n of data.nodes) {
      const existing = existingMap.get(n.id);
      if (existing) {
        // Update data fields but keep position
        existing.name = n.name;
        existing.node_type = n.node_type;
        existing.generation = n.generation;
        existing.stream = n.stream;
        existing.thinker_fields = n.thinker_fields;
        existing.concept_fields = n.concept_fields;
        existing.content = n.content;
        existing.notes = n.notes;
      }
    }

    // Add new nodes
    const { width, height } = canvasSizeRef.current;
    const addedNodes: SimNode[] = data.nodes
      .filter((n) => !existingNodeIds.has(n.id))
      .map((n) => ({
        ...n,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200,
      }));

    // Remove deleted nodes
    const updatedNodes = nodesRef.current.filter((n) => newNodeIds.has(n.id)).concat(addedNodes);
    nodesRef.current = updatedNodes;

    // Rebuild links
    const nodeMap = new Map(updatedNodes.map((n) => [n.id, n]));
    const newLinks: SimLink[] = data.edges
      .filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to))
      .map((e) => ({ source: e.from, target: e.to, edge: e }));
    linksRef.current = newLinks;

    // Update simulation
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

    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      if (!isAdding && !isNodePrimary(node, mode) && !revealed.has(node.id)) continue;
      const r = getNodeRadius(node, mode);
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

    const isVisible = (node: SimNode) => {
      if (isAdding) return true;
      return isNodePrimary(node, mode) || revealed.has(node.id);
    };

    // Check if node is in an active stream
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
      const edgeStreamDimmed = !isStreamActive(source) && !isStreamActive(target);

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      if (visual.style === "dashed") ctx.setLineDash([6, 4]);
      else if (visual.style === "dotted") ctx.setLineDash([2, 4]);
      else ctx.setLineDash([]);

      if (isEdgeHovered) {
        ctx.strokeStyle = "#fff";
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2.5;
      } else {
        ctx.strokeStyle = visual.color ?? (isHighlighted ? "#555" : "#333");
        let alpha = isHighlighted ? 0.8 : isRevealed ? 0.4 : 0.15;
        if (edgeStreamDimmed) alpha = 0.08;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = isHighlighted ? 1.5 : 0.8;
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Arrowhead
      if (visual.show_arrow) {
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const r = getNodeRadius(target, mode) + 4;
        const tipX = target.x - Math.cos(angle) * r;
        const tipY = target.y - Math.sin(angle) * r;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - 8 * Math.cos(angle - 0.4), tipY - 8 * Math.sin(angle - 0.4));
        ctx.lineTo(tipX - 8 * Math.cos(angle + 0.4), tipY - 8 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = isEdgeHovered ? "#fff" : (visual.color ?? "#555");
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
        ctx.fillStyle = "rgba(26, 26, 46, 0.9)";
        ctx.fillRect(-tw / 2 - 3, -5, tw + 6, 11);
        ctx.fillStyle = visual.color ?? "#999";
        ctx.globalAlpha = edgeStreamDimmed ? 0.15 : 0.9;
        ctx.fillText(label, 0, 3);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    });

    // Draw nodes
    nodesRef.current.forEach((node) => {
      if (!isVisible(node)) return;

      const r = getNodeRadius(node, mode);
      const color = getStreamColor(node, currentData.metadata.streams);
      const isPrimary = isAdding || isNodePrimary(node, mode);
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

      if (node.node_type === "concept") {
        const w = effectiveR * 2.5;
        const h = effectiveR * 1.6;
        ctx.beginPath();
        ctx.roundRect(node.x - w / 2, node.y - h / 2, w, h, 4);
        ctx.fillStyle = color;
        ctx.fill();
        if (isSelected || isHovered || isEdgeSource) {
          ctx.strokeStyle = isEdgeSource ? "#4AD94A" : "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (!isAdding && mode === "concepts" && node.concept_fields?.status === "contested") {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "#aaa";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, effectiveR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        if (node.thinker_fields?.is_placeholder) {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "#888";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (isSelected || isHovered || isEdgeSource) {
          ctx.strokeStyle = isEdgeSource ? "#4AD94A" : "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Notes indicator
      if (node.notes && t.k > 0.5) {
        ctx.fillStyle = "#f8c88a";
        ctx.beginPath();
        ctx.arc(node.x + effectiveR + 2, node.y - effectiveR - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Labels
      if (t.k > 0.4 || node.thinker_fields?.eminence === "dominant") {
        const fontSize = Math.max(8, Math.min(16, 11 * Math.sqrt(t.k)));
        ctx.font = `${fontSize}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        const baseY = node.y + effectiveR + fontSize + 2;

        const showInst = mode === "people" && !isAdding && node.thinker_fields?.institutional_base && t.k > 0.7;
        const instText = showInst ? node.thinker_fields!.institutional_base! : "";
        const instFS = fontSize - 2;

        const nameW = ctx.measureText(node.name).width;
        let bgW = nameW + 6;
        let bgH = fontSize + 2;
        if (showInst) {
          ctx.font = `${instFS}px -apple-system, sans-serif`;
          bgW = Math.max(bgW, ctx.measureText(instText).width + 6);
          bgH += instFS + 2;
          ctx.font = `${fontSize}px -apple-system, sans-serif`;
        }

        ctx.fillStyle = "rgba(26, 26, 46, 0.85)";
        ctx.fillRect(node.x - bgW / 2, baseY - fontSize + 1, bgW, bgH);
        let labelAlpha = isHighlighted ? (isRevealed ? "#aaa" : "#ddd") : "#666";
        if (!streamActive) labelAlpha = "#444";
        ctx.fillStyle = labelAlpha;
        ctx.fillText(node.name, node.x, baseY);

        if (showInst) {
          ctx.font = `${instFS}px -apple-system, sans-serif`;
          ctx.fillStyle = isHighlighted ? "#999" : "#555";
          ctx.fillText(instText, node.x, baseY + instFS + 2);
        }
      }

      ctx.globalAlpha = 1;
    });

    // Draw marquee rectangle if active
    if (isMarqueeRef.current && marqueeRef.current) {
      const m = marqueeRef.current;
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "#4A90D9";
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
