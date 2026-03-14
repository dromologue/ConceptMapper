import { useEffect, useState, useCallback } from "react";
import type { GraphIR, GraphNode } from "./types/graph-ir";
import { GraphCanvas } from "./graph/GraphCanvas";
import { NodeDetail } from "./ui/NodeDetail";
import { Toolbar } from "./ui/Toolbar";
import "./App.css";

export type ViewMode = "full" | "people" | "concepts";

function App() {
  const [graphData, setGraphData] = useState<GraphIR | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/graph.json")
      .then((res) => res.json())
      .then((data: GraphIR) => setGraphData(data))
      .catch((err) => setError(err.message));
  }, []);

  const handleNotesChange = useCallback(
    (nodeId: string, notes: string) => {
      if (!graphData) return;
      setGraphData({
        ...graphData,
        nodes: graphData.nodes.map((n) =>
          n.id === nodeId ? { ...n, notes: notes || undefined } : n
        ),
      });
      // Update selected node if it's the one being edited
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, notes: notes || undefined } : prev
      );
    },
    [graphData]
  );

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
      />
      <div className="app-body">
        <GraphCanvas
          data={graphData}
          onSelectNode={setSelectedNode}
          selectedNodeId={selectedNode?.id ?? null}
          viewMode={viewMode}
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
          />
        )}
      </div>
      <div className="legend">
        {graphData.metadata.streams.map((s) => (
          <span key={s.id} className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: s.color || "#999" }}
            />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function exportToMarkdown(data: GraphIR): string {
  const lines: string[] = [];
  const title = data.metadata.title || "Concept Map";
  lines.push(`# ${title}\n`);
  lines.push(`<!-- Exported from concept-mapper, ${new Date().toISOString().split("T")[0]}. Edits not synced to source. -->\n`);

  // Generations
  if (data.metadata.generations.length > 0) {
    lines.push("## Generations\n");
    lines.push("| Gen | Period | Label | Attention Space Count |");
    lines.push("|-----|--------|-------|-----------------------|");
    for (const g of data.metadata.generations) {
      lines.push(`| ${g.number} | ${g.period ?? ""} | ${g.label ?? ""} | ${g.attention_space_count ?? ""} |`);
    }
    lines.push("");
  }

  // Streams
  if (data.metadata.streams.length > 0) {
    lines.push("## Streams\n");
    lines.push("| Stream ID | Name | Colour | Description |");
    lines.push("|-----------|------|--------|-------------|");
    for (const s of data.metadata.streams) {
      lines.push(`| ${s.id} | ${s.name} | ${s.color ?? ""} | ${s.description ?? ""} |`);
    }
    lines.push("");
  }

  // Thinker Nodes
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

  // Concept Nodes
  const concepts = data.nodes.filter((n) => n.node_type === "concept");
  if (concepts.length > 0) {
    lines.push("## Concept Nodes\n");
    for (const c of concepts) {
      lines.push("```");
      lines.push(`id:               ${c.id}`);
      lines.push(`name:             ${c.name}`);
      if (c.concept_fields?.originator_id && c.concept_fields.originator_id !== "unknown_author") {
        lines.push(`originator_id:    ${c.concept_fields.originator_id}`);
      }
      if (c.concept_fields?.date_introduced) lines.push(`date_introduced:  ${c.concept_fields.date_introduced}`);
      if (c.concept_fields?.concept_type) lines.push(`concept_type:     ${c.concept_fields.concept_type}`);
      if (c.concept_fields?.abstraction_level) lines.push(`abstraction_level: ${c.concept_fields.abstraction_level}`);
      if (c.concept_fields?.status) lines.push(`status:           ${c.concept_fields.status}`);
      if (c.generation != null) lines.push(`generation:       ${c.generation}`);
      if (c.stream) lines.push(`stream:           ${c.stream}`);
      if (c.concept_fields?.parent_concept_id) lines.push(`parent_concept_id: ${c.concept_fields.parent_concept_id}`);
      if (c.notes) lines.push(`notes:            ${c.notes}`);
      lines.push("```\n");
    }
  }

  // Edges
  const tt = data.edges.filter((e) => e.edge_category === "thinker_thinker");
  const tc = data.edges.filter((e) => e.edge_category === "thinker_concept");
  const cc = data.edges.filter((e) => e.edge_category === "concept_concept");

  if (data.edges.length > 0) {
    lines.push("## Edges\n");

    if (tt.length > 0) {
      lines.push("### Thinker-to-Thinker\n");
      lines.push("```");
      for (const e of tt) {
        lines.push(`from: ${e.from.padEnd(12)} to: ${e.to.padEnd(12)} type: ${e.edge_type}`);
        if (e.note) lines.push(`  note: ${e.note}`);
        if (e.weight < 1.0) lines.push(`  weight: ${e.weight}`);
        lines.push("");
      }
      lines.push("```\n");
    }

    if (tc.length > 0) {
      lines.push("### Thinker-to-Concept\n");
      lines.push("```");
      for (const e of tc) {
        lines.push(`from: ${e.from.padEnd(12)} to: ${e.to.padEnd(20)} type: ${e.edge_type}`);
        if (e.note) lines.push(`  note: ${e.note}`);
        if (e.weight < 1.0) lines.push(`  weight: ${e.weight}`);
        lines.push("");
      }
      lines.push("```\n");
    }

    if (cc.length > 0) {
      lines.push("### Concept-to-Concept\n");
      lines.push("```");
      for (const e of cc) {
        lines.push(`from: ${e.from.padEnd(20)} to: ${e.to.padEnd(20)} type: ${e.edge_type}`);
        if (e.note) lines.push(`  note: ${e.note}`);
        if (e.weight < 1.0) lines.push(`  weight: ${e.weight}`);
        lines.push("");
      }
      lines.push("```\n");
    }
  }

  // External Shocks
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

  // Structural Observations
  if (data.metadata.structural_observations.length > 0) {
    lines.push("## Structural Observations\n");
    for (const o of data.metadata.structural_observations) {
      lines.push(`- ${o}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export default App;
