import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { GraphIR, GraphNode, SimNode, SimLink } from "../types/graph-ir";
import type { ViewMode } from "../App";

interface Props {
  data: GraphIR;
  onSelectNode: (node: GraphNode | null) => void;
  selectedNodeId: string | null;
  viewMode: ViewMode;
}

const EMINENCE_RADIUS: Record<string, number> = {
  dominant: 20,
  major: 14,
  secondary: 10,
  minor: 6,
};

const ABSTRACTION_RADIUS: Record<string, number> = {
  "meta-theoretical": 16,
  theoretical: 13,
  operational: 10,
  concrete: 7,
};

const EDGE_LABELS: Record<string, string> = {
  teacher_pupil: "Teacher \u2192 Pupil",
  chain: "Chain",
  rivalry: "Rivalry",
  alliance: "Alliance",
  synthesis: "Synthesis",
  institutional: "Institutional",
  originates: "Originates",
  develops: "Develops",
  contests: "Contests",
  applies: "Applies",
  extends: "Extends",
  opposes: "Opposes",
  subsumes: "Subsumes",
  enables: "Enables",
  reframes: "Reframes",
};

function getNodeRadius(node: SimNode, viewMode: ViewMode): number {
  if (node.node_type === "concept") {
    if (viewMode === "concepts") {
      return ABSTRACTION_RADIUS[node.concept_fields?.abstraction_level ?? "operational"] ?? 10;
    }
    return 8;
  }
  return EMINENCE_RADIUS[node.thinker_fields?.eminence ?? "minor"] ?? 8;
}

function getStreamColor(node: SimNode, streams: GraphIR["metadata"]["streams"]): string {
  const stream = streams.find((s) => s.id === node.stream);
  return stream?.color ?? "#666";
}

function isNodeVisible(node: SimNode, viewMode: ViewMode): boolean {
  if (viewMode === "full") return true;
  if (viewMode === "people") return node.node_type === "thinker";
  if (viewMode === "concepts") return node.node_type === "concept";
  return true;
}

function isEdgeVisible(edge: SimLink, viewMode: ViewMode): boolean {
  if (viewMode === "full") return true;
  if (viewMode === "people") return edge.edge.edge_category === "thinker_thinker";
  if (viewMode === "concepts") return edge.edge.edge_category === "concept_concept";
  return true;
}

export function GraphCanvas({ data, onSelectNode, selectedNodeId, viewMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const transformRef = useRef(d3.zoomIdentity);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const dragRef = useRef<SimNode | null>(null);
  const viewModeRef = useRef<ViewMode>(viewMode);

  // Keep viewMode ref in sync
  useEffect(() => {
    viewModeRef.current = viewMode;
    // Redraw on mode change
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d")!;
      const width = parseInt(canvas.style.width);
      const height = parseInt(canvas.style.height);
      draw(ctx, width, height);
    }
  }, [viewMode, selectedNodeId]);

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
      ...n,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
    }));

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const links: SimLink[] = data.edges
      .filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to))
      .map((e) => ({ source: e.from, target: e.to, edge: e }));

    nodesRef.current = nodes;
    linksRef.current = links;

    const streamIds = [...new Set(data.nodes.map((n) => n.stream).filter(Boolean))];
    const streamX = new Map<string, number>();
    streamIds.forEach((s, i) => {
      streamX.set(s!, width * (0.15 + (0.7 * i) / Math.max(streamIds.length - 1, 1)));
    });

    const gens = [...new Set(data.nodes.map((n) => n.generation).filter((g) => g != null))].sort(
      (a, b) => a! - b!
    );
    const genY = new Map<number, number>();
    gens.forEach((g, i) => {
      genY.set(g!, height * (0.1 + (0.8 * i) / Math.max(gens.length - 1, 1)));
    });

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(80).strength(0.3)
      )
      .force("charge", d3.forceManyBody().strength(-200).distanceMax(300))
      .force("x", d3.forceX<SimNode>((d) => streamX.get(d.stream ?? "") ?? width / 2).strength(0.3))
      .force("y", d3.forceY<SimNode>((d) => genY.get(d.generation ?? 0) ?? height / 2).strength(0.5))
      .force("collide", d3.forceCollide<SimNode>((d) => getNodeRadius(d, "full") + 6))
      .alphaDecay(0.02);

    simRef.current = simulation;
    simulation.on("tick", () => draw(ctx, width, height));

    const zoomBehavior = d3
      .zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        draw(ctx, width, height);
      });

    const d3Canvas = d3.select(canvas);
    d3Canvas.call(zoomBehavior);

    canvas.addEventListener("click", (event) => {
      const node = findNodeAt(event.offsetX, event.offsetY);
      onSelectNode(node ? data.nodes.find((n) => n.id === node.id) ?? null : null);
    });

    canvas.addEventListener("mousemove", (event) => {
      const node = findNodeAt(event.offsetX, event.offsetY);
      const newHovered = node?.id ?? null;
      if (newHovered !== hoveredRef.current) {
        hoveredRef.current = newHovered;
        canvas.style.cursor = newHovered ? "pointer" : "grab";
        draw(ctx, width, height);
      }
    });

    canvas.addEventListener("mousedown", (event) => {
      const node = findNodeAt(event.offsetX, event.offsetY);
      if (node) {
        dragRef.current = node;
        node.fx = node.x;
        node.fy = node.y;
        simulation.alphaTarget(0.3).restart();
      }
    });

    const moveHandler = (event: MouseEvent) => {
      if (dragRef.current) {
        const t = transformRef.current;
        dragRef.current.fx = (event.offsetX - t.x) / t.k;
        dragRef.current.fy = (event.offsetY - t.y) / t.k;
        draw(ctx, width, height);
      }
    };
    canvas.addEventListener("mousemove", moveHandler);

    canvas.addEventListener("mouseup", () => {
      if (dragRef.current) {
        simulation.alphaTarget(0);
        dragRef.current.fx = null;
        dragRef.current.fy = null;
        dragRef.current = null;
      }
    });

    return () => {
      simulation.stop();
    };
  }, [data]);

  function findNodeAt(canvasX: number, canvasY: number): SimNode | null {
    const t = transformRef.current;
    const x = (canvasX - t.x) / t.k;
    const y = (canvasY - t.y) / t.k;
    const mode = viewModeRef.current;

    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const node = nodesRef.current[i];
      if (!isNodeVisible(node, mode)) continue;
      const r = getNodeRadius(node, mode);
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy < (r + 4) * (r + 4)) return node;
    }
    return null;
  }

  function draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const t = transformRef.current;
    const mode = viewModeRef.current;
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
        if (!isEdgeVisible(l, mode)) return;
        const src = typeof l.source === "string" ? l.source : l.source.id;
        const tgt = typeof l.target === "string" ? l.target : l.target.id;
        if (src === focusId || tgt === focusId) {
          connectedToHighlight.add(src);
          connectedToHighlight.add(tgt);
        }
      });
    }

    // Draw edges
    linksRef.current.forEach((l) => {
      if (!isEdgeVisible(l, mode)) return;
      const source = l.source as SimNode;
      const target = l.target as SimNode;
      if (!isNodeVisible(source, mode) || !isNodeVisible(target, mode)) return;

      const visual = l.edge.visual;
      const isHighlighted =
        connectedToHighlight.size === 0 ||
        (connectedToHighlight.has(source.id) && connectedToHighlight.has(target.id));

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      if (visual.style === "dashed") ctx.setLineDash([6, 4]);
      else if (visual.style === "dotted") ctx.setLineDash([2, 4]);
      else ctx.setLineDash([]);

      ctx.strokeStyle = visual.color ?? (isHighlighted ? "#555" : "#333");
      ctx.globalAlpha = isHighlighted ? 0.8 : 0.15;
      ctx.lineWidth = isHighlighted ? 1.5 : 0.8;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Arrowhead
      if (visual.show_arrow) {
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const r = getNodeRadius(target, mode) + 4;
        const tipX = target.x - Math.cos(angle) * r;
        const tipY = target.y - Math.sin(angle) * r;
        const arrowLen = 8;

        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX - arrowLen * Math.cos(angle - 0.4), tipY - arrowLen * Math.sin(angle - 0.4));
        ctx.lineTo(tipX - arrowLen * Math.cos(angle + 0.4), tipY - arrowLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = visual.color ?? "#555";
        ctx.globalAlpha = isHighlighted ? 0.8 : 0.15;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Edge label
      const showAllLabels = (mode === "people" || mode === "concepts") && t.k > 0.8;
      const showHighlightedLabels = isHighlighted && t.k > 0.6;
      const showAtZoom = t.k > 1.5 && isHighlighted;

      if (showAllLabels || showHighlightedLabels || showAtZoom) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const label = EDGE_LABELS[l.edge.edge_type] ?? l.edge.edge_type;
        const fontSize = 9;

        ctx.save();
        ctx.translate(midX, midY);

        // Rotate to follow edge, but keep text readable (not upside down)
        let angle = Math.atan2(target.y - source.y, target.x - source.x);
        if (angle > Math.PI / 2) angle -= Math.PI;
        if (angle < -Math.PI / 2) angle += Math.PI;
        ctx.rotate(angle);

        ctx.font = `${fontSize}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = "rgba(26, 26, 46, 0.9)";
        ctx.fillRect(-textWidth / 2 - 3, -fontSize / 2 - 1, textWidth + 6, fontSize + 2);

        ctx.fillStyle = visual.color ?? "#888";
        ctx.globalAlpha = 0.9;
        ctx.fillText(label, 0, fontSize / 2 - 1);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    });

    // Draw nodes
    nodesRef.current.forEach((node) => {
      if (!isNodeVisible(node, mode)) return;
      const r = getNodeRadius(node, mode);
      const color = getStreamColor(node, data.metadata.streams);
      const isHighlighted =
        connectedToHighlight.size === 0 || connectedToHighlight.has(node.id);
      const isSelected = node.id === selected;
      const isHovered = node.id === hovered;

      ctx.globalAlpha = isHighlighted ? 1 : 0.25;

      // Concept status visual (in concept view)
      let strokeDash: number[] = [];
      if (mode === "concepts" && node.concept_fields) {
        if (node.concept_fields.status === "contested") strokeDash = [3, 3];
        if (node.concept_fields.status === "superseded") ctx.globalAlpha *= 0.5;
      }

      if (node.node_type === "concept") {
        const w = r * 2.5;
        const h = r * 1.6;
        ctx.beginPath();
        ctx.roundRect(node.x - w / 2, node.y - h / 2, w, h, 4);
        ctx.fillStyle = color;
        ctx.fill();
        if (isSelected || isHovered) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.setLineDash(strokeDash);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (strokeDash.length > 0) {
          ctx.strokeStyle = "#aaa";
          ctx.lineWidth = 1;
          ctx.setLineDash(strokeDash);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (node.thinker_fields?.is_placeholder) {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = "#888";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (isSelected || isHovered) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Labels
      if (t.k > 0.4 || node.thinker_fields?.eminence === "dominant") {
        const fontSize = Math.max(10, Math.min(13, 12 / t.k));
        ctx.font = `${fontSize}px -apple-system, sans-serif`;
        ctx.textAlign = "center";
        const baseY =
          node.node_type === "concept" ? node.y + (r * 1.6) / 2 + fontSize + 2 : node.y + r + fontSize + 2;

        // Name label
        const textWidth = ctx.measureText(node.name).width;
        const showInstitution = mode === "people" && node.thinker_fields?.institutional_base && t.k > 0.7;
        const instText = showInstitution ? node.thinker_fields!.institutional_base! : "";
        const instFontSize = fontSize - 2;

        // Background
        let bgHeight = fontSize + 2;
        let bgWidth = textWidth + 6;
        if (showInstitution) {
          ctx.font = `${instFontSize}px -apple-system, sans-serif`;
          const instWidth = ctx.measureText(instText).width;
          bgWidth = Math.max(bgWidth, instWidth + 6);
          bgHeight += instFontSize + 2;
          ctx.font = `${fontSize}px -apple-system, sans-serif`;
        }

        ctx.fillStyle = "rgba(26, 26, 46, 0.85)";
        ctx.fillRect(node.x - bgWidth / 2, baseY - fontSize + 1, bgWidth, bgHeight);

        ctx.fillStyle = isHighlighted ? "#ddd" : "#666";
        ctx.fillText(node.name, node.x, baseY);

        // Institution sub-label
        if (showInstitution) {
          ctx.font = `${instFontSize}px -apple-system, sans-serif`;
          ctx.fillStyle = isHighlighted ? "#999" : "#555";
          ctx.fillText(instText, node.x, baseY + instFontSize + 2);
        }
      }

      ctx.globalAlpha = 1;
    });

    ctx.restore();
  }

  return <canvas ref={canvasRef} />;
}
