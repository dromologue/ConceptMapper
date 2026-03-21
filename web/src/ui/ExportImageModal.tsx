import { useState } from "react";

export type ExportFormat = "png" | "pdf";
export type ExportBackground = "as-viewed" | "custom";

export interface ExportImageOptions {
  format: ExportFormat;
  background: ExportBackground;
  customColor: string;
  scale: number; // 1 or 2
}

interface Props {
  onExport: (options: ExportImageOptions) => void;
  onCancel: () => void;
  currentBgColor: string;
}

export function ExportImageModal({ onExport, onCancel, currentBgColor }: Props) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [background, setBackground] = useState<ExportBackground>("as-viewed");
  const [customColor, setCustomColor] = useState("#ffffff");
  const [scale, setScale] = useState(2);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal export-image-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">Export Image</div>
        <div className="modal-body">
          <div className="export-field">
            <label>Format</label>
            <div className="export-options">
              <button
                className={`export-option-btn ${format === "png" ? "active" : ""}`}
                onClick={() => setFormat("png")}
              >PNG</button>
              <button
                className={`export-option-btn ${format === "pdf" ? "active" : ""}`}
                onClick={() => setFormat("pdf")}
              >PDF</button>
            </div>
          </div>

          <div className="export-field">
            <label>Background</label>
            <div className="export-options">
              <button
                className={`export-option-btn ${background === "as-viewed" ? "active" : ""}`}
                onClick={() => setBackground("as-viewed")}
              >
                <span className="export-color-swatch" style={{ backgroundColor: currentBgColor }} />
                As Viewed
              </button>
              <button
                className={`export-option-btn ${background === "custom" ? "active" : ""}`}
                onClick={() => setBackground("custom")}
              >
                <span className="export-color-swatch" style={{ backgroundColor: customColor }} />
                Custom
              </button>
            </div>
            {background === "custom" && (
              <input
                type="color"
                className="export-color-picker"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
              />
            )}
          </div>

          <div className="export-field">
            <label>Resolution</label>
            <div className="export-options">
              <button
                className={`export-option-btn ${scale === 1 ? "active" : ""}`}
                onClick={() => setScale(1)}
              >1x</button>
              <button
                className={`export-option-btn ${scale === 2 ? "active" : ""}`}
                onClick={() => setScale(2)}
              >2x (Retina)</button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onCancel}>Cancel</button>
          <button
            className="modal-confirm-btn"
            onClick={() => onExport({ format, background, customColor, scale })}
          >Export</button>
        </div>
      </div>
    </div>
  );
}
