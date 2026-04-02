import { useTheme, THEMES } from "../theme/ThemeContext";
import type { Stream, Classifier } from "../types/graph-ir";

interface Props {
  streams: Stream[];
  edgeTypes: string[];
  classifiers: Classifier[];
  onClose: () => void;
}

export function SettingsModal({ streams, edgeTypes, classifiers, onClose }: Props) {
  const {
    theme,
    setThemeId,
    look,
    setLook,
    edgeColorOverrides,
    setEdgeColorOverrides,
    streamColorOverrides,
    setStreamColorOverrides,
    classifierColorOverrides,
    setClassifierColorOverrides,
  } = useTheme();

  const regionClassifiers = classifiers.filter((c) => c.layout === "region" || c.layout === "region-column");

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
              className={`export-option-btn ${look === "mindmap" ? "active" : ""}`}
              onClick={() => setLook("mindmap")}
            >Mind Map</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            {look === "formal"
              ? "Precise geometric shapes and straight edges"
              : "Smooth blob nodes with flowing branch-like edges"}
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

        {/* Region/column colors */}
        {regionClassifiers.length > 0 && regionClassifiers.map((cls) => (
          <div key={cls.id} className="settings-section">
            <div className="field-label" style={{ marginBottom: 8 }}>
              {cls.label} Colors
            </div>
            {cls.values.map((rv) => (
              <div key={rv.id} className="color-row">
                <span className="color-row-label">{rv.label}</span>
                <input
                  type="color"
                  value={classifierColorOverrides[rv.id] ?? rv.color ?? "#666666"}
                  onChange={(e) =>
                    setClassifierColorOverrides({ ...classifierColorOverrides, [rv.id]: e.target.value })
                  }
                />
                {classifierColorOverrides[rv.id] && (
                  <button
                    className="color-reset-btn"
                    onClick={() => {
                      const next = { ...classifierColorOverrides };
                      delete next[rv.id];
                      setClassifierColorOverrides(next);
                    }}
                    title="Reset to default"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
