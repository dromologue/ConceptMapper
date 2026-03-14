import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import type { GraphNode, GraphEdge, Stream, Generation } from "../types/graph-ir";

export interface EditorPaneProps {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  streams: Stream[];
  generations: Generation[];
  onClose: () => void;
  onNodeUpdate: (nodeId: string, updates: Partial<GraphNode>) => void;
  onNavigateToNode: (nodeId: string) => void;
  style?: React.CSSProperties;
}

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

const EMINENCE_OPTIONS = ["dominant", "major", "secondary", "minor"];
const CONCEPT_TYPE_OPTIONS = ["distinction", "framework", "model", "theory", "method", "principle"];
const ABSTRACTION_OPTIONS = ["meta-theoretical", "theoretical", "operational", "concrete"];
const STATUS_OPTIONS = ["active", "contested", "superseded", "dormant"];

export function EditorPane({
  node,
  edges,
  nodes,
  streams,
  generations,
  onClose,
  onNodeUpdate,
  onNavigateToNode,
  style,
}: EditorPaneProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const thinkerNodes = nodes.filter((n) => n.node_type === "thinker");

  const [localName, setLocalName] = useState(node.name);
  const [localNotes, setLocalNotes] = useState(node.notes ?? "");
  const [notesEditing, setNotesEditing] = useState(false);
  const [attrsOpen, setAttrsOpen] = useState(true);
  const [connectionsOpen, setConnectionsOpen] = useState(true);

  // Sync local state when selected node changes
  useEffect(() => {
    setLocalName(node.name);
    setLocalNotes(node.notes ?? "");
    setNotesEditing(false);
  }, [node.id, node.notes, node.name]);

  const handleNameChange = (value: string) => {
    setLocalName(value);
    onNodeUpdate(node.id, { name: value });
  };

  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    onNodeUpdate(node.id, { notes: value || undefined });
  };

  // Collect edge notes for connected edges
  const edgeNotes = edges
    .filter((e) => e.note)
    .map((e) => {
      const otherId = e.from === node.id ? e.to : e.from;
      const otherNode = nodeMap.get(otherId);
      const label = EDGE_LABELS[e.edge_type] ?? e.edge_type;
      const direction = e.from === node.id ? "\u2192" : "\u2190";
      return {
        label: `${label} ${direction} ${otherNode?.name ?? otherId}`,
        note: e.note!,
      };
    });

  return (
    <div className="editor-pane" style={style}>
      {/* Header */}
      <div className="editor-header">
        <input
          className="editor-name-input"
          value={localName}
          onChange={(e) => handleNameChange(e.target.value)}
          aria-label="Node name"
        />
        <span className={`node-type-badge ${node.node_type === "thinker" ? "badge-thinker" : "badge-concept"}`}>
          {node.node_type}
        </span>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>

      {/* Attributes section (collapsible) */}
      <div className="editor-section">
        <div className="editor-section-header" onClick={() => setAttrsOpen(!attrsOpen)}>
          <span className="field-label">Attributes</span>
          <button className="notes-section-toggle">{attrsOpen ? "\u25B2" : "\u25BC"}</button>
        </div>
        {attrsOpen && (
          <div className="editor-section-body">
            {node.thinker_fields && (
              <>
                <div className="editor-field">
                  <label>Dates</label>
                  <input
                    value={node.thinker_fields.dates ?? ""}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        thinker_fields: { ...node.thinker_fields!, dates: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div className="editor-field">
                  <label>Eminence</label>
                  <select
                    value={node.thinker_fields.eminence}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        thinker_fields: { ...node.thinker_fields!, eminence: e.target.value },
                      })
                    }
                  >
                    {EMINENCE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="editor-field">
                  <label>Stream</label>
                  <select
                    value={node.stream ?? ""}
                    onChange={(e) => onNodeUpdate(node.id, { stream: e.target.value || undefined })}
                  >
                    <option value="">--</option>
                    {streams.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="editor-field">
                  <label>Generation</label>
                  <select
                    value={node.generation ?? ""}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        generation: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  >
                    <option value="">--</option>
                    {generations.map((g) => (
                      <option key={g.number} value={g.number}>
                        {g.number}{g.label ? ` - ${g.label}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="editor-field">
                  <label>Roles</label>
                  <input
                    value={node.thinker_fields.structural_roles.join(", ")}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        thinker_fields: {
                          ...node.thinker_fields!,
                          structural_roles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
                <div className="editor-field">
                  <label>Active Period</label>
                  <input
                    value={node.thinker_fields.active_period ?? ""}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        thinker_fields: { ...node.thinker_fields!, active_period: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div className="editor-field">
                  <label>Institution</label>
                  <input
                    value={node.thinker_fields.institutional_base ?? ""}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        thinker_fields: { ...node.thinker_fields!, institutional_base: e.target.value || undefined },
                      })
                    }
                  />
                </div>
              </>
            )}

            {node.concept_fields && (
              <>
                <div className="editor-field">
                  <label>Originator</label>
                  <select
                    value={node.concept_fields.originator_id}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        concept_fields: { ...node.concept_fields!, originator_id: e.target.value },
                      })
                    }
                  >
                    <option value="unknown_author">unknown</option>
                    {thinkerNodes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="editor-field">
                  <label>Type</label>
                  <select
                    value={node.concept_fields.concept_type}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        concept_fields: { ...node.concept_fields!, concept_type: e.target.value },
                      })
                    }
                  >
                    {CONCEPT_TYPE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="editor-field">
                  <label>Abstraction</label>
                  <select
                    value={node.concept_fields.abstraction_level}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        concept_fields: { ...node.concept_fields!, abstraction_level: e.target.value },
                      })
                    }
                  >
                    {ABSTRACTION_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="editor-field">
                  <label>Status</label>
                  <select
                    value={node.concept_fields.status}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        concept_fields: { ...node.concept_fields!, status: e.target.value },
                      })
                    }
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="editor-field">
                  <label>Introduced</label>
                  <input
                    value={node.concept_fields.date_introduced ?? ""}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        concept_fields: { ...node.concept_fields!, date_introduced: e.target.value || undefined },
                      })
                    }
                  />
                </div>
                <div className="editor-field">
                  <label>Stream</label>
                  <select
                    value={node.stream ?? ""}
                    onChange={(e) => onNodeUpdate(node.id, { stream: e.target.value || undefined })}
                  >
                    <option value="">--</option>
                    {streams.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="editor-field">
                  <label>Generation</label>
                  <select
                    value={node.generation ?? ""}
                    onChange={(e) =>
                      onNodeUpdate(node.id, {
                        generation: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  >
                    <option value="">--</option>
                    {generations.map((g) => (
                      <option key={g.number} value={g.number}>
                        {g.number}{g.label ? ` - ${g.label}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Connections section (collapsible) */}
      {edges.length > 0 && (
        <div className="editor-section">
          <div className="editor-section-header" onClick={() => setConnectionsOpen(!connectionsOpen)}>
            <span className="field-label">Connections ({edges.length})</span>
            <button className="notes-section-toggle">{connectionsOpen ? "\u25B2" : "\u25BC"}</button>
          </div>
          {connectionsOpen && (
            <div className="editor-section-body">
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

      {/* Notes section (fills remaining height) */}
      <div className="editor-notes-section">
        <div className="editor-notes-header">
          <span className="field-label">Notes</span>
          <button
            className="toolbar-btn"
            style={{ padding: "2px 8px", fontSize: "11px" }}
            onClick={() => setNotesEditing(!notesEditing)}
          >
            {notesEditing ? "Read" : "Edit"}
          </button>
        </div>
        {notesEditing ? (
          <textarea
            className="notes-editor notes-editor-full"
            value={localNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Add notes about this node..."
          />
        ) : (
          <div
            className="notes-rendered"
            onClick={() => {
              if (!localNotes) setNotesEditing(true);
            }}
          >
            {edgeNotes.length > 0 && (
              <div className="edge-notes-list">
                {edgeNotes.map((en, i) => (
                  <div key={i} className="edge-note-item">
                    <div className="edge-note-label">{en.label}</div>
                    <div className="edge-note-text">{en.note}</div>
                  </div>
                ))}
              </div>
            )}
            {localNotes ? (
              <Markdown>{localNotes}</Markdown>
            ) : (
              <p className="notes-placeholder" onClick={() => setNotesEditing(true)}>
                Click to add notes...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
