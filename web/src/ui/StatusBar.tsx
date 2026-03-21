import type { InteractionMode } from "../App";

interface Props {
  nodeCount: number;
  edgeCount: number;
  saveIndicator: boolean;
  interactionMode: InteractionMode;
  themeName: string;
  mcpConfigured?: boolean;
}

export function StatusBar({
  nodeCount, edgeCount, saveIndicator,
  interactionMode, themeName, mcpConfigured,
}: Props) {
  return (
    <div className="status-bar">
      <div className="status-bar-left">
        {interactionMode !== "normal" && (
          <span className="status-bar-edge-mode">
            {interactionMode === "add-edge-source" ? "Select source node..." : "Select target node..."}
          </span>
        )}
      </div>
      <div className="status-bar-right">
        {mcpConfigured && <span className="status-bar-item status-bar-mcp">MCP</span>}
        <span className="status-bar-item">{nodeCount} nodes</span>
        <span className="status-bar-item">{edgeCount} edges</span>
        <span className={`status-bar-save ${saveIndicator ? "visible" : ""}`}>Saved</span>
        <span className="status-bar-item status-bar-theme">{themeName}</span>
      </div>
    </div>
  );
}
