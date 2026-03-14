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

export function GraphCanvas({ data, onSelectNode, selectedNodeId, viewMode, revealedNodes, interactionMode, edgeSourceId }: Props) {
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
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const onSelectNodeRef = useRef(onSelectNode);
  const dataRef = useRef(data);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => { onSelectNodeRef.current = onSelectNode; }, [onSelectNode]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { viewModeRef.current = viewMode; redraw(); }, [viewMode]);
  useEffect(() => { revealedRef.current = revealedNodes; redraw(); }, [revealedNodes]);
  useEffect(() => { interactionRef.current = interactionMode; redraw(); }, [interactionMode]);
  useEffect(() => { edgeSourceRef.current = edgeSourceId; redraw(); }, [edgeSourceId]);
  useEffect(() => { redraw(); }, [selectedNodeId]);

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const width = parseInt(canvas.style.width);
    const height = parseInt(canvas.style.height);
    if (width && height) draw(ctx, width, height);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.parentElement?.clientWidth ?? 800;
    const height = canvas.parentElement?.clientHeight ?? 600;
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);

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
    simulation.on("tick", () => draw(ctx, width, height));

    // Zoom behavior — we'll disable it during node drags
    const zoomBehavior = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 5])
      .filter(() => {
        // Disable zoom drag when we're dragging a node
        if (dragNodeRef.current) return false;
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

      if (node) {
        // Start node drag
        dragNodeRef.current = node;
        node.fx = node.x;
        node.fy = node.y;
        simulation.alphaTarget(0.3).restart();

        // Prevent zoom from stealing this gesture
        event.stopPropagation();
        canvas.setPointerCapture(event.pointerId);
      }
    });

    canvas.addEventListener("pointermove", (event) => {
      if (dragNodeRef.current) {
        const dx = event.offsetX - pointerDownPos.x;
        const dy = event.offsetY - pointerDownPos.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) isDraggingRef.current = true;

        const t = transformRef.current;
        dragNodeRef.current.fx = (event.offsetX - t.x) / t.k;
        dragNodeRef.current.fy = (event.offsetY - t.y) / t.k;
        draw(ctx, width, height);
        return;
      }

      // Hover detection — nodes first, then edges
      const node = findNodeAt(event.offsetX, event.offsetY);
      const newHovered = node?.id ?? null;
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

      if (needsRedraw) draw(ctx, width, height);
    });

    canvas.addEventListener("pointerup", (event) => {
      if (dragNodeRef.current) {
        simulation.alphaTarget(0);

        if (!isDraggingRef.current) {
          // It was a click, not a drag — unpin and handle as click
          dragNodeRef.current.fx = null;
          dragNodeRef.current.fy = null;
          const clickedNode = pointerDownNode;
          dragNodeRef.current = null;
          canvas.releasePointerCapture(event.pointerId);

          // Fire click logic
          if (clickedNode) {
            const originalNode = dataRef.current.nodes.find((n) => n.id === clickedNode.id) ?? null;
            onSelectNodeRef.current(originalNode);
          }
        } else {
          // It was a drag — keep node pinned at new position
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

    return () => { simulation.stop(); };
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
      // When adding edges, ALL nodes are clickable regardless of view mode
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
    const threshold = 8 / t.k; // 8px in screen space

    for (const l of linksRef.current) {
      const source = l.source as SimNode;
      const target = l.target as SimNode;
      // Point-to-line-segment distance
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
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.k, t.k);

    // --- Background: Generation bands ---
    const gens = currentData.metadata.generations;
    if (gens.length > 0) {
      const allGenYs = gens.map((g) => {
        const nodesInGen = nodesRef.current.filter((n) => n.generation === g.number);
        if (nodesInGen.length === 0) return null;
        const avgY = nodesInGen.reduce((sum, n) => sum + n.y, 0) / nodesInGen.length;
        return { gen: g, avgY };
      }).filter(Boolean) as { gen: typeof gens[0]; avgY: number }[];

      // Compute band boundaries
      for (let i = 0; i < allGenYs.length; i++) {
        const cur = allGenYs[i];
        const prev = allGenYs[i - 1];
        const next = allGenYs[i + 1];
        const top = prev ? (prev.avgY + cur.avgY) / 2 : cur.avgY - 80;
        const bottom = next ? (cur.avgY + next.avgY) / 2 : cur.avgY + 80;
        // Very subtle band background
        ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)";
        // Use a wide range to cover visible area
        ctx.fillRect(-2000, top, 6000, bottom - top);
        // Generation label on the left
        ctx.save();
        ctx.font = "11px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.textAlign = "left";
        const label = cur.gen.label ? `Gen ${cur.gen.number}: ${cur.gen.label}` : `Gen ${cur.gen.number}`;
        const periodText = cur.gen.period ?? "";
        ctx.fillText(label, -1900, cur.avgY - 4);
        if (periodText) {
          ctx.font = "9px -apple-system, sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillText(periodText, -1900, cur.avgY + 10);
        }
        ctx.restore();
      }
    }

    // --- Background: Stream column headers ---
    const streams = currentData.metadata.streams;
    if (streams.length > 0) {
      const streamCenters = new Map<string, number>();
      for (const s of streams) {
        const streamNodes = nodesRef.current.filter((n) => n.stream === s.id);
        if (streamNodes.length === 0) continue;
        const avgX = streamNodes.reduce((sum, n) => sum + n.x, 0) / streamNodes.length;
        streamCenters.set(s.id, avgX);
      }
      // Find top of visible nodes
      const minY = nodesRef.current.length > 0
        ? Math.min(...nodesRef.current.map((n) => n.y)) - 60
        : 0;

      ctx.save();
      for (const s of streams) {
        const cx = streamCenters.get(s.id);
        if (cx == null) continue;
        ctx.font = "bold 12px -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = s.color ? s.color + "55" : "rgba(255,255,255,0.15)";
        ctx.fillText(s.name, cx, minY);
      }
      ctx.restore();
    }

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

    // When in add-edge mode, show ALL nodes (full network) so user can pick any node
    const isVisible = (node: SimNode) => {
      if (isAdding) return true;
      return isNodePrimary(node, mode) || revealed.has(node.id);
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
        ctx.globalAlpha = isHighlighted ? 0.8 : isRevealed ? 0.4 : 0.15;
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
        ctx.globalAlpha = isEdgeHovered ? 0.9 : (isHighlighted ? 0.8 : 0.15);
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
        ctx.globalAlpha = 0.9;
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

      ctx.globalAlpha = isHighlighted ? (isRevealed ? 0.7 : 1) : 0.25;

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

      // Labels — font size proportional to zoom (clamped)
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
        ctx.fillStyle = isHighlighted ? (isRevealed ? "#aaa" : "#ddd") : "#666";
        ctx.fillText(node.name, node.x, baseY);

        if (showInst) {
          ctx.font = `${instFS}px -apple-system, sans-serif`;
          ctx.fillStyle = isHighlighted ? "#999" : "#555";
          ctx.fillText(instText, node.x, baseY + instFS + 2);
        }
      }

      ctx.globalAlpha = 1;
    });

    ctx.restore();
  }

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <canvas ref={canvasRef} />
      <div
        ref={tooltipRef}
        className="edge-tooltip"
        style={{ display: "none" }}
      />
    </div>
  );
}
