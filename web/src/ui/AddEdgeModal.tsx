import { useState } from "react";
import type { GraphNode } from "../types/graph-ir";

interface Props {
  sourceNode: GraphNode;
  targetNode: GraphNode;
  onAdd: (edgeType: string) => void;
  onCancel: () => void;
}

const EDGE_TYPES = {
  "Thinker \u2194 Thinker": [
    { value: "teacher_pupil", label: "Teacher \u2192 Pupil" },
    { value: "chain", label: "Chain (cultural capital)" },
    { value: "rivalry", label: "Rivalry" },
    { value: "alliance", label: "Alliance" },
    { value: "synthesis", label: "Synthesis" },
    { value: "institutional", label: "Institutional" },
  ],
  "Thinker \u2192 Concept": [
    { value: "originates", label: "Originates" },
    { value: "develops", label: "Develops" },
    { value: "contests", label: "Contests" },
    { value: "applies", label: "Applies" },
  ],
  "Concept \u2194 Concept": [
    { value: "extends", label: "Extends" },
    { value: "opposes", label: "Opposes" },
    { value: "subsumes", label: "Subsumes" },
    { value: "enables", label: "Enables" },
    { value: "reframes", label: "Reframes" },
  ],
};

export function AddEdgeModal({ sourceNode, targetNode, onAdd, onCancel }: Props) {
  const [edgeType, setEdgeType] = useState("");

  // Determine which edge types are valid
  const srcType = sourceNode.node_type;
  const tgtType = targetNode.node_type;
  let validGroups: [string, typeof EDGE_TYPES[keyof typeof EDGE_TYPES]][] = [];

  if (srcType === "thinker" && tgtType === "thinker") {
    validGroups = [["Thinker \u2194 Thinker", EDGE_TYPES["Thinker \u2194 Thinker"]]];
  } else if (srcType === "concept" && tgtType === "concept") {
    validGroups = [["Concept \u2194 Concept", EDGE_TYPES["Concept \u2194 Concept"]]];
  } else {
    validGroups = [["Thinker \u2192 Concept", EDGE_TYPES["Thinker \u2192 Concept"]]];
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Edge</h3>
        <p className="modal-subtitle">
          {sourceNode.name} &rarr; {targetNode.name}
        </p>
        <div className="modal-field">
          <label>Relationship Type</label>
          <select value={edgeType} onChange={(e) => setEdgeType(e.target.value)}>
            <option value="" disabled>Select type...</option>
            {validGroups.map(([group, types]) => (
              <optgroup key={group} label={group}>
                {types.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="toolbar-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="toolbar-btn active" disabled={!edgeType} onClick={() => edgeType && onAdd(edgeType)}>
            Add Edge
          </button>
        </div>
      </div>
    </div>
  );
}
