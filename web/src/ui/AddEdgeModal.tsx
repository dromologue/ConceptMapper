import { useState } from "react";
import type { GraphNode, EdgeTypeConfig } from "../types/graph-ir";

interface Props {
  sourceNode: GraphNode;
  targetNode: GraphNode;
  onAdd: (edgeType: string, weight: number) => void;
  onCancel: () => void;
  edgeTypeConfigs?: EdgeTypeConfig[];
}

const DEFAULT_EDGE_TYPES = [
  { value: "chain", label: "Chain" },
  { value: "originates", label: "Originates" },
  { value: "develops", label: "Develops" },
  { value: "rivalry", label: "Rivalry" },
  { value: "alliance", label: "Alliance" },
  { value: "synthesis", label: "Synthesis" },
  { value: "extends", label: "Extends" },
  { value: "opposes", label: "Opposes" },
  { value: "subsumes", label: "Subsumes" },
  { value: "enables", label: "Enables" },
  { value: "reframes", label: "Reframes" },
  { value: "contests", label: "Contests" },
  { value: "applies", label: "Applies" },
  { value: "teacher_pupil", label: "Teacher \u2192 Pupil" },
  { value: "institutional", label: "Institutional" },
];

export function AddEdgeModal({ sourceNode, targetNode, onAdd, onCancel, edgeTypeConfigs }: Props) {
  const [edgeType, setEdgeType] = useState("");
  const [weight, setWeight] = useState(1.0);

  const edgeOptions = edgeTypeConfigs && edgeTypeConfigs.length > 0
    ? edgeTypeConfigs.map((e) => ({ value: e.id, label: e.label }))
    : DEFAULT_EDGE_TYPES;

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
            {edgeOptions.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="modal-field">
          <label>Weight / Thickness: {weight.toFixed(1)}</label>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.5"
            value={weight}
            onChange={(e) => setWeight(parseFloat(e.target.value))}
            className="settings-slider"
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="toolbar-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="toolbar-btn active" disabled={!edgeType} onClick={() => edgeType && onAdd(edgeType, weight)}>
            Add Edge
          </button>
        </div>
      </div>
    </div>
  );
}
