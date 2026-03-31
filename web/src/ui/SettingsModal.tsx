import { useTheme, THEMES } from "../theme/ThemeContext";
import type { Stream } from "../types/graph-ir";

interface Props {
  streams: Stream[];
  edgeTypes: string[];
  onClose: () => void;
}

export function SettingsModal({ streams, edgeTypes, onClose }: Props) {
  const {
    theme,
    setThemeId,
    look,
    setLook,
    edgeColorOverrides,
    setEdgeColorOverrides,
    streamColorOverrides,
    setStreamColorOverrides,
  } = useTheme();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* Look & Feel */}
        <div className="settings-section">
          <div className="field-label" style={{ marginBottom: 8 }}>Look &amp; Feel</div>
          <div className="export-options">
            <button
              className={`export-option-btn ${look === "formal" ? "active" : ""}`}
              onClick={() => setLook("formal")}
            >Formal</button>
            <button
              className={`export-option-btn ${look === "organic" ? "active" : ""}`}
              onClick={() => setLook("organic")}
            >Organic</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            {look === "formal" ? "Precise geometric shapes and straight edges" : "Hand-drawn shapes with curved, tapered edges"}
          </div>
        </div>

        {/* Theme picker */}
        <div className="settings-section">
          <div className="field-label" style={{ marginBottom: 8 }}>Theme</div>
          <div className="theme-grid">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-swatch ${t.id === theme.id ? "theme-swatch-active" : ""}`}
                onClick={() => setThemeId(t.id)}
                title={t.name}
              >
                <span
                  className="swatch-preview"
                  style={{
                    background: `linear-gradient(135deg, ${t.bgBody} 50%, ${t.bgPanel} 50%)`,
                    borderColor: t.accent,
                  }}
                />
                <span className="swatch-label">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stream colors */}
        {streams.length > 0 && (
          <div className="settings-section">
            <div className="field-label" style={{ marginBottom: 8 }}>Stream Colors</div>
            {streams.map((s) => (
              <div key={s.id} className="color-row">
                <span className="color-row-label">{s.name}</span>
                <input
                  type="color"
                  value={streamColorOverrides[s.id] ?? s.color ?? "#666666"}
                  onChange={(e) =>
                    setStreamColorOverrides({ ...streamColorOverrides, [s.id]: e.target.value })
                  }
                />
                {streamColorOverrides[s.id] && (
                  <button
                    className="color-reset-btn"
                    onClick={() => {
                      const next = { ...streamColorOverrides };
                      delete next[s.id];
                      setStreamColorOverrides(next);
                    }}
                    title="Reset to default"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Edge type colors */}
        {edgeTypes.length > 0 && (
          <div className="settings-section">
            <div className="field-label" style={{ marginBottom: 8 }}>Edge Type Colors</div>
            {edgeTypes.map((et) => (
              <div key={et} className="color-row">
                <span className="color-row-label">{et.replace(/_/g, " ")}</span>
                <input
                  type="color"
                  value={edgeColorOverrides[et] ?? "#555555"}
                  onChange={(e) =>
                    setEdgeColorOverrides({ ...edgeColorOverrides, [et]: e.target.value })
                  }
                />
                {edgeColorOverrides[et] && (
                  <button
                    className="color-reset-btn"
                    onClick={() => {
                      const next = { ...edgeColorOverrides };
                      delete next[et];
                      setEdgeColorOverrides(next);
                    }}
                    title="Reset to default"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
