import { useState, useRef, useCallback } from "react";
import type { GraphNode, GraphEdge, Classifier, NodeTypeConfig, TaxonomyTemplate } from "../types/graph-ir";

const NODE_ICONS = [
  "💡", "⭐", "🎯", "👤", "🏢",
  "📋", "🔒", "💬", "📊", "🔗",
  "⚠️", "✅", "❌", "🔍", "💰",
  "📅", "🌐", "🔧", "📌", "🚀",
];
import { getNodeTypeConfig } from "../migration";
import { EDGE_LABELS } from "../utils/edge-labels";
import type { NetworkAnalysis } from "../utils/graph-analysis";
import { TagInput } from "./TagInput";
import { collectAllTags } from "../utils/tags";

interface Props {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  classifiers: Classifier[];
  nodeTypeConfigs: NodeTypeConfig[];
  template?: TaxonomyTemplate | null;
  onClose?: () => void;
  onNodeUpdate: (nodeId: string, updates: Partial<GraphNode>) => void;
  onNavigateToNode: (nodeId: string) => void;
  onOpenNotes: () => void;
  notesOpen?: boolean;
  onNodeDelete?: (nodeId: string) => void;
  analysis?: NetworkAnalysis | null;
  style?: React.CSSProperties;
}

/** Text input with local state — only commits on blur or after 500ms idle.
 *  Use key={nodeId} on the component to reset state when node changes. */
function DebouncedField({ label, value, onCommit }: {
  label: string; value: string;
  onCommit: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

/** Textarea with local state — only commits on blur or after 500ms idle.
 *  Use key={nodeId} on the component to reset state when node changes. */
function DebouncedTextarea({ label, value, onCommit }: {
  label: string; value: string;
  onCommit: (value: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
  node, edges, nodes, classifiers, nodeTypeConfigs, template,
  onNodeUpdate, onNavigateToNode, onOpenNotes, notesOpen, onNodeDelete, style,
}: Props) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const config = getNodeTypeConfig(nodeTypeConfigs, node.node_type);

  const [localName, setLocalName] = useState(node.name);
  const [attrsOpen, setAttrsOpen] = useState(true);
  const [connectionsOpen, setConnectionsOpen] = useState(true);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Reset name only when switching to a different node (derived state from props)
  const [prevNodeId, setPrevNodeId] = useState(node.id);
  if (prevNodeId !== node.id) {
    setPrevNodeId(node.id);
    setLocalName(node.name);
  }

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
              {/* Icon picker */}
              <div className="editor-field editor-field-icon">
                <label>Icon</label>
                <div className="node-icon-field">
                  <span className="node-icon-preview">
                    {node.properties?.node_icon ?? <span className="node-icon-none">—</span>}
                  </span>
                  <button
                    className="node-icon-toggle-btn"
                    onClick={() => setShowIconPicker((v) => !v)}
                  >
                    {showIconPicker ? "Close" : "Change"}
                  </button>
                  {node.properties?.node_icon && (
                    <button
                      className="node-icon-clear-btn"
                      onClick={() => {
                        const props = { ...node.properties };
                        delete props.node_icon;
                        onNodeUpdate(node.id, { properties: props });
                        setShowIconPicker(false);
                      }}
                      title="Remove icon"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {showIconPicker && (
                  <div className="node-icon-picker-grid">
                    {NODE_ICONS.map((ic) => (
                      <button
                        key={ic}
                        className={`node-icon-option ${node.properties?.node_icon === ic ? "active" : ""}`}
                        onClick={() => {
                          onNodeUpdate(node.id, { properties: { ...node.properties, node_icon: ic } });
                          setShowIconPicker(false);
                        }}
                        title={ic}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Classifiers */}
              {classifiers.map((cls) => (
                <div className="editor-field" key={cls.id}>
                  <label>{cls.label.endsWith("s") ? cls.label.slice(0, -1) : cls.label}</label>
                  <select
                    value={node.classifiers?.[cls.id] ?? ""}
                    onChange={(e) => {
                      const updated = { ...node.classifiers };
                      if (e.target.value) updated[cls.id] = e.target.value;
                      else delete updated[cls.id];
                      onNodeUpdate(node.id, { classifiers: updated });
                    }}
                  >
                    <option value="">--</option>
                    {cls.values.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
              ))}
              {/* Tags */}
              <div className="editor-field">
                <label>Tags</label>
                <TagInput
                  value={node.tags ?? []}
                  existingTags={collectAllTags(nodes)}
                  onChange={(next) => onNodeUpdate(node.id, { tags: next.length > 0 ? next : undefined })}
                />
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

                if (field.type === "time") {
                  return (
                    <div className="editor-field" key={`${node.id}-${field.key}`}>
                      <label>{field.label}</label>
                      <input
                        type="date"
                        value={strValue}
                        onChange={(e) => debouncedUpdateProperty(field.key, e.target.value)}
                      />
                    </div>
                  );
                }

                if (field.type === "textarea") {
                  return (
                    <DebouncedTextarea
                      key={`${node.id}-${field.key}`}
                      label={field.label}
                      value={strValue}
                      onCommit={(v) => debouncedUpdateProperty(field.key, v)}
                    />
                  );
                }

                // text field (default)
                return (
                  <DebouncedField
                    key={`${node.id}-${field.key}`}
                    label={field.label}
                    value={strValue}
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
