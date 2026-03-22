import { useState } from "react";
import type { Classifier, NodeTypeConfig } from "../types/graph-ir";

interface Props {
  nodeTypeConfigs: NodeTypeConfig[];
  classifiers: Classifier[];
  onAdd: (nodeType: string, name: string, classifierValues: Record<string, string>, tags: string[], properties: Record<string, string | undefined>) => void;
  onCancel: () => void;
  /** Pre-select a specific node type */
  initialNodeType?: string;
}

export function AddNodeModal({ nodeTypeConfigs, classifiers, onAdd, onCancel, initialNodeType }: Props) {
  const [selectedType, setSelectedType] = useState(initialNodeType ?? nodeTypeConfigs[0]?.id ?? "");
  const [name, setName] = useState("");
  const [classifierValues, setClassifierValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    classifiers.forEach((cls) => {
      if (cls.values.length > 0) init[cls.id] = cls.values[0].id;
    });
    return init;
  });
  const [tagsInput, setTagsInput] = useState("");
  const config = nodeTypeConfigs.find((t) => t.id === selectedType);

  // Initialize properties with default values from select fields
  const [properties, setProperties] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const cfg = nodeTypeConfigs.find((t) => t.id === (initialNodeType ?? nodeTypeConfigs[0]?.id));
    cfg?.fields.forEach((f) => {
      if (f.type === "select" && f.options?.length) {
        initial[f.key] = f.options[0];
      }
    });
    return initial;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !config) return;
    const props: Record<string, string | undefined> = {};
    for (const field of config.fields) {
      const val = properties[field.key];
      if (val) props[field.key] = val;
    }
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    onAdd(selectedType, name.trim(), classifierValues, tags, props);
  };

  const updateProp = (key: string, value: string) => {
    setProperties({ ...properties, [key]: value });
  };

  // Reset properties when type changes — initialize select defaults
  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId);
    const cfg = nodeTypeConfigs.find((t) => t.id === typeId);
    const initial: Record<string, string> = {};
    cfg?.fields.forEach((f) => {
      if (f.type === "select" && f.options?.length) {
        initial[f.key] = f.options[0];
      }
    });
    setProperties(initial);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add Node</h3>
        <form onSubmit={handleSubmit}>
          {/* Node type selector */}
          {nodeTypeConfigs.length > 1 && (
            <div className="modal-field">
              <label>Type</label>
              <select value={selectedType} onChange={(e) => handleTypeChange(e.target.value)}>
                {nodeTypeConfigs.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          )}
          <div className="modal-field">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder={config?.label ? `e.g. New ${config.label}` : "Name"}
            />
          </div>
          {classifiers.map((cls) => (
            <div className="modal-field" key={cls.id}>
              <label>{cls.label}</label>
              <select
                value={classifierValues[cls.id] ?? ""}
                onChange={(e) => setClassifierValues((prev) => ({ ...prev, [cls.id]: e.target.value }))}
              >
                {cls.values.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
          ))}
          <div className="modal-field">
            <label>Tags</label>
            <input
              type="text"
              placeholder="tag1, tag2, tag3"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>
          {/* Config-driven required fields */}
          {config?.fields.filter((f) => f.required || f.type === "select").map((field) => (
            <div className="modal-field" key={field.key}>
              <label>{field.label}</label>
              {field.type === "select" && field.options ? (
                <select
                  value={properties[field.key] ?? field.options[0] ?? ""}
                  onChange={(e) => updateProp(field.key, e.target.value)}
                >
                  {field.options.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={properties[field.key] ?? ""}
                  onChange={(e) => updateProp(field.key, e.target.value)}
                  placeholder={field.label}
                />
              )}
            </div>
          ))}
          <div className="modal-actions">
            <button type="button" className="toolbar-btn" onClick={onCancel}>Cancel</button>
            <button type="submit" className="toolbar-btn active" disabled={!name.trim()}>Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}
