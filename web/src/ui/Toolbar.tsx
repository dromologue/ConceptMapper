import type { ViewMode, InteractionMode } from "../App";

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onDownloadImage: () => void;
  onDownloadFile: () => void;
  onAddThinker: () => void;
  onAddConcept: () => void;
  onAddEdge: () => void;
  interactionMode: InteractionMode;
  onCancelAddEdge: () => void;
}

export function Toolbar({
  viewMode, onViewModeChange,
  onDownloadImage, onDownloadFile,
  onAddThinker, onAddConcept, onAddEdge,
  interactionMode, onCancelAddEdge,
}: Props) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <span className="toolbar-label">View</span>
        <button className={`toolbar-btn ${viewMode === "full" ? "active" : ""}`}
          onClick={() => onViewModeChange("full")} title="Show all nodes and edges">
          Full Network
        </button>
        <button className={`toolbar-btn ${viewMode === "people" ? "active" : ""}`}
          onClick={() => onViewModeChange("people")} title="Thinkers only — click to reveal concepts">
          People
        </button>
        <button className={`toolbar-btn ${viewMode === "concepts" ? "active" : ""}`}
          onClick={() => onViewModeChange("concepts")} title="Concepts only — click to reveal thinkers">
          Concepts
        </button>
      </div>

      <div className="toolbar-group">
        <span className="toolbar-label">Add</span>
        <button className="toolbar-btn add-btn" onClick={onAddThinker} title="Add a new thinker node">
          + Thinker
        </button>
        <button className="toolbar-btn add-btn" onClick={onAddConcept} title="Add a new concept node">
          + Concept
        </button>
        {interactionMode === "normal" ? (
          <button className="toolbar-btn add-btn" onClick={onAddEdge} title="Draw an edge between two nodes">
            + Edge
          </button>
        ) : (
          <button className="toolbar-btn edge-mode-btn" onClick={onCancelAddEdge}>
            {interactionMode === "add-edge-source" ? "Click source node..." : "Click target node..."}
            <span className="cancel-hint">(Esc to cancel)</span>
          </button>
        )}
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
