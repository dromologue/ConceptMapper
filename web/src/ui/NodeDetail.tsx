import { useState } from "react";
import type { GraphNode, GraphEdge, Stream } from "../types/graph-ir";

interface Props {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  streams: Stream[];
  onClose: () => void;
  onNotesChange: (nodeId: string, notes: string) => void;
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

export function NodeDetail({ node, edges, nodes, streams, onClose, onNotesChange }: Props) {
  const stream = streams.find((s) => s.id === node.stream);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const [localNotes, setLocalNotes] = useState(node.notes ?? "");

  const handleNotesBlur = () => {
    onNotesChange(node.id, localNotes);
  };

  return (
    <div className="node-detail">
      <button className="close-btn" onClick={onClose}>
        &times;
      </button>
      <h2>{node.name}</h2>
      <span
        className={`node-type-badge ${node.node_type === "thinker" ? "badge-thinker" : "badge-concept"}`}
      >
        {node.node_type}
      </span>

      {node.thinker_fields && (
        <>
          {node.thinker_fields.dates && (
            <div className="field">
              <div className="field-label">Dates</div>
              <div className="field-value">{node.thinker_fields.dates}</div>
            </div>
          )}
          <div className="field">
            <div className="field-label">Eminence</div>
            <div className="field-value">{node.thinker_fields.eminence}</div>
          </div>
          {stream && (
            <div className="field">
              <div className="field-label">Stream</div>
              <div className="field-value">
                <span
                  className="legend-dot"
                  style={{
                    backgroundColor: stream.color ?? "#999",
                    display: "inline-block",
                    marginRight: 6,
                    verticalAlign: "middle",
                  }}
                />
                {stream.name}
              </div>
            </div>
          )}
          {node.generation != null && (
            <div className="field">
              <div className="field-label">Generation</div>
              <div className="field-value">{node.generation}</div>
            </div>
          )}
          {node.thinker_fields.structural_roles.length > 0 && (
            <div className="field">
              <div className="field-label">Structural Roles</div>
              <div className="field-value">
                {node.thinker_fields.structural_roles.join(", ")}
              </div>
            </div>
          )}
          {node.thinker_fields.active_period && (
            <div className="field">
              <div className="field-label">Active Period</div>
              <div className="field-value">{node.thinker_fields.active_period}</div>
            </div>
          )}
          {node.thinker_fields.institutional_base && (
            <div className="field">
              <div className="field-label">Institutional Base</div>
              <div className="field-value">{node.thinker_fields.institutional_base}</div>
            </div>
          )}
        </>
      )}

      {node.concept_fields && (
        <>
          <div className="field">
            <div className="field-label">Type</div>
            <div className="field-value">{node.concept_fields.concept_type}</div>
          </div>
          <div className="field">
            <div className="field-label">Abstraction Level</div>
            <div className="field-value">{node.concept_fields.abstraction_level}</div>
          </div>
          <div className="field">
            <div className="field-label">Status</div>
            <div className="field-value">{node.concept_fields.status}</div>
          </div>
          {node.concept_fields.date_introduced && (
            <div className="field">
              <div className="field-label">Date Introduced</div>
              <div className="field-value">{node.concept_fields.date_introduced}</div>
            </div>
          )}
          {node.concept_fields.originator_id && (
            <div className="field">
              <div className="field-label">Originator</div>
              <div className="field-value">
                {nodeMap.get(node.concept_fields.originator_id)?.name ??
                  node.concept_fields.originator_id}
              </div>
            </div>
          )}
          {stream && (
            <div className="field">
              <div className="field-label">Stream</div>
              <div className="field-value">
                <span
                  className="legend-dot"
                  style={{
                    backgroundColor: stream.color ?? "#999",
                    display: "inline-block",
                    marginRight: 6,
                    verticalAlign: "middle",
                  }}
                />
                {stream.name}
              </div>
            </div>
          )}
        </>
      )}

      <div className="field">
        <div className="field-label">Notes</div>
        <textarea
          className="notes-editor"
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add notes..."
          rows={4}
        />
      </div>

      {edges.length > 0 && (
        <div className="edges-section">
          <div className="field-label">Connections ({edges.length})</div>
          {edges.map((e, i) => {
            const otherId = e.from === node.id ? e.to : e.from;
            const otherNode = nodeMap.get(otherId);
            const direction = e.from === node.id ? "\u2192" : "\u2190";
            const label = EDGE_LABELS[e.edge_type] ?? e.edge_type;
            return (
              <div key={i} className="edge-item">
                <span className="edge-type">{label}</span>{" "}
                {direction}{" "}
                <span className="edge-target">{otherNode?.name ?? otherId}</span>
                {e.note && <div className="edge-note">{e.note}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
