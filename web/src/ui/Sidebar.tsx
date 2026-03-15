import { useState, useMemo } from "react";
import type { GraphNode, Stream, NodeTypeConfig, TaxonomyTemplate } from "../types/graph-ir";
import { IconChevronDown } from "./Icons";

interface Props {
  nodes: GraphNode[];
  streams: Stream[];
  nodeTypeConfigs: NodeTypeConfig[];
  template?: TaxonomyTemplate | null;
  activeStreams: Set<string> | null;
  onStreamToggle: (streamId: string) => void;
  onShowAll: () => void;
  onSelectNode: (node: GraphNode) => void;
  selectedNodeId: string | null;
  onAddNode: (nodeType: string) => void;
  onAddEdge: () => void;
  interactionMode: string;
  onCancelAddEdge: () => void;
}

export function Sidebar({
  nodes, streams, nodeTypeConfigs, template, activeStreams,
  onStreamToggle, onShowAll,
  onSelectNode, selectedNodeId,
  onAddNode, onAddEdge,
  interactionMode, onCancelAddEdge,
}: Props) {
  const streamSectionLabel = template?.stream_label || "Categories";
  const [filter, setFilter] = useState("");
  const [streamsOpen, setStreamsOpen] = useState(true);
  const [nodesOpen, setNodesOpen] = useState(true);

  const filteredNodes = useMemo(() => {
    const q = filter.toLowerCase();
    return nodes
      .filter((n) => !q || n.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nodes, filter]);

  const isEdgeMode = interactionMode !== "normal";

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Explorer</span>
      </div>

      {/* Add node buttons — one per configured type + edge button */}
      <div className="sidebar-add-actions">
        {nodeTypeConfigs.map((config) => (
          <button
            key={config.id}
            className="sidebar-action-btn"
            onClick={() => onAddNode(config.id)}
          >
            + {config.label}
          </button>
        ))}
        <button
          className={`sidebar-action-btn sidebar-edge-btn ${isEdgeMode ? "active" : ""}`}
          onClick={isEdgeMode ? onCancelAddEdge : onAddEdge}
          title={isEdgeMode ? "Cancel edge drawing (Esc)" : "Draw edge between nodes"}
        >
          {isEdgeMode ? "Cancel Edge" : "+ Edge"}
        </button>
      </div>

      {/* Streams section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header" onClick={() => setStreamsOpen(!streamsOpen)}>
          <span>{streamSectionLabel}</span>
          <span className={`sidebar-chevron ${streamsOpen ? "open" : ""}`}>
            <IconChevronDown size={12} />
          </span>
        </div>
        {streamsOpen && (
          <div className="sidebar-section-body">
            {streams.map((s) => (
              <div
                key={s.id}
                className={`sidebar-stream-item ${activeStreams === null || activeStreams.has(s.id) ? "" : "dimmed"}`}
                onClick={() => onStreamToggle(s.id)}
              >
                <span className="sidebar-stream-dot" style={{ backgroundColor: s.color || "#999" }} />
                <span className="sidebar-stream-name">{s.name}</span>
              </div>
            ))}
            {activeStreams && (
              <div className="sidebar-stream-item sidebar-show-all" onClick={onShowAll}>
                Show All
              </div>
            )}
          </div>
        )}
      </div>

      {/* Node list — grouped by node type */}
      <div className="sidebar-section sidebar-nodes-section">
        <div className="sidebar-section-header" onClick={() => setNodesOpen(!nodesOpen)}>
          <span>Nodes ({nodes.length})</span>
          <span className={`sidebar-chevron ${nodesOpen ? "open" : ""}`}>
            <IconChevronDown size={12} />
          </span>
        </div>
        {nodesOpen && (
          <div className="sidebar-section-body sidebar-node-list">
            <input
              className="sidebar-filter"
              type="text"
              placeholder="Filter nodes..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="sidebar-node-scroll">
              {nodeTypeConfigs.map((config) => {
                const typeNodes = filteredNodes.filter((n) => n.node_type === config.id);
                if (typeNodes.length === 0) return null;
                return (
                  <div key={config.id} className="sidebar-type-group">
                    <div className="sidebar-type-group-header">
                      <span className="sidebar-type-group-icon">{config.icon ?? config.label[0]}</span>
                      <span className="sidebar-type-group-label">{config.label}</span>
                      <span className="sidebar-type-group-count">{typeNodes.length}</span>
                    </div>
                    {typeNodes.map((n) => (
                      <div
                        key={n.id}
                        className={`sidebar-node-item ${n.id === selectedNodeId ? "selected" : ""}`}
                        onClick={() => onSelectNode(n)}
                      >
                        <span
                          className={`sidebar-node-indicator ${config.shape === "rectangle" ? "concept" : ""}`}
                          style={{
                            backgroundColor: streams.find((s) => s.id === n.stream)?.color ?? "#666",
                          }}
                        />
                        <span className="sidebar-node-name">{n.name}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {/* Nodes with unknown type (no matching config) */}
              {filteredNodes.filter((n) => !nodeTypeConfigs.some((c) => c.id === n.node_type)).length > 0 && (
                <div className="sidebar-type-group">
                  <div className="sidebar-type-group-header">
                    <span className="sidebar-type-group-label">Other</span>
                  </div>
                  {filteredNodes
                    .filter((n) => !nodeTypeConfigs.some((c) => c.id === n.node_type))
                    .map((n) => (
                      <div
                        key={n.id}
                        className={`sidebar-node-item ${n.id === selectedNodeId ? "selected" : ""}`}
                        onClick={() => onSelectNode(n)}
                      >
                        <span className="sidebar-node-indicator" style={{ backgroundColor: "#666" }} />
                        <span className="sidebar-node-name">{n.name}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
