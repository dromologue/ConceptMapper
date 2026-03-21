import { useState, useEffect, useRef, useCallback } from "react";
import type { GraphEdge } from "../types/graph-ir";

interface Props {
  edge: GraphEdge;
  position: { x: number; y: number };
  onUpdate: (fromId: string, toId: string, updates: Partial<GraphEdge>) => void;
  onClose: () => void;
  onDelete?: (fromId: string, toId: string) => void;
  edgeTypeLabel?: string;
}

export function EdgePopover({ edge, position, onUpdate, onClose, onDelete, edgeTypeLabel }: Props) {
  const [weight, setWeight] = useState(edge.weight ?? 1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        // Don't close if clicking inside the notes pane (edge notes editor)
        const notesPane = document.querySelector(".notes-pane");
        if (notesPane && notesPane.contains(target)) return;
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  const handleWeightChange = useCallback((newWeight: number) => {
    setWeight(newWeight);
    onUpdate(edge.from, edge.to, { weight: newWeight });
  }, [edge.from, edge.to, onUpdate]);

  const left = Math.min(position.x, window.innerWidth - 240);
  const top = Math.min(position.y, window.innerHeight - 120);

  return (
    <div ref={ref} className="edge-popover" style={{ left, top }}>
      {edgeTypeLabel && (
        <div className="edge-popover-type">{edgeTypeLabel}</div>
      )}
      <div className="edge-popover-field">
        <label>Weight</label>
        <div className="edge-popover-weight-row">
          <input
            type="range" min={0.5} max={4} step={0.5}
            value={weight}
            onChange={(e) => handleWeightChange(parseFloat(e.target.value))}
          />
          <span className="edge-popover-weight-value">{weight}</span>
        </div>
      </div>
      {onDelete && (
        <button
          className="edge-popover-delete"
          onClick={() => { if (window.confirm("Delete this edge?")) onDelete(edge.from, edge.to); }}
        >
          Delete Edge
        </button>
      )}
    </div>
  );
}
