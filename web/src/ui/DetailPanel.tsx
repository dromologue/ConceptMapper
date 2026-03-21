import { useState, useEffect, useRef, useCallback } from "react";
import type { GraphNode, GraphEdge, Stream, Generation, NodeTypeConfig, TaxonomyTemplate } from "../types/graph-ir";
import { getNodeTypeConfig } from "../migration";
import { EDGE_LABELS } from "../utils/edge-labels";

interface Props {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  streams: Stream[];
  generations: Generation[];
  nodeTypeConfigs: NodeTypeConfig[];
  template?: TaxonomyTemplate | null;
  onClose?: () => void;
  onNodeUpdate: (nodeId: string, updates: Partial<GraphNode>) => void;
  onNavigateToNode: (nodeId: string) => void;
  onOpenNotes: () => void;
  notesOpen?: boolean;
  onNodeDelete?: (nodeId: string) => void;
  style?: React.CSSProperties;
}

/** Text input with local state — only commits on blur or after 500ms idle */
function DebouncedField({ label, value, nodeId, onCommit }: {
  label: string; value: string; nodeId: string;
  onCommit: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { setLocal(value); }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (v: string) => {
    setLocal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onCommit(v), 500);
  };

  return (
    <div className="editor-field">
      <label>{label}</label>
      <input value={local} onChange={(e) => handleChange(e.target.value)}
        onBlur={() => { clearTimeout(timerRef.current); onCommit(local); }} />
    </div>
  );
}

/** Textarea with local state — only commits on blur or after 500ms idle */
function DebouncedTextarea({ label, value, nodeId, onCommit }: {
  label: string; value: string; nodeId: string;
  onCommit: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { setLocal(value); }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (v: string) => {
    setLocal(v);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onCommit(v), 500);
  };

  return (
    <div className="editor-field">
      <label>{label}</label>
      <textarea value={local} onChange={(e) => handleChange(e.target.value)}
        onBlur={() => { clearTimeout(timerRef.current); onCommit(local); }}
        rows={3} />
    </div>
  );
}

export function DetailPanel({
  node, edges, nodes, streams, generations, nodeTypeConfigs, template,
  onNodeUpdate, onNavigateToNode, onOpenNotes, notesOpen, onNodeDelete, style,
}: Props) {
  // Use singular form for field labels — strip trailing 's' if present
  // Use template labels if set, otherwise generic defaults
  const rawStreamLabel = template?.stream_label || "Stream";
  const rawGenLabel = template?.generation_label || "Phase";
  const streamLabel = rawStreamLabel.endsWith("s") ? rawStreamLabel.slice(0, -1) : rawStreamLabel;
  const generationLabel = rawGenLabel.endsWith("s") ? rawGenLabel.slice(0, -1) : rawGenLabel;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const config = getNodeTypeConfig(nodeTypeConfigs, node.node_type);

  const [localName, setLocalName] = useState(node.name);
  const [attrsOpen, setAttrsOpen] = useState(true);
  const [connectionsOpen, setConnectionsOpen] = useState(true);

  // Reset only when switching to a different node
  useEffect(() => {
    setLocalName(node.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  // Debounced text field update (300ms delay)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const debouncedUpdate = useCallback(
    (updates: Partial<GraphNode>) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onNodeUpdate(node.id, updates);
      }, 300);
    },
    [node.id, onNodeUpdate]
  );

  const handleNameChange = (value: string) => {
    setLocalName(value);
    debouncedUpdate({ name: value });
  };

  const updateProperty = (key: string, value: string | undefined) => {
    const props = { ...node.properties, [key]: value || undefined };
    onNodeUpdate(node.id, { properties: props });
  };

  const debouncedUpdateProperty = (key: string, value: string | undefined) => {
    const props = { ...node.properties, [key]: value || undefined };
    debouncedUpdate({ properties: props });
  };

  return (
    <div className="detail-panel" style={style}>
      {/* Header */}
      <div className="detail-header">
        <input
          className="detail-name-input"
          value={localName}
          onChange={(e) => handleNameChange(e.target.value)}
          aria-label="Node name"
        />
        <div className="detail-header-actions">
          <span className={`node-type-badge ${config?.shape === "rectangle" ? "badge-concept" : "badge-thinker"}`}>
            {config?.label ?? node.node_type}
          </span>
          <button
            className={`detail-notes-btn ${notesOpen ? "active" : ""}`}
            onClick={onOpenNotes}
            title="Toggle notes editor"
          >
            {notesOpen ? "Close Notes" : "Edit Notes"}
          </button>
          {onNodeDelete && (
            <button
              className="detail-delete-btn"
              onClick={() => {
                if (window.confirm("Delete node and all its connections?")) {
                  onNodeDelete(node.id);
                }
              }}
              title="Delete node"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="detail-scroll">
        {/* Attributes section */}
        <div className="detail-section">
          <div className="detail-section-header" onClick={() => setAttrsOpen(!attrsOpen)}>
            <span className="field-label">Attributes</span>
            <span className="toggle-icon">{attrsOpen ? "\u25B2" : "\u25BC"}</span>
          </div>
          {attrsOpen && (
            <div className="detail-section-body">
              {/* Node Type (read-only, prominent) */}
              <div className="editor-field">
                <label>Type</label>
                <span className="editor-field-value">{config?.label ?? node.node_type}</span>
              </div>
              {/* Stream / Category (built-in) */}
              <div className="editor-field">
                <label>{streamLabel}</label>
                <select value={node.stream ?? ""} onChange={(e) => onNodeUpdate(node.id, { stream: e.target.value || undefined })}>
                  <option value="">--</option>
                  {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {/* Generation / Horizon (built-in) */}
              <div className="editor-field">
                <label>{generationLabel}</label>
                <select value={node.generation ?? ""} onChange={(e) =>
                  onNodeUpdate(node.id, { generation: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">--</option>
                  {generations.map((g) => <option key={g.number} value={g.number}>{g.number}{g.label ? ` - ${g.label}` : ""}</option>)}
                </select>
              </div>
              {/* Dynamic fields from config */}
              {config?.fields.map((field) => {
                const propValue = node.properties?.[field.key];
                const strValue = propValue != null ? String(propValue) : "";

                if (field.type === "select" && field.options) {
                  return (
                    <div className="editor-field" key={field.key}>
                      <label>{field.label}</label>
                      <select
                        value={strValue}
                        onChange={(e) => updateProperty(field.key, e.target.value)}
                      >
                        <option value="">--</option>
                        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  );
                }

                if (field.type === "textarea") {
                  return (
                    <DebouncedTextarea
                      key={field.key}
                      label={field.label}
                      value={strValue}
                      nodeId={node.id}
                      onCommit={(v) => debouncedUpdateProperty(field.key, v)}
                    />
                  );
                }

                // text field (default)
                return (
                  <DebouncedField
                    key={field.key}
                    label={field.label}
                    value={strValue}
                    nodeId={node.id}
                    onCommit={(v) => debouncedUpdateProperty(field.key, v)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Connections section */}
        {edges.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-header" onClick={() => setConnectionsOpen(!connectionsOpen)}>
              <span className="field-label">Connections ({edges.length})</span>
              <span className="toggle-icon">{connectionsOpen ? "\u25B2" : "\u25BC"}</span>
            </div>
            {connectionsOpen && (
              <div className="detail-section-body">
                {edges.map((e, i) => {
                  const otherId = e.from === node.id ? e.to : e.from;
                  const otherNode = nodeMap.get(otherId);
                  const direction = e.from === node.id ? "\u2192" : "\u2190";
                  const label = template?.edge_types?.find((et) => et.id === e.edge_type)?.label
                    ?? EDGE_LABELS[e.edge_type] ?? e.edge_type;
                  return (
                    <div key={i} className="edge-item">
                      <span className="edge-type">{label}</span>{" "}
                      {direction}{" "}
                      <button className="link-btn" onClick={() => onNavigateToNode(otherId)}>
                        {otherNode?.name ?? otherId}
                      </button>
                      {otherNode && (
                        <span className="edge-other-type">
                          {getNodeTypeConfig(nodeTypeConfigs, otherNode.node_type)?.label ?? otherNode.node_type}
                        </span>
                      )}
                      {e.note && <div className="edge-note">{e.note}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Notes are viewed/edited in the dedicated NotesPane */}
      </div>
    </div>
  );
}
