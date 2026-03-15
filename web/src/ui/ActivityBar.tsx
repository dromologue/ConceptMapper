import type { NodeTypeConfig } from "../types/graph-ir";
import { IconNetwork, IconSidebar, IconSettings, IconTaxonomy, IconMapping, IconChat, IconHelp } from "./Icons";

interface Props {
  viewMode: string; // "full" or a node type id
  onViewModeChange: (mode: string) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onEditTaxonomy: () => void;
  onOpenMapping?: () => void;
  onToggleChat?: () => void;
  chatOpen?: boolean;
  llmAvailable?: boolean;
  onOpenHelp?: () => void;
  nodeTypeConfigs?: NodeTypeConfig[];
}

export function ActivityBar({
  viewMode, onViewModeChange,
  sidebarOpen, onToggleSidebar,
  onOpenSettings,
  onEditTaxonomy,
  onOpenMapping,
  onToggleChat,
  chatOpen,
  llmAvailable,
  onOpenHelp,
  nodeTypeConfigs,
}: Props) {
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
        <div className="activity-bar-separator" />
        <button
          className={`activity-bar-btn ${sidebarOpen ? "active" : ""}`}
          onClick={onToggleSidebar}
          title="Toggle Sidebar"
        >
          <IconSidebar size={20} />
        </button>
        {llmAvailable && onOpenMapping && (
          <>
            <div className="activity-bar-separator" />
            <button
              className="activity-bar-btn"
              onClick={onOpenMapping}
              title="Map Text to Taxonomy"
            >
              <IconMapping size={20} />
            </button>
          </>
        )}
        {llmAvailable && onToggleChat && (
          <button
            className={`activity-bar-btn ${chatOpen ? "active" : ""}`}
            onClick={onToggleChat}
            title="Chat with LLM"
          >
            <IconChat size={20} />
          </button>
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
