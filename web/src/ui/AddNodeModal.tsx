import { useState } from "react";
import type { Stream, Generation } from "../types/graph-ir";

interface Props {
  type: "thinker" | "concept";
  streams: Stream[];
  generations: Generation[];
  onAdd?: (name: string, stream: string, eminence: string, generation: number) => void;
  onAddConcept?: (name: string, stream: string, conceptType: string, abstractionLevel: string, generation: number) => void;
  onCancel: () => void;
}

export function AddNodeModal({ type, streams, generations, onAdd, onAddConcept, onCancel }: Props) {
  const [name, setName] = useState("");
  const [stream, setStream] = useState(streams[0]?.id ?? "");
  const [generation, setGeneration] = useState(generations[0]?.number ?? 1);
  const [eminence, setEminence] = useState("secondary");
  const [conceptType, setConceptType] = useState("framework");
  const [abstractionLevel, setAbstractionLevel] = useState("theoretical");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (type === "thinker" && onAdd) {
      onAdd(name.trim(), stream, eminence, generation);
    } else if (type === "concept" && onAddConcept) {
      onAddConcept(name.trim(), stream, conceptType, abstractionLevel, generation);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add {type === "thinker" ? "Thinker" : "Concept"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="modal-field">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder={type === "thinker" ? "e.g. Herbert Simon" : "e.g. Bounded Rationality"} />
          </div>
          <div className="modal-field">
            <label>Stream</label>
            <select value={stream} onChange={(e) => setStream(e.target.value)}>
              {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="modal-field">
            <label>Generation</label>
            <select value={generation} onChange={(e) => setGeneration(Number(e.target.value))}>
              {generations.map((g) => <option key={g.number} value={g.number}>Gen {g.number}: {g.label ?? g.period ?? ""}</option>)}
            </select>
          </div>
          {type === "thinker" && (
            <div className="modal-field">
              <label>Eminence</label>
              <select value={eminence} onChange={(e) => setEminence(e.target.value)}>
                <option value="dominant">Dominant</option>
                <option value="major">Major</option>
                <option value="secondary">Secondary</option>
                <option value="minor">Minor</option>
              </select>
            </div>
          )}
          {type === "concept" && (
            <>
              <div className="modal-field">
                <label>Concept Type</label>
                <select value={conceptType} onChange={(e) => setConceptType(e.target.value)}>
                  <option value="framework">Framework</option>
                  <option value="principle">Principle</option>
                  <option value="distinction">Distinction</option>
                  <option value="mechanism">Mechanism</option>
                  <option value="prescription">Prescription</option>
                  <option value="synthesis">Synthesis</option>
                </select>
              </div>
              <div className="modal-field">
                <label>Abstraction Level</label>
                <select value={abstractionLevel} onChange={(e) => setAbstractionLevel(e.target.value)}>
                  <option value="concrete">Concrete</option>
                  <option value="operational">Operational</option>
                  <option value="theoretical">Theoretical</option>
                  <option value="meta-theoretical">Meta-theoretical</option>
                </select>
              </div>
            </>
          )}
          <div className="modal-actions">
            <button type="button" className="toolbar-btn" onClick={onCancel}>Cancel</button>
            <button type="submit" className="toolbar-btn active" disabled={!name.trim()}>Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}
