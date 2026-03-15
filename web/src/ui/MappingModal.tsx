import { useState, useCallback, useRef } from "react";
import type { TaxonomyTemplate, ConceptMapData } from "../types/graph-ir";
import type { LLMConfig } from "../types/llm";
import { useLLM } from "../llm/LLMContext";
import { sendLLMMessage, makeRequestId, extractJSON } from "../llm/provider";
import { buildMappingSystemPrompt, buildMappingUserPrompt } from "../llm/prompts";

interface Props {
  /** Current template if one exists; null triggers template picker */
  template: TaxonomyTemplate | null;
  /** All saved templates the user can choose from */
  savedTemplates: TaxonomyTemplate[];
  onResult: (cmData: ConceptMapData, template: TaxonomyTemplate) => void;
  onCancel: () => void;
  isNativeApp: boolean;
  sendToSwift: (handler: string, payload?: unknown) => void;
}

export function MappingModal({ template: initialTemplate, savedTemplates, onResult, onCancel, isNativeApp, sendToSwift }: Props) {
  const { config } = useLLM();
  const [sourceText, setSourceText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "mapping" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TaxonomyTemplate | null>(initialTemplate);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setSourceText(content);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleMap = useCallback(async () => {
    if (!sourceText.trim() || !config?.llm || !selectedTemplate) return;

    setStatus("mapping");
    setErrorMsg("");

    try {
      const systemPrompt = buildMappingSystemPrompt(selectedTemplate);
      const userPrompt = buildMappingUserPrompt(sourceText);

      const response = await sendLLMMessage(
        config.llm as LLMConfig,
        {
          messages: [{ role: "user", content: userPrompt, timestamp: Date.now() }],
          systemPrompt,
          requestId: makeRequestId(),
        },
        { isNativeApp, sendToSwift },
      );

      const jsonStr = extractJSON(response);
      const cmData = JSON.parse(jsonStr) as ConceptMapData;

      if (!cmData.version) cmData.version = "2.0";
      if (!cmData.nodes) cmData.nodes = [];
      if (!cmData.edges) cmData.edges = [];
      if (!cmData.external_shocks) cmData.external_shocks = [];
      if (!cmData.structural_observations) cmData.structural_observations = [];

      onResult(cmData, selectedTemplate);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, [sourceText, config, selectedTemplate, isNativeApp, sendToSwift, onResult]);

  const needsTemplate = !selectedTemplate;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal mapping-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Map Text to Taxonomy</h3>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>

        {/* Step 1: Pick template if none selected */}
        {needsTemplate ? (
          <div className="mapping-template-picker">
            <div className="field-label" style={{ marginBottom: 8 }}>Choose a taxonomy to map into:</div>
            {savedTemplates.length === 0 ? (
              <div className="mapping-empty-templates">
                No saved templates. Create a taxonomy first, then use Map Text.
              </div>
            ) : (
              <div className="mapping-template-list">
                {savedTemplates.map((t, i) => (
                  <button
                    key={i}
                    className="mapping-template-item"
                    onClick={() => setSelectedTemplate(t)}
                  >
                    <span className="mapping-template-title">{t.title}</span>
                    <span className="mapping-meta">
                      {t.node_types.length} types, {t.streams.length} streams, {t.generations.length} horizons
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Selected template info */}
            <div className="mapping-taxonomy-info">
              <span className="field-label">Target: {selectedTemplate.title}</span>
              <span className="mapping-meta">
                {selectedTemplate.node_types.length} types, {selectedTemplate.streams.length} streams, {selectedTemplate.generations.length} horizons
              </span>
              {!initialTemplate && (
                <button
                  className="mapping-change-btn"
                  onClick={() => setSelectedTemplate(null)}
                >
                  Change
                </button>
              )}
            </div>

            {/* Source text input */}
            <div className="mapping-content">
              <div className="mapping-source-actions">
                <button
                  className="settings-btn settings-btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload File
                </button>
                {fileName && <span className="mapping-filename">{fileName}</span>}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.markdown,.text"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </div>
              <textarea
                className="mapping-textarea"
                placeholder="Paste or type your source text here, or upload a file above..."
                value={sourceText}
                onChange={(e) => { setSourceText(e.target.value); setFileName(null); }}
                rows={14}
              />
            </div>

            {/* Actions */}
            <div className="settings-actions">
              <button
                className="settings-btn"
                onClick={handleMap}
                disabled={!sourceText.trim() || status === "mapping"}
              >
                {status === "mapping" ? "Mapping..." : "Map to Taxonomy"}
              </button>
              {status === "error" && (
                <>
                  <span className="settings-status settings-status-err">{errorMsg}</span>
                  <button className="settings-btn settings-btn-secondary" onClick={handleMap}>
                    Try Again
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
