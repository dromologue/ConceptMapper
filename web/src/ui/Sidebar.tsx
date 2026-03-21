import { useState, useMemo, useCallback } from "react";
import type { GraphNode, Stream, NodeTypeConfig, TaxonomyTemplate } from "../types/graph-ir";
import type { FilterState } from "../utils/filters";
import { isFilterActive, isNodeFilterVisible, findAttributeFilter, findDateRangeFilter } from "../utils/filters";
import { IconChevronDown } from "./Icons";

interface FilterSection {
  nodeType: string;
  field: string;
  label: string;
  values: string[];
}

interface DateFilterSection {
  nodeType: string;
  fromField: string;
  toField?: string;
  label: string;
  minYear: number;
  maxYear: number;
}

const MAX_TEXT_FILTER_VALUES = 30;

/** Check if a property key looks like a date field */
function isDateKey(key: string): boolean {
  const k = key.toLowerCase();
  return k === "date" || k === "date_from" || k === "date_to" || k === "from" || k === "to"
    || k === "due_date" || k.startsWith("date_") || k.endsWith("_date")
    || k.endsWith("_from") || k.endsWith("_to");
}

/** Format a snake_case property key as a label */
function formatKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  nodes: GraphNode[];
  streams: Stream[];
  nodeTypeConfigs: NodeTypeConfig[];
  template?: TaxonomyTemplate | null;
  filters: FilterState;
  onStreamToggle: (streamId: string, allStreamIds: string[]) => void;
  onGenerationToggle: (gen: number, allGens: number[]) => void;
  onAttributeToggle: (nodeType: string, field: string, value: string, allValues: string[]) => void;
  onDateRangeChange: (nodeType: string, fromField: string, toField: string | undefined, bound: "from" | "to", value: string) => void;
  onShowAll: () => void;
  onSelectNode: (node: GraphNode) => void;
  selectedNodeId: string | null;
  onAddNode: (nodeType: string) => void;
  onAddEdge: () => void;
  interactionMode: string;
  onCancelAddEdge: () => void;
}

/** Extract a 4-digit year from a string like "1923", "b. 1947", "~1930" */
function extractYear(val: unknown): number | null {
  if (val == null) return null;
  const match = String(val).match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

export function Sidebar({
  nodes, streams, nodeTypeConfigs, template, filters,
  onStreamToggle, onGenerationToggle, onAttributeToggle, onDateRangeChange, onShowAll,
  onSelectNode, selectedNodeId,
  onAddNode, onAddEdge,
  interactionMode, onCancelAddEdge,
}: Props) {
  const streamSectionLabel = template?.stream_label || "Streams";
  const generationSectionLabel = template?.generation_label || "Phases";
  const [filter, setFilter] = useState("");
  const [streamsOpen, setStreamsOpen] = useState(false);
  const [generationsOpen, setGenerationsOpen] = useState(false);
  const [attributeSectionsOpen, setAttributeSectionsOpen] = useState<Record<string, boolean>>({});
  const [nodesOpen, setNodesOpen] = useState(true);

  // Collect unique generation values from data
  const generations = useMemo(() => {
    const genSet = new Set<number>();
    for (const n of nodes) {
      if (n.generation != null) genSet.add(n.generation);
    }
    return [...genSet].sort((a, b) => a - b);
  }, [nodes]);

  // Generation labels from template
  const generationLabels = useMemo(() => {
    const map = new Map<number, string>();
    if (template?.generations) {
      for (const g of template.generations) {
        if (g.label) map.set(g.number, g.label);
        else if (g.period) map.set(g.number, g.period);
      }
    }
    return map;
  }, [template]);

  // Dynamic attribute filter sections — data-driven discovery
  // Scans all properties from actual data, uses config labels where available
  const filterSections = useMemo<FilterSection[]>(() => {
    const sections: FilterSection[] = [];
    // Group nodes by type
    const nodesByType = new Map<string, typeof nodes>();
    for (const n of nodes) {
      const list = nodesByType.get(n.node_type) ?? [];
      list.push(n);
      nodesByType.set(n.node_type, list);
    }

    for (const config of nodeTypeConfigs) {
      const typeNodes = nodesByType.get(config.id) ?? [];
      if (typeNodes.length === 0) continue;

      // Collect all property keys from data for this type
      const allKeys = new Set<string>();
      for (const n of typeNodes) {
        if (n.properties) {
          for (const key of Object.keys(n.properties)) allKeys.add(key);
        }
      }
      // Also include config-defined select fields (even if no data yet)
      for (const f of config.fields) {
        if (f.type === "select") allKeys.add(f.key);
      }

      for (const key of allKeys) {
        // Skip date-like keys (handled by date filter)
        if (isDateKey(key)) continue;

        const valueSet = new Set<string>();

        // Include template options for select fields
        const configField = config.fields.find((f) => f.key === key);
        if (configField?.type === "select" && configField.options) {
          for (const opt of configField.options) valueSet.add(opt);
        }
        // Skip textarea fields
        if (configField?.type === "textarea") continue;

        // Collect actual values from data
        for (const n of typeNodes) {
          const val = n.properties?.[key];
          if (val != null && typeof val === "string" && val !== "") valueSet.add(val);
        }

        if (valueSet.size === 0) continue;
        if (valueSet.size > MAX_TEXT_FILTER_VALUES) continue;

        // Use config label if available, otherwise format key
        const label = configField?.label ?? formatKey(key);

        sections.push({ nodeType: config.id, field: key, label, values: [...valueSet].sort() });
      }
    }

    // Also handle nodes with types not in config
    const configIds = new Set(nodeTypeConfigs.map((c) => c.id));
    for (const [typeId, typeNodes] of nodesByType) {
      if (configIds.has(typeId)) continue;
      const allKeys = new Set<string>();
      for (const n of typeNodes) {
        if (n.properties) {
          for (const key of Object.keys(n.properties)) allKeys.add(key);
        }
      }
      for (const key of allKeys) {
        if (isDateKey(key)) continue;
        const valueSet = new Set<string>();
        for (const n of typeNodes) {
          const val = n.properties?.[key];
          if (val != null && typeof val === "string" && val !== "") valueSet.add(val);
        }
        if (valueSet.size === 0 || valueSet.size > MAX_TEXT_FILTER_VALUES) continue;
        sections.push({ nodeType: typeId, field: key, label: formatKey(key), values: [...valueSet].sort() });
      }
    }

    return sections;
  }, [nodeTypeConfigs, nodes]);

  // Date filter sections — detect date-like properties from data
  const dateFilterSections = useMemo<DateFilterSection[]>(() => {
    const sections: DateFilterSection[] = [];
    const nodesByType = new Map<string, typeof nodes>();
    for (const n of nodes) {
      const list = nodesByType.get(n.node_type) ?? [];
      list.push(n);
      nodesByType.set(n.node_type, list);
    }

    const processed = new Set<string>();
    for (const [typeId, typeNodes] of nodesByType) {
      // Collect all date-like keys
      const dateKeys = new Set<string>();
      for (const n of typeNodes) {
        if (n.properties) {
          for (const key of Object.keys(n.properties)) {
            if (isDateKey(key)) dateKeys.add(key);
          }
        }
      }
      // Also check config fields
      const config = nodeTypeConfigs.find((c) => c.id === typeId);
      if (config) {
        for (const f of config.fields) {
          if (isDateKey(f.key)) dateKeys.add(f.key);
        }
      }
      if (dateKeys.size === 0) continue;

      // Try to pair from/to
      const fromKey = [...dateKeys].find((k) => k.includes("from") || k === "date_from") ?? [...dateKeys][0];
      const toKey = [...dateKeys].find((k) => k.includes("to") || k === "date_to") ?? fromKey;
      const dedupKey = `${typeId}.${fromKey}|${toKey}`;
      if (processed.has(dedupKey)) continue;
      processed.add(dedupKey);

      let minYear = Infinity;
      let maxYear = -Infinity;
      for (const n of typeNodes) {
        const fromY = extractYear(n.properties?.[fromKey]);
        const toY = extractYear(n.properties?.[toKey]);
        if (fromY !== null) { minYear = Math.min(minYear, fromY); maxYear = Math.max(maxYear, fromY); }
        if (toY !== null) { minYear = Math.min(minYear, toY); maxYear = Math.max(maxYear, toY); }
      }
      if (!isFinite(minYear)) continue;

      const typeLabel = config?.label ?? typeId;
      sections.push({ nodeType: typeId, fromField: fromKey, toField: toKey !== fromKey ? toKey : undefined, label: `${typeLabel} Date Range`, minYear, maxYear });
    }
    return sections;
  }, [nodeTypeConfigs, nodes]);

  // Filter node list by text search AND active filters
  const filteredNodes = useMemo(() => {
    const q = filter.toLowerCase();
    return nodes
      .filter((n) => {
        if (q && !n.name.toLowerCase().includes(q)) return false;
        return isNodeFilterVisible(n, filters);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nodes, filter, filters]);

  const isEdgeMode = interactionMode !== "normal";
  const hasActiveFilters = isFilterActive(filters);

  const toggleAttrSection = useCallback((key: string) => {
    setAttributeSectionsOpen((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  }, []);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Explorer</span>
      </div>

      {/* Add node buttons — one per configured type + edge button */}
      <div className="sidebar-add-actions">
        {nodeTypeConfigs.map((config) => (
          <button
            key={config.id}
            className="sidebar-action-btn"
            onClick={() => onAddNode(config.id)}
          >
            + {config.label}
          </button>
        ))}
        <button
          className={`sidebar-action-btn sidebar-edge-btn ${isEdgeMode ? "active" : ""}`}
          onClick={isEdgeMode ? onCancelAddEdge : onAddEdge}
          title={isEdgeMode ? "Cancel edge drawing (Esc)" : "Draw edge between nodes"}
        >
          {isEdgeMode ? "Cancel Edge" : "+ Edge"}
        </button>
      </div>

      {/* Streams section */}
      {streams.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-header" onClick={() => setStreamsOpen(!streamsOpen)}>
            <span>{streamSectionLabel}</span>
            <span className={`sidebar-chevron ${streamsOpen ? "open" : ""}`}>
              <IconChevronDown size={12} />
            </span>
          </div>
          {streamsOpen && (
            <div className="sidebar-section-body">
              {streams.map((s) => {
                const active = filters.streams === null || filters.streams.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={`sidebar-filter-item ${active ? "" : "inactive"}`}
                    onClick={() => onStreamToggle(s.id, streams.map((st) => st.id))}
                  >
                    <span className="sidebar-filter-check" data-checked={active ? "true" : "false"}>
                      <span className="sidebar-stream-dot" style={{ backgroundColor: s.color || "#999" }} />
                    </span>
                    <span className="sidebar-filter-label">{s.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Generations section */}
      {generations.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-header" onClick={() => setGenerationsOpen(!generationsOpen)}>
            <span>{generationSectionLabel}</span>
            <span className={`sidebar-chevron ${generationsOpen ? "open" : ""}`}>
              <IconChevronDown size={12} />
            </span>
          </div>
          {generationsOpen && (
            <div className="sidebar-section-body">
              {generations.map((g) => {
                const active = filters.generations === null || filters.generations.has(g);
                const label = generationLabels.get(g) ?? `Phase ${g}`;
                return (
                  <div
                    key={g}
                    className={`sidebar-filter-item ${active ? "" : "inactive"}`}
                    onClick={() => onGenerationToggle(g, generations)}
                  >
                    <span className="sidebar-filter-check" data-checked={active ? "true" : "false"} />
                    <span className="sidebar-filter-label">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Attribute filter sections */}
      {filterSections.map((section) => {
        const sectionKey = `${section.nodeType}.${section.field}`;
        const isOpen = attributeSectionsOpen[sectionKey] ?? false;
        const attrFilter = findAttributeFilter(filters, section.nodeType, section.field);
        const selectedVals = attrFilter?.values;
        return (
          <div key={sectionKey} className="sidebar-section">
            <div className="sidebar-section-header" onClick={() => toggleAttrSection(sectionKey)}>
              <span>{section.label}</span>
              <span className={`sidebar-chevron ${isOpen ? "open" : ""}`}>
                <IconChevronDown size={12} />
              </span>
            </div>
            {isOpen && (
              <div className="sidebar-section-body">
                {section.values.map((val) => {
                  const active = selectedVals == null || selectedVals.has(val);
                  return (
                    <div
                      key={val}
                      className={`sidebar-filter-item ${active ? "" : "inactive"}`}
                      onClick={() => onAttributeToggle(section.nodeType, section.field, val, section.values)}
                    >
                      <span className="sidebar-filter-check" data-checked={active ? "true" : "false"} />
                      <span className="sidebar-filter-label">{val}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Date range filter sections */}
      {dateFilterSections.map((section) => {
        const sectionKey = `${section.nodeType}.${section.fromField}|${section.toField ?? section.fromField}`;
        const isOpen = attributeSectionsOpen[sectionKey] ?? false;
        const drFilter = findDateRangeFilter(filters, section.nodeType, section.fromField, section.toField);
        const range = drFilter?.range;
        return (
          <div key={sectionKey} className="sidebar-section">
            <div className="sidebar-section-header" onClick={() => toggleAttrSection(sectionKey)}>
              <span>{section.label}</span>
              <span className={`sidebar-chevron ${isOpen ? "open" : ""}`}>
                <IconChevronDown size={12} />
              </span>
            </div>
            {isOpen && (
              <div className="sidebar-section-body">
                <div className="sidebar-date-range">
                  <label className="sidebar-date-label">
                    From
                    <input
                      className="sidebar-date-input"
                      type="date"
                      value={range?.from ?? ""}
                      min={`${section.minYear}-01-01`}
                      max={`${section.maxYear}-12-31`}
                      onChange={(e) => onDateRangeChange(section.nodeType, section.fromField, section.toField, "from", e.target.value)}
                    />
                  </label>
                  <label className="sidebar-date-label">
                    To
                    <input
                      className="sidebar-date-input"
                      type="date"
                      value={range?.to ?? ""}
                      min={`${section.minYear}-01-01`}
                      max={`${section.maxYear}-12-31`}
                      onChange={(e) => onDateRangeChange(section.nodeType, section.fromField, section.toField, "to", e.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Show All button */}
      {hasActiveFilters && (
        <div className="sidebar-section">
          <div className="sidebar-show-all-btn" onClick={onShowAll}>
            Show All
          </div>
        </div>
      )}

      {/* Node list — grouped by node type */}
      <div className="sidebar-section sidebar-nodes-section">
        <div className="sidebar-section-header" onClick={() => setNodesOpen(!nodesOpen)}>
          <span>Nodes ({filteredNodes.length})</span>
          <span className={`sidebar-chevron ${nodesOpen ? "open" : ""}`}>
            <IconChevronDown size={12} />
          </span>
        </div>
        {nodesOpen && (
          <div className="sidebar-section-body sidebar-node-list">
            <input
              className="sidebar-filter"
              type="text"
              placeholder="Filter nodes..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="sidebar-node-scroll">
              {nodeTypeConfigs.map((config) => {
                const typeNodes = filteredNodes.filter((n) => n.node_type === config.id);
                if (typeNodes.length === 0) return null;
                return (
                  <div key={config.id} className="sidebar-type-group">
                    <div className="sidebar-type-group-header">
                      <span className="sidebar-type-group-icon">{config.icon ?? config.label[0]}</span>
                      <span className="sidebar-type-group-label">{config.label}</span>
                      <span className="sidebar-type-group-count">{typeNodes.length}</span>
                    </div>
                    {typeNodes.map((n) => (
                      <div
                        key={n.id}
                        className={`sidebar-node-item ${n.id === selectedNodeId ? "selected" : ""}`}
                        onClick={() => onSelectNode(n)}
                      >
                        <span
                          className={`sidebar-node-indicator ${config.shape !== "circle" ? "non-circle" : ""}`}
                          style={{
                            backgroundColor: streams.find((s) => s.id === n.stream)?.color ?? "#666",
                          }}
                        />
                        <span className="sidebar-node-name">{n.name}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {/* Nodes with unknown type (no matching config) */}
              {filteredNodes.filter((n) => !nodeTypeConfigs.some((c) => c.id === n.node_type)).length > 0 && (
                <div className="sidebar-type-group">
                  <div className="sidebar-type-group-header">
                    <span className="sidebar-type-group-label">Other</span>
                  </div>
                  {filteredNodes
                    .filter((n) => !nodeTypeConfigs.some((c) => c.id === n.node_type))
                    .map((n) => (
                      <div
                        key={n.id}
                        className={`sidebar-node-item ${n.id === selectedNodeId ? "selected" : ""}`}
                        onClick={() => onSelectNode(n)}
                      >
                        <span className="sidebar-node-indicator" style={{ backgroundColor: "#666" }} />
                        <span className="sidebar-node-name">{n.name}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
