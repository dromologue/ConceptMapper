import { useEffect, useState, useCallback } from "react";
import type { GraphIR, GraphNode, GraphEdge } from "./types/graph-ir";
import { GraphCanvas } from "./graph/GraphCanvas";
import { NodeDetail } from "./ui/NodeDetail";
import { Toolbar } from "./ui/Toolbar";
import { AddNodeModal } from "./ui/AddNodeModal";
import { AddEdgeModal } from "./ui/AddEdgeModal";
import "./App.css";

export type ViewMode = "full" | "people" | "concepts";
export type InteractionMode = "normal" | "add-edge-source" | "add-edge-target";

function App() {
  const [graphData, setGraphData] = useState<GraphIR | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const [error, setError] = useState<string | null>(null);
  // Revealed nodes: in People/Concept view, clicking a node reveals its connected hidden nodes
  const [revealedNodes, setRevealedNodes] = useState<Set<string>>(new Set());
  // Add node/edge modals
  const [showAddThinker, setShowAddThinker] = useState(false);
  const [showAddConcept, setShowAddConcept] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("normal");
  const [edgeSource, setEdgeSource] = useState<string | null>(null);
  const [edgeTarget, setEdgeTarget] = useState<string | null>(null);
  const [showAddEdgeModal, setShowAddEdgeModal] = useState(false);

  useEffect(() => {
    fetch("/graph.json")
      .then((res) => res.json())
      .then((data: GraphIR) => setGraphData(data))
      .catch((err) => setError(err.message));
  }, []);

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

      // In filtered views, reveal connected hidden nodes when clicking
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

  const handleNotesChange = useCallback(
    (nodeId: string, notes: string) => {
      if (!graphData) return;
      setGraphData({
        ...graphData,
        nodes: graphData.nodes.map((n) =>
          n.id === nodeId ? { ...n, notes: notes || undefined } : n
        ),
      });
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, notes: notes || undefined } : prev
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
        // Reveal this node if in filtered view
        setRevealedNodes((prev) => new Set(prev).add(nodeId));
      }
    },
    [graphData]
  );

  const handleAddThinker = useCallback(
    (name: string, stream: string, eminence: string, generation: number) => {
      if (!graphData) return;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const newNode: GraphNode = {
        id,
        node_type: "thinker",
        name,
        generation,
        stream,
        thinker_fields: {
          eminence,
          structural_roles: [],
          key_concept_ids: [],
          is_placeholder: false,
        },
      };
      setGraphData({ ...graphData, nodes: [...graphData.nodes, newNode] });
      setShowAddThinker(false);
      setSelectedNode(newNode);
    },
    [graphData]
  );

  const handleAddConcept = useCallback(
    (name: string, stream: string, conceptType: string, abstractionLevel: string, generation: number) => {
      if (!graphData) return;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const newNode: GraphNode = {
        id,
        node_type: "concept",
        name,
        generation,
        stream,
        concept_fields: {
          originator_id: "unknown_author",
          concept_type: conceptType,
          abstraction_level: abstractionLevel,
          status: "active",
        },
      };
      setGraphData({ ...graphData, nodes: [...graphData.nodes, newNode] });
      setShowAddConcept(false);
      setSelectedNode(newNode);
    },
    [graphData]
  );

  const handleAddEdge = useCallback(
    (edgeType: string) => {
      if (!graphData || !edgeSource || !edgeTarget) return;
      const fromNode = graphData.nodes.find((n) => n.id === edgeSource);
      const toNode = graphData.nodes.find((n) => n.id === edgeTarget);
      if (!fromNode || !toNode) return;

      const edgeCategory =
        fromNode.node_type === "thinker" && toNode.node_type === "thinker"
          ? "thinker_thinker"
          : fromNode.node_type === "concept" && toNode.node_type === "concept"
          ? "concept_concept"
          : "thinker_concept";

      const directed = !["rivalry", "alliance", "institutional", "opposes"].includes(edgeType);
      const visual = getEdgeVisual(edgeType);

      const newEdge: GraphEdge = {
        from: edgeSource,
        to: edgeTarget,
        edge_type: edgeType,
        edge_category: edgeCategory as GraphEdge["edge_category"],
        directed,
        weight: 1.0,
        visual,
      };

      setGraphData({ ...graphData, edges: [...graphData.edges, newEdge] });
      setShowAddEdgeModal(false);
      setEdgeSource(null);
      setEdgeTarget(null);
    },
    [graphData, edgeSource, edgeTarget]
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

  const handleDownloadImage = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    const title = graphData?.metadata.title?.replace(/\s+/g, "-") || "concept-map";
    const date = new Date().toISOString().split("T")[0];
    link.download = `${title}-${date}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [graphData]);

  const handleDownloadFile = useCallback(() => {
    if (!graphData) return;
    const md = exportToMarkdown(graphData);
    const blob = new Blob([md], { type: "text/markdown" });
    const link = document.createElement("a");
    const title = graphData.metadata.title?.replace(/\s+/g, "-") || "concept-map";
    const date = new Date().toISOString().split("T")[0];
    link.download = `${title}-${date}.md`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }, [graphData]);

  if (error) return <div className="error">Failed to load graph: {error}</div>;
  if (!graphData) return <div className="loading">Loading graph...</div>;

  return (
    <div className="app">
      <header className="app-header">
        <h1>{graphData.metadata.title || "Concept Map"}</h1>
        <span className="stats">
          {graphData.nodes.length} nodes &middot; {graphData.edges.length} edges
        </span>
      </header>
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onDownloadImage={handleDownloadImage}
        onDownloadFile={handleDownloadFile}
        onAddThinker={() => setShowAddThinker(true)}
        onAddConcept={() => setShowAddConcept(true)}
        onAddEdge={handleStartAddEdge}
        interactionMode={interactionMode}
        onCancelAddEdge={handleCancelAddEdge}
      />
      <div className="app-body">
        <GraphCanvas
          data={graphData}
          onSelectNode={handleSelectNode}
          selectedNodeId={selectedNode?.id ?? null}
          viewMode={viewMode}
          revealedNodes={revealedNodes}
          interactionMode={interactionMode}
          edgeSourceId={edgeSource}
        />
        {selectedNode && (
          <NodeDetail
            node={selectedNode}
            edges={graphData.edges.filter(
              (e) => e.from === selectedNode.id || e.to === selectedNode.id
            )}
            nodes={graphData.nodes}
            streams={graphData.metadata.streams}
            onClose={() => setSelectedNode(null)}
            onNotesChange={handleNotesChange}
            onNavigateToNode={handleNavigateToNode}
          />
        )}
      </div>
      <div className="legend">
        {graphData.metadata.streams.map((s) => (
          <span key={s.id} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: s.color || "#999" }} />
            {s.name}
          </span>
        ))}
      </div>

      {showAddThinker && (
        <AddNodeModal
          type="thinker"
          streams={graphData.metadata.streams}
          generations={graphData.metadata.generations}
          onAdd={handleAddThinker}
          onCancel={() => setShowAddThinker(false)}
        />
      )}
      {showAddConcept && (
        <AddNodeModal
          type="concept"
          streams={graphData.metadata.streams}
          generations={graphData.metadata.generations}
          onAddConcept={handleAddConcept}
          onCancel={() => setShowAddConcept(false)}
        />
      )}
      {showAddEdgeModal && edgeSource && edgeTarget && (
        <AddEdgeModal
          sourceNode={graphData.nodes.find((n) => n.id === edgeSource)!}
          targetNode={graphData.nodes.find((n) => n.id === edgeTarget)!}
          onAdd={handleAddEdge}
          onCancel={handleCancelAddEdge}
        />
      )}
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

function exportToMarkdown(data: GraphIR): string {
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

  const thinkers = data.nodes.filter((n) => n.node_type === "thinker" && !n.thinker_fields?.is_placeholder);
  if (thinkers.length > 0) {
    lines.push("## Thinker Nodes\n");
    for (const t of thinkers) {
      lines.push("```");
      lines.push(`id:               ${t.id}`);
      lines.push(`name:             ${t.name}`);
      if (t.thinker_fields?.dates) lines.push(`dates:            ${t.thinker_fields.dates}`);
      if (t.thinker_fields?.eminence) lines.push(`eminence:         ${t.thinker_fields.eminence}`);
      if (t.generation != null) lines.push(`generation:       ${t.generation}`);
      if (t.stream) lines.push(`stream:           ${t.stream}`);
      if (t.thinker_fields?.structural_roles.length) lines.push(`structural_role:  ${t.thinker_fields.structural_roles.join(", ")}`);
      if (t.thinker_fields?.active_period) lines.push(`active_period:    ${t.thinker_fields.active_period}`);
      if (t.thinker_fields?.key_concept_ids.length) lines.push(`key_concept_ids:  [${t.thinker_fields.key_concept_ids.join(", ")}]`);
      if (t.thinker_fields?.institutional_base) lines.push(`institutional_base: ${t.thinker_fields.institutional_base}`);
      if (t.notes) lines.push(`notes:            ${t.notes}`);
      lines.push("```\n");
    }
  }

  const concepts = data.nodes.filter((n) => n.node_type === "concept");
  if (concepts.length > 0) {
    lines.push("## Concept Nodes\n");
    for (const c of concepts) {
      lines.push("```");
      lines.push(`id:               ${c.id}`);
      lines.push(`name:             ${c.name}`);
      if (c.concept_fields?.originator_id && c.concept_fields.originator_id !== "unknown_author")
        lines.push(`originator_id:    ${c.concept_fields.originator_id}`);
      if (c.concept_fields?.date_introduced) lines.push(`date_introduced:  ${c.concept_fields.date_introduced}`);
      if (c.concept_fields?.concept_type) lines.push(`concept_type:     ${c.concept_fields.concept_type}`);
      if (c.concept_fields?.abstraction_level) lines.push(`abstraction_level: ${c.concept_fields.abstraction_level}`);
      if (c.concept_fields?.status) lines.push(`status:           ${c.concept_fields.status}`);
      if (c.generation != null) lines.push(`generation:       ${c.generation}`);
      if (c.stream) lines.push(`stream:           ${c.stream}`);
      if (c.notes) lines.push(`notes:            ${c.notes}`);
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
        if (e.weight < 1.0) lines.push(`  weight: ${e.weight}`);
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

export default App;
