import { useState, useEffect, useRef, useCallback } from "react";
import type { GraphNode, GraphEdge, Stream, Generation } from "../types/graph-ir";

interface Props {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  streams: Stream[];
  generations: Generation[];
  onClose: () => void;
  onNodeUpdate: (nodeId: string, updates: Partial<GraphNode>) => void;
  onNavigateToNode: (nodeId: string) => void;
  onOpenNotes: () => void;
  notesOpen: boolean;
  style?: React.CSSProperties;
}

const EDGE_LABELS: Record<string, string> = {
  teacher_pupil: "Teacher \u2192 Pupil", chain: "Chain", rivalry: "Rivalry",
  alliance: "Alliance", synthesis: "Synthesis", institutional: "Institutional",
  originates: "Originates", develops: "Develops", contests: "Contests",
  applies: "Applies", extends: "Extends", opposes: "Opposes",
  subsumes: "Subsumes", enables: "Enables", reframes: "Reframes",
};

const EMINENCE_OPTIONS = ["dominant", "major", "secondary", "minor"];
const CONCEPT_TYPE_OPTIONS = ["framework", "principle", "distinction", "mechanism", "prescription", "synthesis"];
const ABSTRACTION_OPTIONS = ["meta-theoretical", "theoretical", "operational", "concrete"];
const STATUS_OPTIONS = ["active", "absorbed", "contested", "dormant", "superseded"];

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

export function DetailPanel({
  node, edges, nodes, streams, generations,
  onClose, onNodeUpdate, onNavigateToNode, onOpenNotes, notesOpen, style,
}: Props) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const thinkerNodes = nodes.filter((n) => n.node_type === "thinker");

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
          <span className={`node-type-badge ${node.node_type === "thinker" ? "badge-thinker" : "badge-concept"}`}>
            {node.node_type}
          </span>
          <button
            className={`toolbar-btn ${notesOpen ? "active" : "add-btn"}`}
            style={{ padding: "2px 8px", fontSize: "11px" }}
            onClick={onOpenNotes}
            title="Open notes editor"
          >
            {notesOpen ? "Close Notes" : "Edit Notes"}
          </button>
          <button className="close-btn" onClick={onClose}>&times;</button>
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
              {node.thinker_fields && (
                <>
                  <DebouncedField label="Dates" value={node.thinker_fields.dates ?? ""} nodeId={node.id}
                    onCommit={(v) => debouncedUpdate({ thinker_fields: { ...node.thinker_fields!, dates: v || undefined } })} />

                  <div className="editor-field">
                    <label>Eminence</label>
                    <select value={node.thinker_fields.eminence} onChange={(e) =>
                      onNodeUpdate(node.id, { thinker_fields: { ...node.thinker_fields!, eminence: e.target.value } })}>
                      {EMINENCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="editor-field">
                    <label>Stream</label>
                    <select value={node.stream ?? ""} onChange={(e) => onNodeUpdate(node.id, { stream: e.target.value || undefined })}>
                      <option value="">--</option>
                      {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="editor-field">
                    <label>Generation</label>
                    <select value={node.generation ?? ""} onChange={(e) =>
                      onNodeUpdate(node.id, { generation: e.target.value ? Number(e.target.value) : undefined })}>
                      <option value="">--</option>
                      {generations.map((g) => <option key={g.number} value={g.number}>{g.number}{g.label ? ` - ${g.label}` : ""}</option>)}
                    </select>
                  </div>
                  <DebouncedField label="Roles" value={node.thinker_fields.structural_roles.join(", ")} nodeId={node.id}
                    onCommit={(v) => onNodeUpdate(node.id, { thinker_fields: { ...node.thinker_fields!, structural_roles: v.split(",").map((s) => s.trim()).filter(Boolean) } })} />
                  <DebouncedField label="Active Period" value={node.thinker_fields.active_period ?? ""} nodeId={node.id}
                    onCommit={(v) => onNodeUpdate(node.id, { thinker_fields: { ...node.thinker_fields!, active_period: v || undefined } })} />
                  <DebouncedField label="Institution" value={node.thinker_fields.institutional_base ?? ""} nodeId={node.id}
                    onCommit={(v) => onNodeUpdate(node.id, { thinker_fields: { ...node.thinker_fields!, institutional_base: v || undefined } })} />
                </>
              )}
              {node.concept_fields && (
                <>
                  <div className="editor-field">
                    <label>Originator</label>
                    <select value={node.concept_fields.originator_id} onChange={(e) =>
                      onNodeUpdate(node.id, { concept_fields: { ...node.concept_fields!, originator_id: e.target.value } })}>
                      <option value="unknown_author">unknown</option>
                      {thinkerNodes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="editor-field">
                    <label>Type</label>
                    <select value={node.concept_fields.concept_type} onChange={(e) =>
                      onNodeUpdate(node.id, { concept_fields: { ...node.concept_fields!, concept_type: e.target.value } })}>
                      {CONCEPT_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="editor-field">
                    <label>Abstraction</label>
                    <select value={node.concept_fields.abstraction_level} onChange={(e) =>
                      onNodeUpdate(node.id, { concept_fields: { ...node.concept_fields!, abstraction_level: e.target.value } })}>
                      {ABSTRACTION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="editor-field">
                    <label>Status</label>
                    <select value={node.concept_fields.status} onChange={(e) =>
                      onNodeUpdate(node.id, { concept_fields: { ...node.concept_fields!, status: e.target.value } })}>
                      {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <DebouncedField label="Introduced" value={node.concept_fields.date_introduced ?? ""} nodeId={node.id}
                    onCommit={(v) => onNodeUpdate(node.id, { concept_fields: { ...node.concept_fields!, date_introduced: v || undefined } })} />
                  <div className="editor-field">
                    <label>Stream</label>
                    <select value={node.stream ?? ""} onChange={(e) => onNodeUpdate(node.id, { stream: e.target.value || undefined })}>
                      <option value="">--</option>
                      {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="editor-field">
                    <label>Generation</label>
                    <select value={node.generation ?? ""} onChange={(e) =>
                      onNodeUpdate(node.id, { generation: e.target.value ? Number(e.target.value) : undefined })}>
                      <option value="">--</option>
                      {generations.map((g) => <option key={g.number} value={g.number}>{g.number}{g.label ? ` - ${g.label}` : ""}</option>)}
                    </select>
                  </div>
                </>
              )}
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
                  const label = EDGE_LABELS[e.edge_type] ?? e.edge_type;
                  return (
                    <div key={i} className="edge-item">
                      <span className="edge-type">{label}</span>{" "}
                      {direction}{" "}
                      <button className="link-btn" onClick={() => onNavigateToNode(otherId)}>
                        {otherNode?.name ?? otherId}
                      </button>
                      {e.note && <div className="edge-note">{e.note}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Notes preview (brief, click to open full notes pane) */}
        {node.notes && (
          <div className="detail-section">
            <div className="detail-section-header" onClick={onOpenNotes}>
              <span className="field-label">Notes</span>
              <span className="toggle-icon">{"\u25B6"}</span>
            </div>
            <div className="notes-preview">{node.notes.slice(0, 150)}{node.notes.length > 150 ? "..." : ""}</div>
          </div>
        )}
      </div>
    </div>
  );
}
