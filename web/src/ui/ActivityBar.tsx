import { useState, useRef, useEffect, useLayoutEffect } from "react";
import type { NodeTypeConfig, LayoutPreset } from "../types/graph-ir";
import { IconNetwork, IconSidebar, IconSettings, IconTaxonomy, IconHelp, IconFitView, IconExport, IconAnalysis, IconExplode, IconLayout, IconProperties, IconNotes, IconOutline } from "./Icons";

interface Props {
  viewMode: string; // "full" or a node type id
  onViewModeChange: (mode: string) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onEditTaxonomy: () => void;
  onOpenHelp?: () => void;
  onFitToView?: () => void;
  onExportImage?: () => void;
  onToggleAnalysis?: () => void;
  analysisOpen?: boolean;
  nodeTypeConfigs?: NodeTypeConfig[];
  onExplode?: () => void;
  exploded?: boolean;
  layoutPreset?: LayoutPreset;
  onLayoutPresetChange?: (preset: LayoutPreset) => void;
  onResetLayout?: () => void;
  onToggleProperties?: () => void;
  propertiesOpen?: boolean;
  onToggleNotes?: () => void;
  notesOpen?: boolean;
  /** Current visible hierarchy level (0 = roots only). Omit to hide the control. */
  expandLevel?: number;
  /** Max hierarchy depth in the graph. Required for stepper bounds. */
  maxExpandLevel?: number;
  onExpandLevelChange?: (level: number) => void;
}

const LAYOUT_OPTIONS: { id: LayoutPreset; label: string; desc: string }[] = [
  { id: "force", label: "Force", desc: "Default force-directed layout" },
  { id: "flow", label: "Flow", desc: "Hierarchy by directed edges" },
  { id: "radial", label: "Radial", desc: "Central nodes radiate outward" },
];

export function ActivityBar({
  viewMode, onViewModeChange,
  sidebarOpen, onToggleSidebar,
  onOpenSettings,
  onEditTaxonomy,
  onOpenHelp,
  onFitToView,
  onExportImage,
  onToggleAnalysis,
  analysisOpen,
  nodeTypeConfigs,
  onExplode,
  exploded,
  layoutPreset,
  onLayoutPresetChange,
  onResetLayout,
  onToggleProperties,
  propertiesOpen,
  onToggleNotes,
  notesOpen,
  expandLevel,
  maxExpandLevel,
  onExpandLevelChange,
}: Props) {
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [layoutPopStyle, setLayoutPopStyle] = useState<{ left: number; top: number } | null>(null);
  const layoutBtnRef = useRef<HTMLButtonElement>(null);
  const layoutPopRef = useRef<HTMLDivElement>(null);

  // Measure the trigger button after it renders so the popover can be anchored to it.
  useLayoutEffect(() => {
    if (!layoutOpen) return;
    const rect = layoutBtnRef.current?.getBoundingClientRect();
    if (rect) setLayoutPopStyle({ left: rect.right + 4, top: rect.top });
  }, [layoutOpen]);

  // Close popover on outside click
  useEffect(() => {
    if (!layoutOpen) return;
    function handleClick(e: MouseEvent) {
      if (layoutBtnRef.current?.contains(e.target as Node)) return;
      if (layoutPopRef.current?.contains(e.target as Node)) return;
      setLayoutOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [layoutOpen]);

  return (
    <div className="activity-bar">
      <div className="activity-bar-top">
        <button
          className={`activity-bar-btn ${viewMode === "full" ? "active" : ""}`}
          onClick={() => onViewModeChange("full")}
          title="Full Network"
        >
          <IconNetwork size={20} />
        </button>
        {/* Dynamic node type filter buttons */}
        {nodeTypeConfigs && nodeTypeConfigs.map((nt) => (
          <button
            key={nt.id}
            className={`activity-bar-btn ${viewMode === nt.id ? "active" : ""}`}
            onClick={() => onViewModeChange(nt.id)}
            title={`${nt.label} View`}
          >
            <span className="activity-bar-icon-text">{nt.icon ?? nt.label[0]}</span>
          </button>
        ))}
        <button
          className={`activity-bar-btn ${viewMode === "textmap" ? "active" : ""}`}
          onClick={() => onViewModeChange("textmap")}
          title="Text Outline"
        >
          <IconOutline size={20} />
        </button>
        <div className="activity-bar-separator" />
        <button
          className={`activity-bar-btn ${sidebarOpen ? "active" : ""}`}
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
        >
          <IconSidebar size={20} />
        </button>
        {onToggleProperties && (
          <button
            className={`activity-bar-btn ${propertiesOpen ? "active" : ""}`}
            onClick={onToggleProperties}
            title="Properties"
          >
            <IconProperties size={20} />
          </button>
        )}
        {onToggleNotes && (
          <button
            className={`activity-bar-btn ${notesOpen ? "active" : ""}`}
            onClick={onToggleNotes}
            title="Notes"
          >
            <IconNotes size={20} />
          </button>
        )}
        {onFitToView && (
          <button
            className="activity-bar-btn"
            onClick={onFitToView}
            title="Fit to View"
          >
            <IconFitView size={20} />
          </button>
        )}
        {onExportImage && (
          <button
            className="activity-bar-btn"
            onClick={onExportImage}
            title="Export Image"
          >
            <IconExport size={20} />
          </button>
        )}
        {/* Expand-level stepper (REQ-088) — vertical to fit the activity bar.
            Shape: [+] above the current depth label above [−]. Double-click the
            label to toggle between fully expanded and fully collapsed. */}
        {onExpandLevelChange && maxExpandLevel !== undefined && maxExpandLevel > 0 && (
          <div className="expand-level-stepper">
            <button
              type="button"
              className="activity-bar-btn expand-level-btn"
              onClick={() => onExpandLevelChange(Math.min(maxExpandLevel, (expandLevel ?? 0) + 1))}
              disabled={(expandLevel ?? 0) >= maxExpandLevel}
              aria-label="Expand one level"
              title={`Expand (level ${(expandLevel ?? 0) + 1} of ${maxExpandLevel})`}
            >
              <span className="expand-level-glyph">+</span>
            </button>
            <button
              type="button"
              className="expand-level-label"
              onDoubleClick={() => onExpandLevelChange((expandLevel ?? 0) >= maxExpandLevel ? 0 : maxExpandLevel)}
              aria-label="Current depth (double-click to toggle all)"
              title={`Depth ${expandLevel ?? 0}/${maxExpandLevel} — double-click to ${(expandLevel ?? 0) >= maxExpandLevel ? "collapse" : "expand"} all`}
            >
              {expandLevel ?? 0}/{maxExpandLevel}
            </button>
            <button
              type="button"
              className="activity-bar-btn expand-level-btn"
              onClick={() => onExpandLevelChange(Math.max(0, (expandLevel ?? 0) - 1))}
              disabled={(expandLevel ?? 0) <= 0}
              aria-label="Collapse one level"
              title={`Collapse (level ${(expandLevel ?? 0) - 1} of ${maxExpandLevel})`}
            >
              <span className="expand-level-glyph">−</span>
            </button>
          </div>
        )}
        {/* Layout preset selector */}
        {onLayoutPresetChange && (
          <div className="layout-selector-wrapper">
            <button
              ref={layoutBtnRef}
              className={`activity-bar-btn ${layoutPreset !== "force" ? "active" : ""}`}
              onClick={() => setLayoutOpen((v) => !v)}
              title="Layout"
            >
              <IconLayout size={20} />
            </button>
            {layoutOpen && (
              <div ref={layoutPopRef} className="layout-popover" style={layoutPopStyle ?? {}}>
                {LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    className={`layout-option ${layoutPreset === opt.id ? "active" : ""}`}
                    onClick={() => { onLayoutPresetChange(opt.id); setLayoutOpen(false); }}
                  >
                    <span className="layout-option-label">{opt.label}</span>
                    <span className="layout-option-desc">{opt.desc}</span>
                  </button>
                ))}
                {onResetLayout && (
                  <>
                    <div className="layout-popover-separator" />
                    <button
                      className="layout-option"
                      onClick={() => { onResetLayout(); setLayoutOpen(false); }}
                    >
                      <span className="layout-option-label">Reset Classifiers</span>
                      <span className="layout-option-desc">Clear axis/region layouts</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="activity-bar-bottom">
        <button
          className={`activity-bar-btn ${analysisOpen ? "active" : ""}`}
          onClick={onToggleAnalysis ?? (() => {})}
          title="Network Analysis"
        >
          <IconAnalysis size={20} />
        </button>
        <button
          className="activity-bar-btn"
          onClick={onEditTaxonomy}
          title="Edit Taxonomy"
        >
          <IconTaxonomy size={20} />
        </button>
        {onExplode && (
          <button
            className={`activity-bar-btn ${exploded ? "active" : ""}`}
            onClick={onExplode}
            title={exploded ? "Collapse graph" : "Explode graph"}
          >
            <IconExplode size={20} />
          </button>
        )}
        <button
          className="activity-bar-btn"
          onClick={onOpenSettings}
          title="Settings"
        >
          <IconSettings size={20} />
        </button>
        {onOpenHelp && (
          <button
            className="activity-bar-btn"
            onClick={onOpenHelp}
            title="Help & FAQ"
          >
            <IconHelp size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
