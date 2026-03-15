import { useState, useEffect, useCallback } from "react";
import type { Stream, Generation, NodeTypeConfig, FieldConfig, EdgeTypeConfig } from "../types/graph-ir";
import { DEFAULT_NODE_TYPES } from "../migration";

const DEFAULT_COLORS = ["#4A90D9", "#50C878", "#FF7F50", "#9B59B6", "#F1C40F", "#E74C3C", "#1ABC9C", "#E67E22"];
const DEFAULT_EDGE_COLORS = ["#888888", "#4A90D9", "#D94A4A", "#50C878", "#9B59B6", "#E67E22", "#F1C40F"];

const DEFAULT_EDGE_TYPES: WizardEdgeType[] = [
  { id: "chain", label: "Chain", color: "#888888", directed: true, style: "solid" },
  { id: "originates", label: "Originates", color: "#4A90D9", directed: true, style: "solid" },
  { id: "develops", label: "Develops", color: "#50C878", directed: true, style: "solid" },
  { id: "rivalry", label: "Rivalry", color: "#D94A4A", directed: false, style: "dashed" },
  { id: "alliance", label: "Alliance", color: "#999999", directed: false, style: "dotted" },
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "stream";
}

interface WizardStream {
  id?: string; // preserve original id for existing streams
  name: string;
  color: string;
  description: string;
}

interface WizardGeneration {
  period: string;
  label: string;
}

interface WizardField {
  key: string;
  label: string;
  required: boolean;
}

interface WizardEdgeType {
  id: string;
  label: string;
  color: string;
  directed: boolean;
  style: string;
}

interface WizardNodeType {
  id: string;
  label: string;
  shape: "circle" | "rectangle";
  icon: string;
  label_overrides: Record<string, string>; // field key → custom label
  collapsed: boolean;
}

export interface TaxonomyWizardResult {
  title: string;
  description?: string;
  streams: Stream[];
  generations: Generation[];
  node_types: NodeTypeConfig[];
  edge_types?: EdgeTypeConfig[];
  stream_label?: string;
  generation_label?: string;
}

/** Optional initial data for edit mode — pre-populates all fields. */
export interface TaxonomyWizardInitial {
  title: string;
  description?: string;
  streams: Stream[];
  generations: Generation[];
  node_types?: NodeTypeConfig[];
  edge_types?: EdgeTypeConfig[];
  stream_label?: string;
  generation_label?: string;
}

interface Props {
  onComplete: (data: TaxonomyWizardResult) => void;
  onCancel: () => void;
  initialData?: TaxonomyWizardInitial;
  onSaveTemplate?: (data: TaxonomyWizardResult) => void;
}

/** Extract shared fields from the union of all node types' fields. */
function deriveSharedFields(configs: NodeTypeConfig[]): WizardField[] {
  const seen = new Map<string, WizardField>();
  for (const config of configs) {
    for (const f of config.fields) {
      if (!seen.has(f.key)) {
        seen.set(f.key, { key: f.key, label: f.label, required: f.required ?? false });
      }
    }
  }
  return [...seen.values()];
}

/** Extract label overrides for a node type relative to shared fields. */
function deriveLabelOverrides(config: NodeTypeConfig, sharedFields: WizardField[]): Record<string, string> {
  const overrides: Record<string, string> = {};
  for (const sf of sharedFields) {
    const typeField = config.fields.find((f) => f.key === sf.key);
    if (typeField && typeField.label !== sf.label) {
      overrides[sf.key] = typeField.label;
    }
  }
  return overrides;
}

function configToWizardNodeTypes(configs: NodeTypeConfig[], sharedFields: WizardField[]): WizardNodeType[] {
  return configs.map((c) => ({
    id: c.id,
    label: c.label,
    shape: c.shape,
    icon: c.icon ?? c.label[0] ?? "?",
    collapsed: false,
    label_overrides: deriveLabelOverrides(c, sharedFields),
  }));
}

const TOTAL_STEPS = 7;

export function TaxonomyWizard({ onComplete, onCancel, initialData, onSaveTemplate }: Props) {
  const isEditMode = !!initialData;
  const [step, setStep] = useState(1);

  // Step 1
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [streamLabel, setStreamLabel] = useState(initialData?.stream_label ?? "Categories");
  const [generationLabel, setGenerationLabel] = useState(initialData?.generation_label ?? "Horizons");

  // Step 2: Shared Fields + Node Types
  const [sharedFields, setSharedFields] = useState<WizardField[]>(() => {
    const source = initialData?.node_types ?? DEFAULT_NODE_TYPES;
    return deriveSharedFields(source);
  });

  const [nodeTypes, setNodeTypes] = useState<WizardNodeType[]>(() => {
    const source = initialData?.node_types ?? DEFAULT_NODE_TYPES;
    const sf = deriveSharedFields(source);
    return configToWizardNodeTypes(source, sf);
  });

  // Step 3: Streams
  const [streams, setStreams] = useState<WizardStream[]>(() => {
    if (initialData?.streams.length) {
      return initialData.streams.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color ?? DEFAULT_COLORS[0],
        description: s.description ?? "",
      }));
    }
    return [{ name: "", color: DEFAULT_COLORS[0], description: "" }];
  });

  // Step 4: Generations
  const [generations, setGenerations] = useState<WizardGeneration[]>(() => {
    if (initialData?.generations.length) {
      return initialData.generations.map((g) => ({
        period: g.period ?? "",
        label: g.label ?? "",
      }));
    }
    return [{ period: "", label: "" }];
  });

  // Step 5: Edge Types
  const [edgeTypes, setEdgeTypes] = useState<WizardEdgeType[]>(() => {
    if (initialData?.edge_types?.length) {
      return initialData.edge_types.map((e) => ({
        id: e.id,
        label: e.label,
        color: e.color ?? DEFAULT_EDGE_COLORS[0],
        directed: e.directed,
        style: e.style ?? "solid",
      }));
    }
    return [...DEFAULT_EDGE_TYPES];
  });

  // Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  // Validation
  const canNext = useCallback(() => {
    if (step === 1) return title.trim().length > 0;
    if (step === 2) return nodeTypes.length > 0 && nodeTypes.every((t) => t.label.trim().length > 0) && sharedFields.length > 0 && sharedFields.every((f) => f.label.trim().length > 0);
    if (step === 3) return streams.every((s) => s.name.trim().length > 0);
    if (step === 4) return generations.length > 0;
    if (step === 5) return edgeTypes.length > 0 && edgeTypes.every((e) => e.label.trim().length > 0);
    return true;
  }, [step, title, nodeTypes, sharedFields, streams, generations, edgeTypes]);

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS && canNext()) setStep(step + 1);
  }, [step, canNext]);

  const handleBack = useCallback(() => {
    if (step > 1) setStep(step - 1);
  }, [step]);

  const [templateSaved, setTemplateSaved] = useState(false);

  const buildNodeTypeConfigs = useCallback((): NodeTypeConfig[] => {
    return nodeTypes.map((nt) => {
      const overrides = nt.label_overrides;
      const hasOverrides = Object.keys(overrides).length > 0;
      return {
        id: nt.id || slugify(nt.label),
        label: nt.label.trim(),
        shape: nt.shape,
        icon: nt.icon || nt.label[0] || "?",
        fields: sharedFields.map((f): FieldConfig => ({
          key: f.key || slugify(f.label),
          label: (overrides[f.key || slugify(f.label)] || f.label).trim(),
          type: "text",
          required: f.required || undefined,
        })),
        label_overrides: hasOverrides ? overrides : undefined,
      };
    });
  }, [nodeTypes, sharedFields]);

  const buildResult = useCallback((): TaxonomyWizardResult => {
    const resultStreams: Stream[] = streams.map((s) => ({
      id: s.id || slugify(s.name),
      name: s.name.trim(),
      color: s.color,
      description: s.description.trim() || undefined,
    }));

    const resultGenerations: Generation[] = generations.map((g, i) => ({
      number: i + 1,
      period: g.period.trim() || undefined,
      label: g.label.trim() || undefined,
    }));

    const resultEdgeTypes: EdgeTypeConfig[] = edgeTypes.map((e) => ({
      id: e.id || slugify(e.label),
      label: e.label.trim(),
      color: e.color,
      directed: e.directed,
      style: e.style,
    }));

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      streams: resultStreams,
      generations: resultGenerations,
      node_types: buildNodeTypeConfigs(),
      edge_types: resultEdgeTypes,
      stream_label: streamLabel.trim() || undefined,
      generation_label: generationLabel.trim() || undefined,
    };
  }, [title, description, streams, generations, edgeTypes, buildNodeTypeConfigs, streamLabel, generationLabel]);

  const handleCreate = useCallback(() => {
    onComplete(buildResult());
  }, [buildResult, onComplete]);

  const handleSaveAsTemplate = useCallback(() => {
    onSaveTemplate?.(buildResult());
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2000);
  }, [buildResult, onSaveTemplate]);

  // Stream helpers
  const addStream = () => {
    setStreams([...streams, { name: "", color: DEFAULT_COLORS[streams.length % DEFAULT_COLORS.length], description: "" }]);
  };
  const removeStream = (i: number) => {
    if (streams.length > 1) setStreams(streams.filter((_, idx) => idx !== i));
  };
  const updateStream = (i: number, field: keyof WizardStream, value: string) => {
    setStreams(streams.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  // Generation helpers
  const addGeneration = () => {
    setGenerations([...generations, { period: "", label: "" }]);
  };
  const removeGeneration = (i: number) => {
    if (generations.length > 1) setGenerations(generations.filter((_, idx) => idx !== i));
  };
  const updateGeneration = (i: number, field: keyof WizardGeneration, value: string) => {
    setGenerations(generations.map((g, idx) => idx === i ? { ...g, [field]: value } : g));
  };

  // Edge type helpers
  const addEdgeType = () => {
    setEdgeTypes([...edgeTypes, { id: "", label: "", color: DEFAULT_EDGE_COLORS[edgeTypes.length % DEFAULT_EDGE_COLORS.length], directed: true, style: "solid" }]);
  };
  const removeEdgeType = (i: number) => {
    if (edgeTypes.length > 1) setEdgeTypes(edgeTypes.filter((_, idx) => idx !== i));
  };
  const updateEdgeType = (i: number, updates: Partial<WizardEdgeType>) => {
    setEdgeTypes(edgeTypes.map((e, idx) => {
      if (idx !== i) return e;
      const updated = { ...e, ...updates };
      if (updates.label !== undefined && !e.id) {
        updated.id = slugify(updates.label);
      }
      return updated;
    }));
  };

  // Shared field helpers
  const addSharedField = () => {
    setSharedFields([...sharedFields, { key: "", label: "", required: false }]);
  };
  const removeSharedField = (i: number) => {
    if (sharedFields.length > 1) {
      const removed = sharedFields[i];
      setSharedFields(sharedFields.filter((_, idx) => idx !== i));
      // Clean up overrides that reference this field
      if (removed.key) {
        setNodeTypes(nodeTypes.map((nt) => {
          const { [removed.key]: _, ...rest } = nt.label_overrides;
          return { ...nt, label_overrides: rest };
        }));
      }
    }
  };
  const updateSharedField = (i: number, updates: Partial<WizardField>) => {
    setSharedFields(sharedFields.map((f, idx) => {
      if (idx !== i) return f;
      const updated = { ...f, ...updates };
      if (updates.label !== undefined && !f.key) {
        updated.key = slugify(updates.label);
      }
      return updated;
    }));
  };

  // Node type helpers
  const addNodeType = () => {
    setNodeTypes([...nodeTypes, {
      id: "",
      label: "",
      shape: "circle",
      icon: "",
      collapsed: false,
      label_overrides: {},
    }]);
  };
  const removeNodeType = (i: number) => {
    if (nodeTypes.length > 1) setNodeTypes(nodeTypes.filter((_, idx) => idx !== i));
  };
  const updateNodeType = (i: number, updates: Partial<WizardNodeType>) => {
    setNodeTypes(nodeTypes.map((nt, idx) => {
      if (idx !== i) return nt;
      const updated = { ...nt, ...updates };
      if (updates.label !== undefined && !nt.id) {
        updated.id = slugify(updates.label);
      }
      return updated;
    }));
  };
  const toggleNodeTypeCollapsed = (i: number) => {
    setNodeTypes(nodeTypes.map((nt, idx) => idx === i ? { ...nt, collapsed: !nt.collapsed } : nt));
  };
  const updateLabelOverride = (typeIdx: number, fieldKey: string, value: string) => {
    const nt = nodeTypes[typeIdx];
    const overrides = { ...nt.label_overrides };
    if (value.trim()) {
      overrides[fieldKey] = value;
    } else {
      delete overrides[fieldKey];
    }
    updateNodeType(typeIdx, { label_overrides: overrides });
  };

  const nextDisabled = !canNext();

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal wizard-modal" onClick={(e) => e.stopPropagation()}>
        {/* Step dots */}
        <div className="wizard-steps">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <span
              key={s}
              className={`wizard-step-dot ${s === step ? "active" : s < step ? "done" : ""}`}
            />
          ))}
        </div>

        <div className="wizard-content">
        {/* Step 1: Title */}
        {step === 1 && (
          <>
            <div className="wizard-step-label">{isEditMode ? "Edit Taxonomy" : "New Taxonomy"}</div>
            <div className="wizard-field">
              <label>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Management Theory"
                autoFocus
              />
            </div>
            <div className="wizard-field">
              <label>Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of this taxonomy..."
              />
            </div>
            <div className="wizard-node-type-row">
              <div className="wizard-field wizard-field-inline">
                <label>Grouping label</label>
                <input
                  type="text"
                  value={streamLabel}
                  onChange={(e) => setStreamLabel(e.target.value)}
                  placeholder="Category"
                />
              </div>
              <div className="wizard-field wizard-field-inline">
                <label>Timeline label</label>
                <input
                  type="text"
                  value={generationLabel}
                  onChange={(e) => setGenerationLabel(e.target.value)}
                  placeholder="Horizon"
                />
              </div>
            </div>
          </>
        )}

        {/* Step 2: Shared Fields + Node Types */}
        {step === 2 && (
          <>
            <div className="wizard-step-label">Define Fields &amp; Node Types</div>

            {/* Section A: Shared Fields */}
            <div className="wizard-section-header">
              <span className="wizard-section-title">Shared Fields</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
                All node types share these fields
              </span>
              <button type="button" className="wizard-add-btn" onClick={addSharedField} style={{ marginLeft: "auto" }}>+ Field</button>
            </div>
            <div className="wizard-shared-fields">
              {sharedFields.map((f, i) => (
                <div key={i} className="wizard-field-row">
                  <input type="text" value={f.label}
                    onChange={(e) => updateSharedField(i, { label: e.target.value })}
                    placeholder="Field label" className="wizard-field-label-input" />
                  <button type="button" className="wizard-remove-btn"
                    onClick={() => removeSharedField(i)}
                    disabled={sharedFields.length <= 1}
                    title="Remove field">&times;</button>
                </div>
              ))}
            </div>

            {/* Section B: Node Types */}
            <div className="wizard-section-header" style={{ marginTop: 16 }}>
              <span className="wizard-section-title">Node Types</span>
              <button type="button" className="wizard-add-btn" onClick={addNodeType} style={{ marginLeft: "auto" }}>+ Add Type</button>
            </div>
            {nodeTypes.map((nt, i) => (
              <div key={i} className="wizard-node-type-card">
                <div className="wizard-node-type-header" onClick={() => toggleNodeTypeCollapsed(i)}>
                  <span className="wizard-node-type-icon">{nt.icon || nt.label?.[0] || "?"}</span>
                  <span className="wizard-node-type-name">{nt.label || "Untitled Type"}</span>
                  <span className="wizard-node-type-shape">{nt.shape}</span>
                  <span className="toggle-icon">{nt.collapsed ? "\u25BC" : "\u25B2"}</span>
                  <button
                    type="button"
                    className="wizard-remove-btn"
                    onClick={(e) => { e.stopPropagation(); removeNodeType(i); }}
                    disabled={nodeTypes.length <= 1}
                    title="Remove type"
                  >
                    &times;
                  </button>
                </div>
                {!nt.collapsed && (
                  <div className="wizard-node-type-body">
                    <div className="wizard-node-type-row">
                      <div className="wizard-field wizard-field-inline">
                        <label>Name</label>
                        <input type="text" value={nt.label}
                          onChange={(e) => updateNodeType(i, { label: e.target.value })}
                          placeholder="e.g. Person" />
                      </div>
                      <div className="wizard-field wizard-field-inline">
                        <label>Shape</label>
                        <select value={nt.shape}
                          onChange={(e) => updateNodeType(i, { shape: e.target.value as "circle" | "rectangle" })}>
                          <option value="circle">Circle</option>
                          <option value="rectangle">Rectangle</option>
                        </select>
                      </div>
                      <div className="wizard-field wizard-field-inline" style={{ maxWidth: 60 }}>
                        <label>Icon</label>
                        <input type="text" value={nt.icon} maxLength={2}
                          onChange={(e) => updateNodeType(i, { icon: e.target.value })}
                          placeholder={nt.label?.[0] ?? "?"} />
                      </div>
                    </div>
                    {/* Label overrides for shared fields */}
                    {sharedFields.length > 0 && (
                      <>
                        <div className="wizard-node-type-fields-header">
                          <span className="wizard-fields-label">Label Overrides</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>blank = use default</span>
                        </div>
                        <div className="wizard-override-table">
                          {sharedFields.map((sf) => {
                            const fieldKey = sf.key || slugify(sf.label);
                            if (!fieldKey) return null;
                            return (
                              <div key={fieldKey} className="wizard-override-row">
                                <span className="wizard-override-default">{sf.label || fieldKey}</span>
                                <input
                                  type="text"
                                  value={nt.label_overrides[fieldKey] ?? ""}
                                  onChange={(e) => updateLabelOverride(i, fieldKey, e.target.value)}
                                  placeholder={sf.label}
                                  className="wizard-override-input"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Step 3: Streams */}
        {step === 3 && (
          <>
            <div className="wizard-step-label">Define {streamLabel || "Categories"}</div>
            <div className="wizard-list-header">
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Categories group related nodes (e.g. disciplines, themes, schools of thought)
              </span>
              <button type="button" className="wizard-add-btn" onClick={addStream}>+ Add</button>
            </div>
            {streams.map((s, i) => (
              <div key={i} className="wizard-stream-row">
                <input
                  type="color"
                  className="wizard-color-input"
                  value={s.color}
                  onChange={(e) => updateStream(i, "color", e.target.value)}
                  title="Category color"
                />
                <input
                  type="text"
                  value={s.name}
                  onChange={(e) => updateStream(i, "name", e.target.value)}
                  placeholder="Category name"
                  autoFocus={i === 0}
                />
                <input
                  type="text"
                  value={s.description}
                  onChange={(e) => updateStream(i, "description", e.target.value)}
                  placeholder="Description (optional)"
                  style={{ flex: 1.5 }}
                />
                <button
                  type="button"
                  className="wizard-remove-btn"
                  onClick={() => removeStream(i)}
                  disabled={streams.length <= 1}
                  title="Remove category"
                >
                  &times;
                </button>
              </div>
            ))}
          </>
        )}

        {/* Step 4: Generations */}
        {step === 4 && (
          <>
            <div className="wizard-step-label">Define {generationLabel || "Horizons"}</div>
            <div className="wizard-list-header">
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Horizons are time periods or phases (e.g. 1950–1970, Founders)
              </span>
              <button type="button" className="wizard-add-btn" onClick={addGeneration}>+ Add</button>
            </div>
            {generations.map((g, i) => (
              <div key={i} className="wizard-gen-row">
                <span className="wizard-gen-number">{i + 1}</span>
                <input
                  type="text"
                  value={g.period}
                  onChange={(e) => updateGeneration(i, "period", e.target.value)}
                  placeholder="Period (e.g. 1960–1980)"
                  autoFocus={i === 0}
                />
                <input
                  type="text"
                  value={g.label}
                  onChange={(e) => updateGeneration(i, "label", e.target.value)}
                  placeholder="Label (e.g. Founders)"
                />
                <button
                  type="button"
                  className="wizard-remove-btn"
                  onClick={() => removeGeneration(i)}
                  disabled={generations.length <= 1}
                  title="Remove horizon"
                >
                  &times;
                </button>
              </div>
            ))}
          </>
        )}

        {/* Step 5: Edge Types */}
        {step === 5 && (
          <>
            <div className="wizard-step-label">Define Edge Types</div>
            <div className="wizard-list-header">
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Define the types of relationships between nodes
              </span>
              <button type="button" className="wizard-add-btn" onClick={addEdgeType}>+ Add</button>
            </div>
            {edgeTypes.map((e, i) => (
              <div key={i} className="wizard-edge-type-row">
                <input
                  type="color"
                  className="wizard-color-input"
                  value={e.color}
                  onChange={(ev) => updateEdgeType(i, { color: ev.target.value })}
                  title="Edge color"
                />
                <input
                  type="text"
                  value={e.label}
                  onChange={(ev) => updateEdgeType(i, { label: ev.target.value })}
                  placeholder="Edge type name"
                  style={{ flex: 1 }}
                />
                <select
                  value={e.style}
                  onChange={(ev) => updateEdgeType(i, { style: ev.target.value })}
                  style={{ width: 80 }}
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
                <label className="wizard-edge-directed-label">
                  <input
                    type="checkbox"
                    checked={e.directed}
                    onChange={(ev) => updateEdgeType(i, { directed: ev.target.checked })}
                  />
                  Directed
                </label>
                <button
                  type="button"
                  className="wizard-remove-btn"
                  onClick={() => removeEdgeType(i)}
                  disabled={edgeTypes.length <= 1}
                  title="Remove edge type"
                >
                  &times;
                </button>
              </div>
            ))}
          </>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <>
            <div className="wizard-step-label">Review</div>
            <div className="wizard-review-section">
              <h4>Title</h4>
              <div className="wizard-review-item">{title}</div>
              {description && (
                <div className="wizard-review-item" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {description}
                </div>
              )}
            </div>
            <div className="wizard-review-section">
              <h4>Shared Fields ({sharedFields.length})</h4>
              {sharedFields.map((f, i) => (
                <div key={i} className="wizard-review-item">
                  {f.label || f.key}
                </div>
              ))}
            </div>
            <div className="wizard-review-section">
              <h4>Node Types ({nodeTypes.length})</h4>
              {nodeTypes.map((nt, i) => {
                const overrideCount = Object.keys(nt.label_overrides).length;
                return (
                  <div key={i} className="wizard-review-item">
                    <span style={{ fontWeight: 600, marginRight: 4 }}>{nt.icon || nt.label?.[0]}</span>
                    {nt.label} ({nt.shape}){overrideCount > 0 ? ` — ${overrideCount} label override${overrideCount > 1 ? "s" : ""}` : ""}
                  </div>
                );
              })}
            </div>
            <div className="wizard-review-section">
              <h4>Categories ({streams.length})</h4>
              {streams.map((s, i) => (
                <div key={i} className="wizard-review-item">
                  <span className="wizard-review-dot" style={{ backgroundColor: s.color }} />
                  {s.name}
                  {s.description && <span style={{ color: "var(--text-dim)", marginLeft: 8, fontSize: 11 }}>— {s.description}</span>}
                </div>
              ))}
            </div>
            <div className="wizard-review-section">
              <h4>Horizons ({generations.length})</h4>
              {generations.map((g, i) => (
                <div key={i} className="wizard-review-item">
                  <span style={{ color: "var(--text-muted)", fontWeight: 600, width: 20 }}>{i + 1}</span>
                  {g.label || "Untitled"}
                  {g.period && <span style={{ color: "var(--text-dim)", marginLeft: 8, fontSize: 11 }}>{g.period}</span>}
                </div>
              ))}
            </div>
            <div className="wizard-review-section">
              <h4>Edge Types ({edgeTypes.length})</h4>
              {edgeTypes.map((e, i) => (
                <div key={i} className="wizard-review-item">
                  <span className="wizard-review-dot" style={{ backgroundColor: e.color }} />
                  {e.label} — {e.style}{e.directed ? ", directed" : ""}
                </div>
              ))}
            </div>
            {onSaveTemplate && (
              <button
                type="button"
                className="wizard-template-btn"
                onClick={handleSaveAsTemplate}
              >
                {templateSaved ? "Saved!" : "Save as Template"}
              </button>
            )}
          </>
        )}

        {/* Step 7: Create */}
        {step === 7 && (
          <>
            <div className="wizard-step-label">{isEditMode ? "Save Changes" : "Create Taxonomy"}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
              Ready to {isEditMode ? "save" : "create"} your taxonomy with {nodeTypes.length} node type{nodeTypes.length > 1 ? "s" : ""}, {sharedFields.length} shared field{sharedFields.length > 1 ? "s" : ""}, {streams.length} categor{streams.length > 1 ? "ies" : "y"}, and {generations.length} horizon{generations.length > 1 ? "s" : ""}.
            </div>
          </>
        )}

        </div>{/* end wizard-content */}

        {/* Navigation */}
        <div className="wizard-nav">
          <button type="button" className="wizard-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <div className="wizard-nav-right">
            {step > 1 && (
              <button type="button" className="wizard-back-btn" onClick={handleBack}>
                Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className={`wizard-next-btn${nextDisabled ? " disabled" : ""}`}
                onClick={handleNext}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="wizard-next-btn"
                onClick={handleCreate}
              >
                {isEditMode ? "Save" : "Create"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
