import { useState } from "react";
import type { Classifier, EdgeTypeConfig, GraphNode, NodeLink, NodeTypeConfig } from "../types/graph-ir";
import { TagInput } from "./TagInput";

interface Props {
  nodeTypeConfigs: NodeTypeConfig[];
  classifiers: Classifier[];
  /** Pool of tags already in the graph — used for autocomplete suggestions. */
  existingTags?: string[];
  /** Existing nodes, for the "link to" dropdown. */
  nodes?: GraphNode[];
  /** Edge types defined in the template, for the "link to" dropdown. */
  edgeTypes?: EdgeTypeConfig[];
  /** Pre-select a link target (e.g. the focused node in the textmap). */
  initialLinkTargetId?: string;
  onAdd: (nodeType: string, name: string, classifierValues: Record<string, string>, tags: string[], properties: Record<string, string | undefined>, links: NodeLink[]) => void;
  onCancel: () => void;
  /** Pre-select a specific node type */
  initialNodeType?: string;
}

export function AddNodeModal({ nodeTypeConfigs, classifiers, existingTags = [], nodes = [], edgeTypes = [], initialLinkTargetId, onAdd, onCancel, initialNodeType }: Props) {
  const [selectedType, setSelectedType] = useState(initialNodeType ?? nodeTypeConfigs[0]?.id ?? "");
  const [name, setName] = useState("");
  const [classifierValues, setClassifierValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    classifiers.forEach((cls) => {
      if (cls.values.length > 0) init[cls.id] = cls.values[0].id;
    });
    return init;
  });
  const [tags, setTags] = useState<string[]>([]);
  const config = nodeTypeConfigs.find((t) => t.id === selectedType);

  // "Link to" rows: connect the new node to existing nodes as edges.
  const defaultEdgeType = edgeTypes[0]?.id ?? "";
  const [links, setLinks] = useState<NodeLink[]>(() =>
    initialLinkTargetId && edgeTypes.length > 0
      ? [{ targetId: initialLinkTargetId, edgeType: defaultEdgeType, direction: "out" }]
      : [],
  );
  const addLink = () =>
    setLinks((ls) => [...ls, { targetId: nodes[0]?.id ?? "", edgeType: defaultEdgeType, direction: "out" }]);
  const updateLink = (i: number, patch: Partial<NodeLink>) =>
    setLinks((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLink = (i: number) => setLinks((ls) => ls.filter((_, idx) => idx !== i));
  const canLink = nodes.length > 0 && edgeTypes.length > 0;

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
    const validLinks = links.filter((l) => l.targetId && l.edgeType);
    onAdd(selectedType, name.trim(), classifierValues, tags, props, validLinks);
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
            <TagInput value={tags} existingTags={existingTags} onChange={setTags} />
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
          {/* Link to existing nodes — creates edges with the new node */}
          {canLink && (
            <div className="modal-field">
              <label>Link to</label>
              {links.map((link, i) => (
                <div className="link-row" key={i}>
                  <select
                    className="link-dir"
                    value={link.direction}
                    onChange={(e) => updateLink(i, { direction: e.target.value as NodeLink["direction"] })}
                    title="Direction"
                  >
                    <option value="out">→ to</option>
                    <option value="in">← from</option>
                  </select>
                  <select
                    className="link-target"
                    value={link.targetId}
                    onChange={(e) => updateLink(i, { targetId: e.target.value })}
                  >
                    <option value="">Select node…</option>
                    {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                  <select
                    className="link-type"
                    value={link.edgeType}
                    onChange={(e) => updateLink(i, { edgeType: e.target.value })}
                    title="Relationship"
                  >
                    {edgeTypes.map((et) => <option key={et.id} value={et.id}>{et.label}</option>)}
                  </select>
                  <button type="button" className="link-remove" onClick={() => removeLink(i)} aria-label="Remove link">×</button>
                </div>
              ))}
              <button type="button" className="link-add" onClick={addLink}>+ Add link</button>
            </div>
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
