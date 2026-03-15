import { useState, useEffect, useRef, useCallback } from "react";
import type { GraphEdge } from "../types/graph-ir";

interface Props {
  edge: GraphEdge;
  position: { x: number; y: number };
  onUpdate: (fromId: string, toId: string, updates: Partial<GraphEdge>) => void;
  onClose: () => void;
  edgeTypeLabel?: string;
}

export function EdgePopover({ edge, position, onUpdate, onClose, edgeTypeLabel }: Props) {
  const [weight, setWeight] = useState(edge.weight ?? 1);
  const [note, setNote] = useState(edge.note ?? "");
  const ref = useRef<HTMLDivElement>(null);
  const noteTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid catching the click that opened us
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const handleWeightChange = useCallback((newWeight: number) => {
    setWeight(newWeight);
    onUpdate(edge.from, edge.to, { weight: newWeight });
  }, [edge.from, edge.to, onUpdate]);

  const handleNoteChange = useCallback((value: string) => {
    setNote(value);
    clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(() => {
      onUpdate(edge.from, edge.to, { note: value || undefined });
    }, 500);
  }, [edge.from, edge.to, onUpdate]);

  // Keep popover within viewport
  const left = Math.min(position.x, window.innerWidth - 260);
  const top = Math.min(position.y, window.innerHeight - 200);

  return (
    <div
      ref={ref}
      className="edge-popover"
      style={{ left, top }}
    >
      {edgeTypeLabel && (
        <div className="edge-popover-type">{edgeTypeLabel}</div>
      )}
      <div className="edge-popover-field">
        <label>Weight</label>
        <div className="edge-popover-weight-row">
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.5}
            value={weight}
            onChange={(e) => handleWeightChange(parseFloat(e.target.value))}
          />
          <span className="edge-popover-weight-value">{weight}</span>
        </div>
      </div>
      <div className="edge-popover-field">
        <label>Note</label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Edge note..."
        />
      </div>
    </div>
  );
}
