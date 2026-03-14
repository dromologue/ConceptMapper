import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import type { GraphNode, GraphEdge } from "../types/graph-ir";

interface Props {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  onNodeUpdate: (nodeId: string, updates: Partial<GraphNode>) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

const EDGE_LABELS: Record<string, string> = {
  teacher_pupil: "Teacher \u2192 Pupil", chain: "Chain", rivalry: "Rivalry",
  alliance: "Alliance", synthesis: "Synthesis", institutional: "Institutional",
  originates: "Originates", develops: "Develops", contests: "Contests",
  applies: "Applies", extends: "Extends", opposes: "Opposes",
  subsumes: "Subsumes", enables: "Enables", reframes: "Reframes",
};

export function NotesPane({ node, edges, nodes, onNodeUpdate, onClose, style }: Props) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const [localNotes, setLocalNotes] = useState(node.notes ?? "");
  const [mode, setMode] = useState<"edit" | "read">(node.notes ? "read" : "edit");

  // Reset mode only when switching to a different node
  useEffect(() => {
    setLocalNotes(node.notes ?? "");
    setMode(node.notes ? "read" : "edit");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleNotesChange = (value: string) => {
    setLocalNotes(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onNodeUpdate(node.id, { notes: value || undefined });
    }, 500);
  };

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
    <div className="notes-pane" style={style}>
      <div className="notes-pane-header">
        <span className="notes-pane-title">Notes: {node.name}</span>
        <div className="notes-pane-actions">
          <button
            className={`toolbar-btn ${mode === "edit" ? "active" : ""}`}
            style={{ padding: "2px 8px", fontSize: "11px" }}
            onClick={() => setMode(mode === "edit" ? "read" : "edit")}
          >
            {mode === "edit" ? "Preview" : "Edit"}
          </button>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
      </div>

      {/* Relationship context (read-only) */}
      {edgeNotes.length > 0 && (
        <div className="notes-context">
          <div className="field-label" style={{ marginBottom: 6 }}>Relationship Context</div>
          {edgeNotes.map((en, i) => (
            <div key={i} className="context-note">
              <span className="context-label">{en.label}</span>
              <span className="context-text">{en.note}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes content */}
      <div className="notes-content">
        {mode === "edit" ? (
          <textarea
            className="notes-editor-full"
            value={localNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Write notes in markdown...\n\n# Heading\n- Bullet point\n**Bold text**\n\nThe notes will render as formatted markdown in Preview mode."
            autoFocus
          />
        ) : (
          <div className="notes-rendered" onClick={() => setMode("edit")}>
            {localNotes ? (
              <Markdown>{localNotes}</Markdown>
            ) : (
              <p className="notes-placeholder">Click to add notes...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
