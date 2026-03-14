import type { ViewMode } from "../App";

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onDownloadImage: () => void;
  onDownloadFile: () => void;
}

export function Toolbar({
  viewMode,
  onViewModeChange,
  onDownloadImage,
  onDownloadFile,
}: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <span className="toolbar-label">View</span>
        <button
          className={`toolbar-btn ${viewMode === "full" ? "active" : ""}`}
          onClick={() => onViewModeChange("full")}
          title="Show all nodes and edges"
        >
          Full Network
        </button>
        <button
          className={`toolbar-btn ${viewMode === "people" ? "active" : ""}`}
          onClick={() => onViewModeChange("people")}
          title="Show only thinkers and their relationships"
        >
          People
        </button>
        <button
          className={`toolbar-btn ${viewMode === "concepts" ? "active" : ""}`}
          onClick={() => onViewModeChange("concepts")}
          title="Show only concepts and their relationships"
        >
          Concepts
        </button>
      </div>

      <div className="toolbar-group">
        <span className="toolbar-label">Export</span>
        <button className="toolbar-btn export-btn" onClick={onDownloadImage} title="Download graph as PNG image">
          Download Image
        </button>
        <button className="toolbar-btn export-btn" onClick={onDownloadFile} title="Download as taxonomy markdown file">
          Download File
        </button>
      </div>
    </div>
  );
}
