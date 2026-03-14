import { useEffect, useState, useCallback, useRef } from "react";
import type { GraphIR, GraphNode, GraphEdge } from "./types/graph-ir";
import { GraphCanvas } from "./graph/GraphCanvas";
import { DetailPanel } from "./ui/DetailPanel";
import { NotesPane } from "./ui/NotesPane";
import { Toolbar } from "./ui/Toolbar";
import { AddNodeModal } from "./ui/AddNodeModal";
import { AddEdgeModal } from "./ui/AddEdgeModal";
import { initParser, parseMarkdown, parseJsonFile } from "./parser";
import "./App.css";

export type ViewMode = "full" | "people" | "concepts";
export type InteractionMode = "normal" | "add-edge-source" | "add-edge-target";

function mergeNodeUpdate(node: GraphNode, updates: Partial<GraphNode>): GraphNode {
  const merged = { ...node, ...updates };
  if (updates.thinker_fields && node.thinker_fields) {
    merged.thinker_fields = { ...node.thinker_fields, ...updates.thinker_fields };
  }
  if (updates.concept_fields && node.concept_fields) {
    merged.concept_fields = { ...node.concept_fields, ...updates.concept_fields };
  }
  return merged;
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detailWidth, setDetailWidth] = useState(320);
  const [notesWidth, setNotesWidth] = useState(420);
  const [notesOpen, setNotesOpen] = useState(false);
  const [activeStreams, setActiveStreams] = useState<Set<string> | null>(null);

  const [parserReady, setParserReady] = useState(false);

  // Initialize WASM parser on startup
  useEffect(() => {
    initParser()
      .then(() => setParserReady(true))
      .catch((err) => setError(`Failed to load parser: ${err.message}`));
  }, []);

  // Load file content — called from Swift bridge or internal file input
  const loadFileContent = useCallback(
    (content: string, filename: string) => {
      try {
        let data: GraphIR;
        if (filename.endsWith(".json")) {
          data = parseJsonFile(content);
        } else {
          const result = parseMarkdown(content);
          data = result.graph;
          if (result.warnings.length > 0) {
            console.warn(
              "Parse warnings:",
              result.warnings.map((w) => `line ${w.line}: ${w.message}`)
            );
          }
        }
        if (data.nodes.length === 0) {
          setError(
            `No nodes found in "${filename}". ` +
            "This file may not be in Collins taxonomy format. " +
            "Expected fenced code blocks with id/name/eminence fields."
          );
          return;
        }
        setGraphData(data);
        setSelectedNode(null);
        setRevealedNodes(new Set());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    []
  );

  // Expose bridge functions for Swift WKWebView
  useEffect(() => {
    const win = window as unknown as Record<string, unknown>;

    // Swift → JS: load file content (Base64 encoded to avoid escaping issues)
    win.loadFileContentBase64 = (base64: string, filename: string) => {
      try {
        const content = atob(base64);
        // Decode UTF-8 from the binary string
        const bytes = Uint8Array.from(content, (c) => c.charCodeAt(0));
        const decoded = new TextDecoder().decode(bytes);
        loadFileContent(decoded, filename);
      } catch (err) {
        console.error("Bridge decode error:", err);
      }
    };

    // Swift → JS: get current graph as JSON (for Save)
    win.getGraphJSON = (): string => {
      if (!graphData) return "";
      return JSON.stringify(graphData, null, 2);
    };

    // Swift → JS: get current graph as markdown (for Export Markdown)
    win.getGraphMarkdown = (): string => {
      if (!graphData) return "";
      return exportToMarkdown(graphData);
    };

    // Swift → JS: get canvas data URL (for Export Image)
    win.getCanvasImage = (): string => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return "";
      return canvas.toDataURL("image/png");
    };

    return () => {
      delete win.loadFileContentBase64;
      delete win.getGraphJSON;
      delete win.getGraphMarkdown;
      delete win.getCanvasImage;
    };
  }, [loadFileContent, graphData]);

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

  // Check if running inside a WKWebView (macOS app)
  const isNativeApp = !!(window as unknown as Record<string, unknown>).webkit;

  const sendToSwift = useCallback((handler: string, payload?: unknown) => {
    const webkit = (window as unknown as Record<string, unknown>).webkit as
      | { messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }> }
      | undefined;
    webkit?.messageHandlers?.[handler]?.postMessage(payload ?? {});
  }, []);

  const handleImportFile = useCallback(() => {
    if (isNativeApp) {
      sendToSwift("openFile");
    } else {
      fileInputRef.current?.click();
    }
  }, [isNativeApp, sendToSwift]);

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
      // Reset the input so the same file can be re-imported
      e.target.value = "";
    },
    [loadFileContent]
  );

  // Close notes when node deselected
  const handleCloseNode = useCallback(() => {
    setSelectedNode(null);
    setNotesOpen(false);
  }, []);

  // Resizer drag handler — generic for either pane
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

  // Stream toggle for legend filtering
  const handleStreamToggle = (streamId: string) => {
    setActiveStreams((prev) => {
      if (!prev) {
        // First click: show only this stream
        return new Set([streamId]);
      }
      const next = new Set(prev);
      if (next.has(streamId)) {
        next.delete(streamId);
        if (next.size === 0) return null; // all cleared = show all
      } else {
        next.add(streamId);
      }
      return next;
    });
  };

  // Search results
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
      // Reveal node in filtered view
      if (viewMode !== "full") {
        setRevealedNodes((prev) => new Set(prev).add(node.id));
      }
    },
    [viewMode]
  );

  const handleDownloadImage = useCallback(() => {
    if (isNativeApp) {
      sendToSwift("exportImage");
    } else {
      const canvas = document.querySelector("canvas");
      if (!canvas) return;
      const link = document.createElement("a");
      const title = graphData?.metadata.title?.replace(/\s+/g, "-") || "concept-map";
      const date = new Date().toISOString().split("T")[0];
      link.download = `${title}-${date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  }, [graphData, isNativeApp, sendToSwift]);

  const handleDownloadFile = useCallback(() => {
    if (isNativeApp) {
      sendToSwift("exportMarkdown");
    } else {
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
    }
  }, [graphData, isNativeApp, sendToSwift]);

  if (error) return <div className="error">Failed to load graph: {error}</div>;
  if (!parserReady) return <div className="loading">Loading parser...</div>;
  if (!graphData) return <div className="loading">Open a .md or .json file to begin.</div>;

  return (
    <div className="app">
      <header className="app-header">
        <h1>{graphData.metadata.title || "Concept Map"}</h1>
        <div className="search-container">
          <input
            className="search-input"
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
          />
          {searchFocused && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((n) => (
                <div key={n.id} className="search-result" onMouseDown={() => handleSearchSelect(n)}>
                  <span
                    className={`type-indicator ${n.node_type === "concept" ? "concept" : ""}`}
                    style={{
                      backgroundColor:
                        graphData.metadata.streams.find((s) => s.id === n.stream)?.color ?? "#666",
                    }}
                  />
                  {n.name}
                </div>
              ))}
            </div>
          )}
        </div>
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
        onImportFile={handleImportFile}
      />
      <div className="app-body">
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
          />
        </div>
        {selectedNode && (
          <>
            <div className="pane-resizer" onMouseDown={makeResizeHandler(setDetailWidth, detailWidth)} />
            <DetailPanel
              node={selectedNode}
              edges={graphData.edges.filter(
                (e) => e.from === selectedNode.id || e.to === selectedNode.id
              )}
              nodes={graphData.nodes}
              streams={graphData.metadata.streams}
              generations={graphData.metadata.generations}
              onClose={handleCloseNode}
              onNodeUpdate={handleNodeUpdate}
              onNavigateToNode={handleNavigateToNode}
              onOpenNotes={() => setNotesOpen(!notesOpen)}
              notesOpen={notesOpen}
              style={{ width: detailWidth }}
            />
          </>
        )}
        {selectedNode && notesOpen && (
          <>
            <div className="pane-resizer" onMouseDown={makeResizeHandler(setNotesWidth, notesWidth)} />
            <NotesPane
              node={selectedNode}
              edges={graphData.edges.filter(
                (e) => e.from === selectedNode.id || e.to === selectedNode.id
              )}
              nodes={graphData.nodes}
              onNodeUpdate={handleNodeUpdate}
              onClose={() => setNotesOpen(false)}
              style={{ width: notesWidth }}
            />
          </>
        )}
      </div>
      <div className="legend">
        {graphData.metadata.streams.map((s) => (
          <span
            key={s.id}
            className={`legend-item ${activeStreams === null || activeStreams.has(s.id) ? "legend-active" : "legend-dimmed"}`}
            onClick={() => handleStreamToggle(s.id)}
            style={{ cursor: "pointer" }}
          >
            <span className="legend-dot" style={{ backgroundColor: s.color || "#999" }} />
            {s.name}
          </span>
        ))}
        {activeStreams && (
          <span className="legend-item legend-reset" onClick={() => setActiveStreams(null)}>
            Show All
          </span>
        )}
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.md"
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
