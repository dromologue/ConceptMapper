import { useState, useEffect, useCallback, useMemo } from "react";
import type { Stream, Generation, NodeTypeConfig, FieldConfig, EdgeTypeConfig, FieldType } from "../types/graph-ir";

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
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "item";
}

// --- Wizard internal types ---

interface WizardStream {
  id?: string;
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
  type: FieldType;
  options?: string[];
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
  fields: WizardField[];
  size_field?: string;
  size_map?: Record<string, number>;
  collapsed: boolean;
}

// --- Public types ---

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

function configsToWizardNodeTypes(configs: NodeTypeConfig[]): WizardNodeType[] {
  return configs.map((c) => ({
    id: c.id,
    label: c.label,
    shape: c.shape,
    icon: c.icon ?? c.label[0] ?? "?",
    fields: c.fields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      options: f.options ? [...f.options] : undefined,
      required: f.required ?? false,
    })),
    size_field: c.size_field,
    size_map: c.size_map ? { ...c.size_map } : undefined,
    collapsed: false,
  }));
}

// --- Step IDs (dynamic) ---
type StepId = "dimensions" | "title" | "node_types" | "streams" | "generations" | "edges" | "review" | "create";

export function TaxonomyWizard({ onComplete, onCancel, initialData, onSaveTemplate }: Props) {
  const isEditMode = !!initialData;

  // Step 1: Dimensions (which axes to use)
  const [streamsEnabled, setStreamsEnabled] = useState(() =>
    initialData ? initialData.streams.length > 0 : true
  );
  const [generationsEnabled, setGenerationsEnabled] = useState(() =>
    initialData ? initialData.generations.length > 0 : true
  );
  const [streamLabel, setStreamLabel] = useState(initialData?.stream_label ?? "Categories");
  const [generationLabel, setGenerationLabel] = useState(initialData?.generation_label ?? "Phases");

  // Step 2: Title
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");

  // Step 3: Node Types
  const [nodeTypes, setNodeTypes] = useState<WizardNodeType[]>(() => {
    if (initialData?.node_types?.length) {
      return configsToWizardNodeTypes(initialData.node_types);
    }
    return [{
      id: "node",
      label: "Node",
      shape: "circle",
      icon: "N",
      fields: [],
      collapsed: false,
    }];
  });

  // Step 4 (optional): Streams
  const [streams, setStreams] = useState<WizardStream[]>(() => {
    if (initialData?.streams.length) {
      return initialData.streams.map((s) => ({
        id: s.id, name: s.name, color: s.color ?? DEFAULT_COLORS[0], description: s.description ?? "",
      }));
    }
    return [{ name: "", color: DEFAULT_COLORS[0], description: "" }];
  });

  // Step 5 (optional): Generations
  const [generations, setGenerations] = useState<WizardGeneration[]>(() => {
    if (initialData?.generations.length) {
      return initialData.generations.map((g) => ({ period: g.period ?? "", label: g.label ?? "" }));
    }
    return [{ period: "", label: "" }];
  });

  // Edge Types
  const [edgeTypes, setEdgeTypes] = useState<WizardEdgeType[]>(() => {
    if (initialData?.edge_types?.length) {
      return initialData.edge_types.map((e) => ({
        id: e.id, label: e.label, color: e.color ?? DEFAULT_EDGE_COLORS[0],
        directed: e.directed, style: e.style ?? "solid",
      }));
    }
    return [...DEFAULT_EDGE_TYPES];
  });

  // Compute dynamic step sequence
  const steps = useMemo((): StepId[] => {
    const s: StepId[] = ["dimensions", "title", "node_types"];
    if (streamsEnabled) s.push("streams");
    if (generationsEnabled) s.push("generations");
    s.push("edges", "review", "create");
    return s;
  }, [streamsEnabled, generationsEnabled]);

  const [stepIdx, setStepIdx] = useState(0);
  const currentStep = steps[stepIdx] ?? "dimensions";
  const totalSteps = steps.length;

  // Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  // Clamp stepIdx if steps shrink (user disables a dimension while past it)
  useEffect(() => {
    if (stepIdx >= steps.length) setStepIdx(steps.length - 1);
  }, [steps.length, stepIdx]);

  // Validation per step
  const canNext = useCallback(() => {
    switch (currentStep) {
      case "dimensions": return true; // always valid
      case "title": return title.trim().length > 0;
      case "node_types": return nodeTypes.length > 0 && nodeTypes.every((t) => t.label.trim().length > 0);
      case "streams": return streams.every((s) => s.name.trim().length > 0);
      case "generations": return generations.length > 0;
      case "edges": return edgeTypes.length > 0 && edgeTypes.every((e) => e.label.trim().length > 0);
      default: return true;
    }
  }, [currentStep, title, nodeTypes, streams, generations, edgeTypes]);

  const handleNext = useCallback(() => {
    if (stepIdx < totalSteps - 1 && canNext()) setStepIdx(stepIdx + 1);
  }, [stepIdx, totalSteps, canNext]);

  const handleBack = useCallback(() => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  }, [stepIdx]);

  const [templateSaved, setTemplateSaved] = useState(false);

  // --- Build result ---

  const buildNodeTypeConfigs = useCallback((): NodeTypeConfig[] => {
    return nodeTypes.map((nt) => ({
      id: nt.id || slugify(nt.label),
      label: nt.label.trim(),
      shape: nt.shape,
      icon: nt.icon || nt.label[0] || "?",
      size_field: nt.size_field || undefined,
      size_map: nt.size_map && Object.keys(nt.size_map).length > 0 ? nt.size_map : undefined,
      fields: nt.fields.map((f): FieldConfig => ({
        key: f.key || slugify(f.label),
        label: f.label.trim(),
        type: f.type,
        options: f.type === "select" && f.options?.length ? f.options : undefined,
        required: f.required || undefined,
      })),
    }));
  }, [nodeTypes]);

  const buildResult = useCallback((): TaxonomyWizardResult => {
    const resultStreams: Stream[] = streamsEnabled
      ? streams.map((s) => ({
          id: s.id || slugify(s.name), name: s.name.trim(), color: s.color,
          description: s.description.trim() || undefined,
        }))
      : [];

    const resultGenerations: Generation[] = generationsEnabled
      ? generations.map((g, i) => ({
          number: i + 1, period: g.period.trim() || undefined, label: g.label.trim() || undefined,
        }))
      : [];

    const resultEdgeTypes: EdgeTypeConfig[] = edgeTypes.map((e) => ({
      id: e.id || slugify(e.label), label: e.label.trim(), color: e.color,
      directed: e.directed, style: e.style,
    }));

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      streams: resultStreams,
      generations: resultGenerations,
      node_types: buildNodeTypeConfigs(),
      edge_types: resultEdgeTypes,
      stream_label: streamsEnabled ? streamLabel.trim() || undefined : undefined,
      generation_label: generationsEnabled ? generationLabel.trim() || undefined : undefined,
    };
  }, [title, description, streams, generations, edgeTypes, buildNodeTypeConfigs,
      streamLabel, generationLabel, streamsEnabled, generationsEnabled]);

  const handleCreate = useCallback(() => { onComplete(buildResult()); }, [buildResult, onComplete]);

  const handleSaveAsTemplate = useCallback(() => {
    onSaveTemplate?.(buildResult());
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2000);
  }, [buildResult, onSaveTemplate]);

  // --- Helpers for streams, generations, edges, node types ---

  const addStream = () => { setStreams([...streams, { name: "", color: DEFAULT_COLORS[streams.length % DEFAULT_COLORS.length], description: "" }]); };
  const removeStream = (i: number) => { if (streams.length > 1) setStreams(streams.filter((_, idx) => idx !== i)); };
  const updateStream = (i: number, field: keyof WizardStream, value: string) => {
    setStreams(streams.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const addGeneration = () => { setGenerations([...generations, { period: "", label: "" }]); };
  const removeGeneration = (i: number) => { if (generations.length > 1) setGenerations(generations.filter((_, idx) => idx !== i)); };
  const updateGeneration = (i: number, field: keyof WizardGeneration, value: string) => {
    setGenerations(generations.map((g, idx) => idx === i ? { ...g, [field]: value } : g));
  };

  const addEdgeType = () => { setEdgeTypes([...edgeTypes, { id: "", label: "", color: DEFAULT_EDGE_COLORS[edgeTypes.length % DEFAULT_EDGE_COLORS.length], directed: true, style: "solid" }]); };
  const removeEdgeType = (i: number) => { if (edgeTypes.length > 1) setEdgeTypes(edgeTypes.filter((_, idx) => idx !== i)); };
  const updateEdgeType = (i: number, updates: Partial<WizardEdgeType>) => {
    setEdgeTypes(edgeTypes.map((e, idx) => {
      if (idx !== i) return e;
      const updated = { ...e, ...updates };
      if (updates.label !== undefined && !e.id) updated.id = slugify(updates.label);
      return updated;
    }));
  };

  const addNodeType = () => { setNodeTypes([...nodeTypes, { id: "", label: "", shape: "circle", icon: "", fields: [], collapsed: false }]); };
  const removeNodeType = (i: number) => { if (nodeTypes.length > 1) setNodeTypes(nodeTypes.filter((_, idx) => idx !== i)); };
  const updateNodeType = (i: number, updates: Partial<WizardNodeType>) => {
    setNodeTypes(nodeTypes.map((nt, idx) => {
      if (idx !== i) return nt;
      const updated = { ...nt, ...updates };
      if (updates.label !== undefined && !nt.id) updated.id = slugify(updates.label);
      return updated;
    }));
  };
  const toggleNodeTypeCollapsed = (i: number) => {
    setNodeTypes(nodeTypes.map((nt, idx) => idx === i ? { ...nt, collapsed: !nt.collapsed } : nt));
  };

  // Per-node-type field helpers
  const addFieldToType = (typeIdx: number) => {
    const nt = nodeTypes[typeIdx];
    updateNodeType(typeIdx, { fields: [...nt.fields, { key: "", label: "", type: "text", required: false }] });
  };
  const removeFieldFromType = (typeIdx: number, fieldIdx: number) => {
    const nt = nodeTypes[typeIdx];
    const removed = nt.fields[fieldIdx];
    const newFields = nt.fields.filter((_, idx) => idx !== fieldIdx);
    const updates: Partial<WizardNodeType> = { fields: newFields };
    if (removed.key && nt.size_field === removed.key) {
      updates.size_field = undefined;
      updates.size_map = undefined;
    }
    updateNodeType(typeIdx, updates);
  };
  const updateFieldInType = (typeIdx: number, fieldIdx: number, updates: Partial<WizardField>) => {
    const nt = nodeTypes[typeIdx];
    const newFields = nt.fields.map((f, idx) => {
      if (idx !== fieldIdx) return f;
      const updated = { ...f, ...updates };
      if (updates.label !== undefined && !f.key) updated.key = slugify(updates.label);
      if (updates.type !== undefined && updates.type !== "select") updated.options = undefined;
      return updated;
    });
    updateNodeType(typeIdx, { fields: newFields });
  };

  const setSizeField = (typeIdx: number, fieldKey: string) => {
    const nt = nodeTypes[typeIdx];
    if (!fieldKey) { updateNodeType(typeIdx, { size_field: undefined, size_map: undefined }); return; }
    const field = nt.fields.find((f) => (f.key || slugify(f.label)) === fieldKey);
    let sizeMap: Record<string, number> | undefined;
    if (field?.type === "select" && field.options?.length) {
      sizeMap = {};
      const sizes = [20, 14, 10, 6];
      field.options.forEach((opt, i) => { sizeMap![opt] = sizes[Math.min(i, sizes.length - 1)]; });
    }
    updateNodeType(typeIdx, { size_field: fieldKey, size_map: sizeMap });
  };
  const updateSizeMapValue = (typeIdx: number, optionKey: string, radius: number) => {
    const nt = nodeTypes[typeIdx];
    updateNodeType(typeIdx, { size_map: { ...(nt.size_map ?? {}), [optionKey]: radius } });
  };

  const nextDisabled = !canNext();

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal wizard-modal" onClick={(e) => e.stopPropagation()}>
        {/* Step dots */}
        <div className="wizard-steps">
          {steps.map((_, i) => (
            <span key={i} className={`wizard-step-dot ${i === stepIdx ? "active" : i < stepIdx ? "done" : ""}`} />
          ))}
        </div>

        <div className="wizard-content">

        {/* --- Step: Dimensions --- */}
        {currentStep === "dimensions" && (
          <>
            <div className="wizard-step-label">What do you want to map?</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Choose which dimensions your visualisation uses. Each enabled dimension becomes a layout axis.
            </div>

            {/* Nodes — always on */}
            <div className="wizard-dimension-row">
              <input type="checkbox" checked disabled className="wizard-dimension-toggle" />
              <span className="wizard-dimension-fixed">Things (nodes)</span>
              <span className="wizard-dimension-desc">always on</span>
            </div>

            {/* Grouping / Streams */}
            <div className={`wizard-dimension-row${!streamsEnabled ? " disabled" : ""}`}>
              <input
                type="checkbox"
                checked={streamsEnabled}
                onChange={(e) => setStreamsEnabled(e.target.checked)}
                className="wizard-dimension-toggle"
              />
              <input
                type="text"
                className="wizard-dimension-label"
                value={streamLabel}
                onChange={(e) => setStreamLabel(e.target.value)}
                placeholder="e.g. Categories, Domains, Streams"
                disabled={!streamsEnabled}
              />
              <span className="wizard-dimension-desc">x-axis grouping</span>
            </div>

            {/* Timeline / Generations */}
            <div className={`wizard-dimension-row${!generationsEnabled ? " disabled" : ""}`}>
              <input
                type="checkbox"
                checked={generationsEnabled}
                onChange={(e) => setGenerationsEnabled(e.target.checked)}
                className="wizard-dimension-toggle"
              />
              <input
                type="text"
                className="wizard-dimension-label"
                value={generationLabel}
                onChange={(e) => setGenerationLabel(e.target.value)}
                placeholder="e.g. Phases, Generations, Horizons"
                disabled={!generationsEnabled}
              />
              <span className="wizard-dimension-desc">y-axis ordering</span>
            </div>
          </>
        )}

        {/* --- Step: Title --- */}
        {currentStep === "title" && (
          <>
            <div className="wizard-step-label">{isEditMode ? "Edit Taxonomy" : "Name Your Taxonomy"}</div>
            <div className="wizard-field">
              <label>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Management Theory" autoFocus />
            </div>
            <div className="wizard-field">
              <label>Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of this taxonomy..." />
            </div>
          </>
        )}

        {/* --- Step: Node Types & Fields --- */}
        {currentStep === "node_types" && (
          <>
            <div className="wizard-step-label">Define Node Types &amp; Fields</div>
            <div className="wizard-section-header">
              <span className="wizard-section-title">Node Types</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>
                Each type has its own attributes
              </span>
              <button type="button" className="wizard-add-btn" onClick={addNodeType} style={{ marginLeft: "auto" }}>+ Add Type</button>
            </div>
            {nodeTypes.map((nt, i) => (
              <div key={i} className="wizard-node-type-card">
                <div className="wizard-node-type-header" onClick={() => toggleNodeTypeCollapsed(i)}>
                  <span className="wizard-node-type-icon">{nt.icon || nt.label?.[0] || "?"}</span>
                  <span className="wizard-node-type-name">{nt.label || "Untitled Type"}</span>
                  <span className="wizard-node-type-shape">{nt.shape}</span>
                  <span className="toggle-icon">{nt.collapsed ? "\u25BC" : "\u25B2"}</span>
                  <button type="button" className="wizard-remove-btn"
                    onClick={(e) => { e.stopPropagation(); removeNodeType(i); }}
                    disabled={nodeTypes.length <= 1} title="Remove type">&times;</button>
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

                    {/* Per-type fields */}
                    <div className="wizard-node-type-fields-header">
                      <span className="wizard-fields-label">Attributes</span>
                      <button type="button" className="wizard-add-btn" onClick={() => addFieldToType(i)} style={{ marginLeft: "auto" }}>+ Field</button>
                    </div>
                    {nt.fields.length === 0 && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 0" }}>
                        No attributes defined. Click + Field to add.
                      </div>
                    )}
                    {nt.fields.map((f, fi) => (
                      <div key={fi} className="wizard-field-row" style={{ alignItems: "center" }}>
                        <input type="text" value={f.label}
                          onChange={(e) => updateFieldInType(i, fi, { label: e.target.value })}
                          placeholder="Field label" className="wizard-field-label-input" />
                        <select value={f.type} onChange={(e) => updateFieldInType(i, fi, { type: e.target.value as FieldType })}
                          style={{ width: 90, fontSize: 12 }}>
                          <option value="text">Text</option>
                          <option value="select">Select</option>
                          <option value="textarea">Textarea</option>
                        </select>
                        {f.type === "select" && (
                          <input type="text"
                            value={f.options?.join(", ") ?? ""}
                            onChange={(e) => updateFieldInType(i, fi, {
                              options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                            })}
                            placeholder="option1, option2, ..."
                            style={{ flex: 1, fontSize: 11 }}
                            title="Comma-separated options" />
                        )}
                        <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 2, whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                          <input type="checkbox" checked={f.required}
                            onChange={(e) => updateFieldInType(i, fi, { required: e.target.checked })} />
                          Req
                        </label>
                        <button type="button" className="wizard-remove-btn"
                          onClick={() => removeFieldFromType(i, fi)} title="Remove field">&times;</button>
                      </div>
                    ))}

                    {/* Size field picker */}
                    {nt.fields.length > 0 && (
                      <>
                        <div className="wizard-node-type-fields-header" style={{ marginTop: 8 }}>
                          <span className="wizard-fields-label">Size Driver</span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>field that controls node size</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <select value={nt.size_field ?? ""} onChange={(e) => setSizeField(i, e.target.value)}
                            style={{ fontSize: 12 }}>
                            <option value="">None</option>
                            {nt.fields.map((f) => {
                              const fk = f.key || slugify(f.label);
                              return fk ? <option key={fk} value={fk}>{f.label || fk}</option> : null;
                            })}
                          </select>
                        </div>
                      </>
                    )}

                    {/* Size map editor */}
                    {nt.size_field && nt.size_map && (() => {
                      const sizeField = nt.fields.find((f) => (f.key || slugify(f.label)) === nt.size_field);
                      if (!sizeField || sizeField.type !== "select" || !sizeField.options?.length) return null;
                      return (
                        <div className="wizard-override-table" style={{ marginBottom: 4 }}>
                          {sizeField.options.map((opt) => (
                            <div key={opt} className="wizard-override-row">
                              <span className="wizard-override-default" style={{ fontSize: 11 }}>{opt}</span>
                              <input type="number" min={2} max={40}
                                value={nt.size_map?.[opt] ?? 10}
                                onChange={(e) => updateSizeMapValue(i, opt, Number(e.target.value) || 10)}
                                style={{ width: 50, fontSize: 11 }} />
                              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>px</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* --- Step: Streams / Grouping --- */}
        {currentStep === "streams" && (
          <>
            <div className="wizard-step-label">Define {streamLabel || "Categories"}</div>
            <div className="wizard-list-header">
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {streamLabel || "Categories"} group related nodes along the x-axis
              </span>
              <button type="button" className="wizard-add-btn" onClick={addStream}>+ Add</button>
            </div>
            {streams.map((s, i) => (
              <div key={i} className="wizard-stream-row">
                <input type="color" className="wizard-color-input" value={s.color}
                  onChange={(e) => updateStream(i, "color", e.target.value)} title="Color" />
                <input type="text" value={s.name}
                  onChange={(e) => updateStream(i, "name", e.target.value)}
                  placeholder="Name" autoFocus={i === 0} />
                <input type="text" value={s.description}
                  onChange={(e) => updateStream(i, "description", e.target.value)}
                  placeholder="Description (optional)" style={{ flex: 1.5 }} />
                <button type="button" className="wizard-remove-btn"
                  onClick={() => removeStream(i)} disabled={streams.length <= 1}
                  title="Remove">&times;</button>
              </div>
            ))}
          </>
        )}

        {/* --- Step: Generations / Timeline --- */}
        {currentStep === "generations" && (
          <>
            <div className="wizard-step-label">Define {generationLabel || "Phases"}</div>
            <div className="wizard-list-header">
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {generationLabel || "Phases"} order nodes along the y-axis
              </span>
              <button type="button" className="wizard-add-btn" onClick={addGeneration}>+ Add</button>
            </div>
            {generations.map((g, i) => (
              <div key={i} className="wizard-gen-row">
                <span className="wizard-gen-number">{i + 1}</span>
                <input type="text" value={g.period}
                  onChange={(e) => updateGeneration(i, "period", e.target.value)}
                  placeholder="Period (e.g. 1960–1980)" autoFocus={i === 0} />
                <input type="text" value={g.label}
                  onChange={(e) => updateGeneration(i, "label", e.target.value)}
                  placeholder="Label (e.g. Founders)" />
                <button type="button" className="wizard-remove-btn"
                  onClick={() => removeGeneration(i)} disabled={generations.length <= 1}
                  title="Remove">&times;</button>
              </div>
            ))}
          </>
        )}

        {/* --- Step: Edge Types --- */}
        {currentStep === "edges" && (
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
                <input type="color" className="wizard-color-input" value={e.color}
                  onChange={(ev) => updateEdgeType(i, { color: ev.target.value })} title="Edge color" />
                <input type="text" value={e.label}
                  onChange={(ev) => updateEdgeType(i, { label: ev.target.value })}
                  placeholder="Edge type name" style={{ flex: 1 }} />
                <select value={e.style} onChange={(ev) => updateEdgeType(i, { style: ev.target.value })}
                  style={{ width: 80 }}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
                <label className="wizard-edge-directed-label">
                  <input type="checkbox" checked={e.directed}
                    onChange={(ev) => updateEdgeType(i, { directed: ev.target.checked })} />
                  Directed
                </label>
                <button type="button" className="wizard-remove-btn"
                  onClick={() => removeEdgeType(i)} disabled={edgeTypes.length <= 1}
                  title="Remove">&times;</button>
              </div>
            ))}
          </>
        )}

        {/* --- Step: Review --- */}
        {currentStep === "review" && (
          <>
            <div className="wizard-step-label">Review</div>
            <div className="wizard-review-section">
              <h4>Title</h4>
              <div className="wizard-review-item">{title}</div>
              {description && (
                <div className="wizard-review-item" style={{ color: "var(--text-muted)", fontSize: 12 }}>{description}</div>
              )}
            </div>
            <div className="wizard-review-section">
              <h4>Dimensions</h4>
              <div className="wizard-review-item">
                {streamsEnabled ? `${streamLabel} (x-axis)` : "No grouping axis"}
                {streamsEnabled && generationsEnabled && " + "}
                {generationsEnabled ? `${generationLabel} (y-axis)` : !streamsEnabled ? " + No timeline axis" : ""}
              </div>
            </div>
            <div className="wizard-review-section">
              <h4>Node Types ({nodeTypes.length})</h4>
              {nodeTypes.map((nt, i) => (
                <div key={i} className="wizard-review-item">
                  <span style={{ fontWeight: 600, marginRight: 4 }}>{nt.icon || nt.label?.[0]}</span>
                  {nt.label} ({nt.shape}) — {nt.fields.length} field{nt.fields.length !== 1 ? "s" : ""}
                  {nt.size_field && <span style={{ color: "var(--text-dim)", marginLeft: 6, fontSize: 11 }}>size: {nt.size_field}</span>}
                </div>
              ))}
            </div>
            {streamsEnabled && (
              <div className="wizard-review-section">
                <h4>{streamLabel} ({streams.length})</h4>
                {streams.map((s, i) => (
                  <div key={i} className="wizard-review-item">
                    <span className="wizard-review-dot" style={{ backgroundColor: s.color }} />
                    {s.name}
                    {s.description && <span style={{ color: "var(--text-dim)", marginLeft: 8, fontSize: 11 }}>— {s.description}</span>}
                  </div>
                ))}
              </div>
            )}
            {generationsEnabled && (
              <div className="wizard-review-section">
                <h4>{generationLabel} ({generations.length})</h4>
                {generations.map((g, i) => (
                  <div key={i} className="wizard-review-item">
                    <span style={{ color: "var(--text-muted)", fontWeight: 600, width: 20 }}>{i + 1}</span>
                    {g.label || "Untitled"}
                    {g.period && <span style={{ color: "var(--text-dim)", marginLeft: 8, fontSize: 11 }}>{g.period}</span>}
                  </div>
                ))}
              </div>
            )}
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
              <button type="button" className="wizard-template-btn" onClick={handleSaveAsTemplate}>
                {templateSaved ? "Saved!" : "Save as Template"}
              </button>
            )}
          </>
        )}

        {/* --- Step: Create --- */}
        {currentStep === "create" && (
          <>
            <div className="wizard-step-label">{isEditMode ? "Save Changes" : "Create Taxonomy"}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
              Ready to {isEditMode ? "save" : "create"} your taxonomy with {nodeTypes.length} node type{nodeTypes.length > 1 ? "s" : ""}
              {streamsEnabled ? `, ${streams.length} ${streamLabel.toLowerCase()}` : ""}
              {generationsEnabled ? `, ${generations.length} ${generationLabel.toLowerCase()}` : ""}.
            </div>
          </>
        )}

        </div>{/* end wizard-content */}

        {/* Navigation */}
        <div className="wizard-nav">
          <button type="button" className="wizard-cancel-btn" onClick={onCancel}>Cancel</button>
          <div className="wizard-nav-right">
            {stepIdx > 0 && (
              <button type="button" className="wizard-back-btn" onClick={handleBack}>Back</button>
            )}
            {stepIdx < totalSteps - 1 ? (
              <button type="button" className={`wizard-next-btn${nextDisabled ? " disabled" : ""}`}
                onClick={handleNext}>Next</button>
            ) : (
              <button type="button" className="wizard-next-btn" onClick={handleCreate}>
                {isEditMode ? "Save" : "Create"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
