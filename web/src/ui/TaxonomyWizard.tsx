import { useState, useEffect, useCallback } from "react";
import type { Classifier, NodeTypeConfig, FieldConfig, EdgeTypeConfig, FieldType, Stream, Generation } from "../types/graph-ir";

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

interface WizardClassifier {
  id: string;
  label: string;
  layout: "x" | "y" | "region" | "region-column" | "none";
  values: { id: string; label: string; color: string; description: string }[];
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
  shape: "circle" | "rectangle" | "diamond" | "hexagon" | "triangle" | "pill";
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
  classifiers: Classifier[];
  node_types: NodeTypeConfig[];
  edge_types?: EdgeTypeConfig[];
}

export interface TaxonomyWizardInitial {
  title: string;
  description?: string;
  classifiers?: Classifier[];
  node_types?: NodeTypeConfig[];
  edge_types?: EdgeTypeConfig[];
  // Legacy fields for backward compat
  streams?: Stream[];
  generations?: Generation[];
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

// --- Step IDs ---
type StepId = "title" | "node_types" | "classifiers" | "edges" | "review" | "create";

const STEPS: StepId[] = ["title", "node_types", "classifiers", "edges", "review", "create"];

export function TaxonomyWizard({ onComplete, onCancel, initialData, onSaveTemplate }: Props) {
  const isEditMode = !!initialData;

  // Title
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");

  // Node Types
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

  // Classifiers
  const [classifiers, setClassifiers] = useState<WizardClassifier[]>(() => {
    if (initialData?.classifiers?.length) {
      return initialData.classifiers.map((c) => ({
        id: c.id,
        label: c.label,
        layout: c.layout ?? "none",
        values: c.values.map((v) => ({
          id: v.id,
          label: v.label,
          color: v.color ?? DEFAULT_COLORS[0],
          description: v.description ?? "",
        })),
      }));
    }
    // Convert legacy streams/generations
    const cls: WizardClassifier[] = [];
    if (initialData?.streams?.length) {
      cls.push({
        id: initialData.stream_label?.toLowerCase().replace(/\s+/g, "_") ?? "stream",
        label: initialData.stream_label ?? "Categories",
        layout: "x",
        values: initialData.streams.map((s) => ({
          id: s.id,
          label: s.name,
          color: s.color ?? DEFAULT_COLORS[0],
          description: s.description ?? "",
        })),
      });
    }
    if (initialData?.generations?.length) {
      cls.push({
        id: initialData.generation_label?.toLowerCase().replace(/\s+/g, "_") ?? "generation",
        label: initialData.generation_label ?? "Phases",
        layout: "y",
        values: initialData.generations.map((g) => ({
          id: String(g.number),
          label: g.label ?? String(g.number),
          color: "",
          description: g.period ?? "",
        })),
      });
    }
    return cls.length > 0
      ? cls
      : [{ id: "category", label: "Categories", layout: "x", values: [{ id: "", label: "", color: DEFAULT_COLORS[0], description: "" }] }];
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

  const steps = STEPS;
  const [stepIdx, setStepIdx] = useState(0);
  const currentStep = steps[stepIdx] ?? "title";
  const totalSteps = steps.length;

  // Escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  // Validation per step
  const canNext = useCallback(() => {
    switch (currentStep) {
      case "title": return title.trim().length > 0;
      case "node_types": return nodeTypes.length > 0 && nodeTypes.every((t) => t.label.trim().length > 0);
      case "classifiers": return classifiers.length > 0 && classifiers.every((c) => c.label.trim().length > 0 && c.values.every((v) => v.label.trim().length > 0));
      case "edges": return edgeTypes.length > 0 && edgeTypes.every((e) => e.label.trim().length > 0);
      default: return true;
    }
  }, [currentStep, title, nodeTypes, classifiers, edgeTypes]);

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
    const resultClassifiers: Classifier[] = classifiers.map((cls) => ({
      id: cls.id || slugify(cls.label),
      label: cls.label.trim(),
      layout: cls.layout === "none" ? undefined : cls.layout,
      values: cls.values.map((v, i) => ({
        id: v.id || slugify(v.label),
        label: v.label.trim(),
        color: v.color || (cls === classifiers[0] ? DEFAULT_COLORS[i % DEFAULT_COLORS.length] : undefined),
        description: v.description.trim() || undefined,
      })),
    }));

    const resultEdgeTypes: EdgeTypeConfig[] = edgeTypes.map((e) => ({
      id: e.id || slugify(e.label), label: e.label.trim(), color: e.color,
      directed: e.directed, style: e.style,
    }));

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      classifiers: resultClassifiers,
      node_types: buildNodeTypeConfigs(),
      edge_types: resultEdgeTypes,
    };
  }, [title, description, classifiers, edgeTypes, buildNodeTypeConfigs]);

  const handleCreate = useCallback(() => { onComplete(buildResult()); }, [buildResult, onComplete]);

  const handleSaveAsTemplate = useCallback(() => {
    onSaveTemplate?.(buildResult());
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2000);
  }, [buildResult, onSaveTemplate]);

  // --- Classifier helpers ---

  const addClassifier = () => {
    setClassifiers([...classifiers, {
      id: "", label: "", layout: "none",
      values: [{ id: "", label: "", color: DEFAULT_COLORS[classifiers.length % DEFAULT_COLORS.length], description: "" }],
    }]);
  };
  const removeClassifier = (i: number) => {
    if (classifiers.length > 1) setClassifiers(classifiers.filter((_, idx) => idx !== i));
  };
  const updateClassifier = (i: number, updates: Partial<WizardClassifier>) => {
    setClassifiers(classifiers.map((c, idx) => {
      if (idx !== i) return c;
      const updated = { ...c, ...updates };
      if (updates.label !== undefined && !c.id) updated.id = slugify(updates.label);
      return updated;
    }));
  };
  const addClassifierValue = (clsIdx: number) => {
    const cls = classifiers[clsIdx];
    const newVal = { id: "", label: "", color: DEFAULT_COLORS[cls.values.length % DEFAULT_COLORS.length], description: "" };
    updateClassifier(clsIdx, { values: [...cls.values, newVal] });
  };
  const removeClassifierValue = (clsIdx: number, valIdx: number) => {
    const cls = classifiers[clsIdx];
    if (cls.values.length > 1) {
      updateClassifier(clsIdx, { values: cls.values.filter((_, idx) => idx !== valIdx) });
    }
  };
  const updateClassifierValue = (clsIdx: number, valIdx: number, updates: Partial<WizardClassifier["values"][0]>) => {
    const cls = classifiers[clsIdx];
    const newValues = cls.values.map((v, idx) => {
      if (idx !== valIdx) return v;
      const updated = { ...v, ...updates };
      if (updates.label !== undefined && !v.id) updated.id = slugify(updates.label);
      return updated;
    });
    updateClassifier(clsIdx, { values: newValues });
  };

  // --- Edge helpers ---

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

  // --- Node type helpers ---

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
                          <option value="diamond">Diamond</option>
                          <option value="hexagon">Hexagon</option>
                          <option value="triangle">Triangle</option>
                          <option value="pill">Pill</option>
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
                          <option value="time">Date</option>
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

        {/* --- Step: Classifiers --- */}
        {currentStep === "classifiers" && (
          <>
            <div className="wizard-step-label">Define Classifiers</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
              Classifiers organise nodes into groups. The first classifier drives node colour.
            </div>
            <button type="button" className="wizard-add-btn" onClick={addClassifier} style={{ marginBottom: 8 }}>+ Add Classifier</button>
            {classifiers.map((cls, ci) => (
              <div key={ci} className="wizard-node-type-card">
                <div className="wizard-node-type-header">
                  <input type="text" value={cls.label}
                    onChange={(e) => updateClassifier(ci, { label: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Classifier name" style={{ flex: 1, fontWeight: 600 }} />
                  <select value={cls.layout} onChange={(e) => updateClassifier(ci, { layout: e.target.value as "x" | "y" | "region" | "region-column" | "none" })}
                    style={{ width: 120, fontSize: 12 }}>
                    <option value="x">X-axis</option>
                    <option value="y">Y-axis</option>
                    <option value="region">Region (circle)</option>
                    <option value="region-column">Region (column)</option>
                    <option value="none">Filter only</option>
                  </select>
                  <button type="button" className="wizard-remove-btn"
                    onClick={() => removeClassifier(ci)} disabled={classifiers.length <= 1}>&times;</button>
                </div>
                <div className="wizard-node-type-body">
                  {cls.values.map((v, vi) => (
                    <div key={vi} className="wizard-stream-row">
                      {ci === 0 && (
                        <input type="color" className="wizard-color-input" value={v.color || DEFAULT_COLORS[vi % DEFAULT_COLORS.length]}
                          onChange={(e) => updateClassifierValue(ci, vi, { color: e.target.value })} title="Color" />
                      )}
                      <input type="text" value={v.label}
                        onChange={(e) => updateClassifierValue(ci, vi, { label: e.target.value })}
                        placeholder="Value label" />
                      <input type="text" value={v.description}
                        onChange={(e) => updateClassifierValue(ci, vi, { description: e.target.value })}
                        placeholder="Description (optional)" style={{ flex: 1.5 }} />
                      <button type="button" className="wizard-remove-btn"
                        onClick={() => removeClassifierValue(ci, vi)} disabled={cls.values.length <= 1}>&times;</button>
                    </div>
                  ))}
                  <button type="button" className="wizard-add-btn" onClick={() => addClassifierValue(ci)}
                    style={{ marginTop: 4 }}>+ Add Value</button>
                </div>
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
              <h4>Node Types ({nodeTypes.length})</h4>
              {nodeTypes.map((nt, i) => (
                <div key={i} className="wizard-review-item">
                  <span style={{ fontWeight: 600, marginRight: 4 }}>{nt.icon || nt.label?.[0]}</span>
                  {nt.label} ({nt.shape}) — {nt.fields.length} field{nt.fields.length !== 1 ? "s" : ""}
                  {nt.size_field && <span style={{ color: "var(--text-dim)", marginLeft: 6, fontSize: 11 }}>size: {nt.size_field}</span>}
                </div>
              ))}
            </div>
            <div className="wizard-review-section">
              <h4>Classifiers ({classifiers.length})</h4>
              {classifiers.map((cls, i) => (
                <div key={i} className="wizard-review-item">
                  <span style={{ fontWeight: 600 }}>{cls.label}</span>
                  <span style={{ color: "var(--text-dim)", marginLeft: 6, fontSize: 11 }}>
                    ({cls.layout === "x" ? "x-axis" : cls.layout === "y" ? "y-axis" : cls.layout === "region" ? "region (circle)" : cls.layout === "region-column" ? "region (column)" : "filter only"})
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 11 }}>{cls.values.length} value{cls.values.length !== 1 ? "s" : ""}</span>
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
              Ready to {isEditMode ? "save" : "create"} your taxonomy with {nodeTypes.length} node type{nodeTypes.length > 1 ? "s" : ""}, {classifiers.length} classifier{classifiers.length > 1 ? "s" : ""}.
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
