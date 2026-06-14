import { useState, useRef, useEffect, useLayoutEffect } from "react";
import type { NodeTypeConfig, LayoutPreset } from "../types/graph-ir";
import {
  IconNetwork, IconSidebar, IconSettings, IconTaxonomy, IconHelp,
  IconFitView, IconExport, IconAnalysis, IconExplode,
  IconProperties, IconNotes, IconOutline, IconBrain, IconAdvanced,
} from "./Icons";

interface Props {
  /** On a phone the sidebar/properties/notes/analysis toggles are the bottom
      tab bar's job, so the rail hides them and keeps only Map-tab tools. */
  isPhone?: boolean;
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
  onToggleSecondBrain?: () => void;
  secondBrainOpen?: boolean;
  /** Current visible hierarchy level (0 = roots only). Omit to hide the control. */
  expandLevel?: number;
  /** Max hierarchy depth in the graph. Required for stepper bounds. */
  maxExpandLevel?: number;
  onExpandLevelChange?: (level: number) => void;
}

const LAYOUT_OPTIONS: { id: LayoutPreset; label: string; desc: string }[] = [
  { id: "force", label: "Force", desc: "Default force-directed layout" },
  { id: "flow",  label: "Flow",  desc: "Hierarchy by directed edges" },
  { id: "radial", label: "Radial", desc: "Central nodes radiate outward" },
];

export function ActivityBar({
  isPhone,
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
  onToggleSecondBrain,
  secondBrainOpen,
  expandLevel,
  maxExpandLevel,
  onExpandLevelChange,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedPopStyle, setAdvancedPopStyle] = useState<{ left: number; top: number } | null>(null);
  const advancedBtnRef = useRef<HTMLButtonElement>(null);
  const advancedPopRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!advancedOpen) return;
    const rect = advancedBtnRef.current?.getBoundingClientRect();
    if (rect) setAdvancedPopStyle({ left: rect.right + 4, top: rect.top });
  }, [advancedOpen]);

  useEffect(() => {
    if (!advancedOpen) return;
    function handleClick(e: MouseEvent) {
      if (advancedBtnRef.current?.contains(e.target as Node)) return;
      if (advancedPopRef.current?.contains(e.target as Node)) return;
      setAdvancedOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [advancedOpen]);

  const advancedActive = !!(analysisOpen || secondBrainOpen || exploded || (layoutPreset && layoutPreset !== "force"));

  const hasAdvancedTools = !!(
    onToggleAnalysis || onToggleSecondBrain || onExportImage ||
    onLayoutPresetChange || onExplode ||
    (onExpandLevelChange && maxExpandLevel !== undefined && maxExpandLevel > 0)
  );

  return (
    <div className="activity-bar">
      <div className="activity-bar-top">
        {/* View mode selectors */}
        <button
          className={`activity-bar-btn ${viewMode === "full" ? "active" : ""}`}
          onClick={() => onViewModeChange("full")}
          title="Full Network"
        >
          <IconNetwork size={20} />
        </button>
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

        {!isPhone && <div className="activity-bar-separator" />}

        {/* Panel toggles (desktop) */}
        {!isPhone && (
          <button
            className={`activity-bar-btn ${sidebarOpen ? "active" : ""}`}
            onClick={onToggleSidebar}
            title="Toggle Sidebar"
          >
            <IconSidebar size={20} />
          </button>
        )}
        {!isPhone && onToggleProperties && (
          <button
            className={`activity-bar-btn ${propertiesOpen ? "active" : ""}`}
            onClick={onToggleProperties}
            title="Properties"
          >
            <IconProperties size={20} />
          </button>
        )}
        {!isPhone && onToggleNotes && (
          <button
            className={`activity-bar-btn ${notesOpen ? "active" : ""}`}
            onClick={onToggleNotes}
            title="Notes"
          >
            <IconNotes size={20} />
          </button>
        )}

        {/* Fit to view — quick action, always visible */}
        {onFitToView && (
          <button
            className="activity-bar-btn"
            onClick={onFitToView}
            title="Fit to View"
          >
            <IconFitView size={20} />
          </button>
        )}

        {/* Advanced flyout — available on all platforms */}
        {hasAdvancedTools && (
          <div className="layout-selector-wrapper">
            <button
              ref={advancedBtnRef}
              className={`activity-bar-btn ${advancedActive ? "active" : ""}`}
              onClick={() => setAdvancedOpen((v) => !v)}
              title="Advanced Tools"
            >
              <IconAdvanced size={20} />
            </button>
            {advancedOpen && (
              <div ref={advancedPopRef} className="advanced-popover" style={advancedPopStyle ?? {}}>

                {/* Panel toggles in flyout */}
                {onToggleAnalysis && (
                  <button
                    className={`advanced-item ${analysisOpen ? "active" : ""}`}
                    onClick={() => { onToggleAnalysis(); setAdvancedOpen(false); }}
                  >
                    <IconAnalysis size={14} />
                    <span>Network Analysis</span>
                  </button>
                )}
                {onToggleSecondBrain && (
                  <button
                    className={`advanced-item ${secondBrainOpen ? "active" : ""}`}
                    onClick={() => { onToggleSecondBrain(); setAdvancedOpen(false); }}
                  >
                    <IconBrain size={14} />
                    <span>Second Brain</span>
                  </button>
                )}

                {(onToggleAnalysis || onToggleSecondBrain) && (onExportImage || onLayoutPresetChange || onExplode) && (
                  <div className="advanced-separator" />
                )}

                {/* Actions */}
                {onExportImage && (
                  <button
                    className="advanced-item"
                    onClick={() => { onExportImage(); setAdvancedOpen(false); }}
                  >
                    <IconExport size={14} />
                    <span>Export Image</span>
                  </button>
                )}

                {/* Layout */}
                {onLayoutPresetChange && (
                  <>
                    {onExportImage && <div className="advanced-separator" />}
                    <div className="advanced-section-label">Layout</div>
                    <div className="advanced-layout-group">
                      {LAYOUT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          className={`advanced-layout-btn ${layoutPreset === opt.id ? "active" : ""}`}
                          onClick={() => onLayoutPresetChange(opt.id)}
                          title={opt.desc}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {onResetLayout && (
                      <button
                        className="advanced-item advanced-item-sub"
                        onClick={() => { onResetLayout(); }}
                      >
                        <span>Reset Classifiers</span>
                      </button>
                    )}
                  </>
                )}

                {(onLayoutPresetChange || onExportImage) && (onExplode || (onExpandLevelChange && maxExpandLevel !== undefined && maxExpandLevel > 0)) && (
                  <div className="advanced-separator" />
                )}

                {/* Graph controls */}
                {onExplode && (
                  <button
                    className={`advanced-item ${exploded ? "active" : ""}`}
                    onClick={() => onExplode()}
                  >
                    <IconExplode size={14} />
                    <span>{exploded ? "Collapse Graph" : "Explode Graph"}</span>
                  </button>
                )}

                {/* Expand-level stepper — horizontal inline */}
                {onExpandLevelChange && maxExpandLevel !== undefined && maxExpandLevel > 0 && (
                  <div className="advanced-expand-row">
                    <span className="advanced-expand-label">Depth</span>
                    <button
                      className="expand-level-btn"
                      onClick={() => onExpandLevelChange(Math.max(0, (expandLevel ?? 0) - 1))}
                      disabled={(expandLevel ?? 0) <= 0}
                      aria-label="Collapse one level"
                    >
                      <span className="expand-level-glyph">−</span>
                    </button>
                    <button
                      className="expand-level-label"
                      onDoubleClick={() => onExpandLevelChange((expandLevel ?? 0) >= maxExpandLevel ? 0 : maxExpandLevel)}
                      title={`Depth ${expandLevel ?? 0}/${maxExpandLevel} — double-click to ${(expandLevel ?? 0) >= maxExpandLevel ? "collapse" : "expand"} all`}
                    >
                      {expandLevel ?? 0}/{maxExpandLevel}
                    </button>
                    <button
                      className="expand-level-btn"
                      onClick={() => onExpandLevelChange(Math.min(maxExpandLevel, (expandLevel ?? 0) + 1))}
                      disabled={(expandLevel ?? 0) >= maxExpandLevel}
                      aria-label="Expand one level"
                    >
                      <span className="expand-level-glyph">+</span>
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>

      <div className="activity-bar-bottom">
        <button
          className="activity-bar-btn"
          onClick={onEditTaxonomy}
          title="Edit Taxonomy"
        >
          <IconTaxonomy size={20} />
        </button>
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
