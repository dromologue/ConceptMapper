import { useState } from "react";
import { useTheme, THEMES } from "../theme/ThemeContext";
import { useLLM } from "../llm/LLMContext";
import { PROVIDER_DEFAULTS } from "../llm/constants";
import type { Stream } from "../types/graph-ir";
import type { LLMProviderType, LLMConfig } from "../types/llm";

interface Props {
  streams: Stream[];
  edgeTypes: string[];
  onClose: () => void;
}

function validateKeyFormat(provider: LLMProviderType, key: string): { valid: boolean; hint?: string } {
  if (!key.trim()) return { valid: false, hint: "Paste your API key above" };
  const defaults = PROVIDER_DEFAULTS[provider];
  if (defaults.keyPrefix && !key.startsWith(defaults.keyPrefix)) {
    return { valid: false, hint: `Key should start with "${defaults.keyPrefix}"` };
  }
  if (key.length < 20) return { valid: false, hint: "Key looks too short" };
  return { valid: true };
}

export function SettingsModal({ streams, edgeTypes, onClose }: Props) {
  const {
    theme,
    setThemeId,
    edgeColorOverrides,
    setEdgeColorOverrides,
    streamColorOverrides,
    setStreamColorOverrides,
  } = useTheme();

  const { config, updateLLMConfig } = useLLM();

  const llm = config?.llm;
  const [provider, setProvider] = useState<LLMProviderType>(llm?.provider ?? "anthropic");
  const [apiKey, setApiKey] = useState(llm?.apiKey ?? "");
  const [model, setModel] = useState(llm?.model ?? PROVIDER_DEFAULTS.anthropic.model);
  const [baseUrl, setBaseUrl] = useState(llm?.baseUrl ?? "");
  const [temperature, setTemperature] = useState(llm?.temperature ?? 0.3);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");

  const defaults = PROVIDER_DEFAULTS[provider];
  const needsKey = provider !== "ollama";
  const keyValidation = needsKey ? validateKeyFormat(provider, apiKey) : { valid: true };
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleProviderChange = (p: LLMProviderType) => {
    setProvider(p);
    const d = PROVIDER_DEFAULTS[p];
    setModel(d.model);
    setBaseUrl(d.baseUrl ?? "");
    setTestStatus("idle");
    setTestError("");
  };

  const buildConfig = (): LLMConfig => {
    const llmConfig: LLMConfig = { provider, model, temperature };
    if (apiKey && needsKey) llmConfig.apiKey = apiKey;
    if (baseUrl) llmConfig.baseUrl = baseUrl;
    return llmConfig;
  };

  const handleSaveLLM = () => {
    updateLLMConfig(buildConfig());
  };

  const openKeyUrl = () => {
    if (!defaults.helpUrl) return;
    const isNative = !!(window as unknown as Record<string, unknown>).webkit;
    if (isNative) {
      const webkit = (window as unknown as Record<string, unknown>).webkit as
        | { messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }> }
        | undefined;
      if (webkit?.messageHandlers?.openURL) {
        webkit.messageHandlers.openURL.postMessage(defaults.helpUrl);
        return;
      }
    }
    window.open(defaults.helpUrl, "_blank");
  };

  const runTest = (configOverride?: LLMConfig) => {
    setTestStatus("testing");
    setTestError("");

    const testConfig = configOverride ?? buildConfig();

    const win = window as unknown as Record<string, unknown>;
    const isNative = !!(window as unknown as Record<string, unknown>).webkit;

    if (isNative) {
      win.llmTestResult = (data: { success: boolean; error?: string }) => {
        if (data.success) {
          setTestStatus("success");
          // Auto-save on successful test
          updateLLMConfig(testConfig);
        } else {
          setTestStatus("error");
          const raw = data.error ?? "Connection failed";
          setTestError(friendlyError(raw, provider));
        }
      };
      const webkit = (window as unknown as Record<string, unknown>).webkit as
        | { messageHandlers?: Record<string, { postMessage: (msg: unknown) => void }> }
        | undefined;
      webkit?.messageHandlers?.llmTestConnection?.postMessage(
        JSON.stringify({ config: JSON.stringify(testConfig) })
      );
    } else if (provider === "ollama") {
      const endpoint = baseUrl || "http://localhost:11434";
      fetch(`${endpoint}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Say hello in one word." }],
          stream: false,
        }),
      })
        .then((res) => {
          if (res.ok) {
            setTestStatus("success");
            updateLLMConfig(testConfig);
          } else {
            setTestStatus("error");
            setTestError(friendlyError(`HTTP ${res.status}`, "ollama"));
          }
        })
        .catch((err) => {
          setTestStatus("error");
          setTestError(friendlyError(err.message, "ollama"));
        });
    } else {
      setTestStatus("error");
      setTestError("Browser mode only supports Ollama. Use the macOS app for Anthropic/OpenAI.");
    }
  };

  const handleKeyPaste = (newKey: string) => {
    setApiKey(newKey);
    setTestStatus("idle");
    setTestError("");
    // Auto-test when a valid-looking key is pasted
    const trimmed = newKey.trim();
    if (trimmed.length > 20 && (!defaults.keyPrefix || trimmed.startsWith(defaults.keyPrefix))) {
      const autoConfig: LLMConfig = { provider, model, temperature, apiKey: trimmed };
      if (baseUrl) autoConfig.baseUrl = baseUrl;
      setTimeout(() => runTest(autoConfig), 100);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
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

        {/* LLM Configuration */}
        <div className="settings-section">
          <div className="field-label" style={{ marginBottom: 8 }}>LLM Configuration</div>

          <div className="settings-field">
            <label className="settings-field-label">Provider</label>
            <select
              className="settings-input"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as LLMProviderType)}
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>

          {/* Simple key flow for Anthropic / OpenAI */}
          {needsKey && (
            <>
              {/* Step 1: Big button to get the key */}
              {defaults.helpUrl && !apiKey && (
                <button className="settings-get-key-btn" onClick={openKeyUrl}>
                  {provider === "anthropic"
                    ? "1. Get your Anthropic API key"
                    : "1. Get your OpenAI API key"}
                </button>
              )}

              {/* Step 2: Paste field */}
              <div className="settings-field">
                <label className="settings-field-label">
                  {!apiKey && defaults.helpUrl ? "2. Paste it here" : "API Key"}
                </label>
                <input
                  className={`settings-input settings-input-key ${apiKey && !keyValidation.valid ? "settings-input-warn" : ""} ${testStatus === "success" ? "settings-input-ok" : ""}`}
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleKeyPaste(e.target.value)}
                  placeholder={defaults.keyFormatHint ?? "Paste API key"}
                />
              </div>

              {/* Status line */}
              <div className="settings-key-status">
                {testStatus === "testing" && <span className="settings-status-inline">Testing key...</span>}
                {testStatus === "success" && <span className="settings-status-inline settings-status-ok">Connected and saved!</span>}
                {testStatus === "error" && <span className="settings-status-inline settings-status-err">{testError}</span>}
                {apiKey && !keyValidation.valid && keyValidation.hint && testStatus === "idle" && (
                  <span className="settings-status-inline settings-field-warn">{keyValidation.hint}</span>
                )}
              </div>
            </>
          )}

          {/* Ollama: just needs the server running */}
          {!needsKey && (
            <div className="settings-setup-guide">
              <span className="settings-setup-title">Ollama runs locally -- no API key needed.</span>
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-secondary, #999)" }}>
                Install from ollama.com, then run: <code>ollama pull {model}</code>
              </div>
            </div>
          )}

          {/* Advanced: model, temperature, base URL */}
          <button
            className="settings-advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "Hide" : "Show"} advanced options
          </button>

          {showAdvanced && (
            <>
              <div className="settings-field">
                <label className="settings-field-label">Model</label>
                <input
                  className="settings-input"
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={defaults.model}
                  list={`model-suggestions-${provider}`}
                />
                <datalist id={`model-suggestions-${provider}`}>
                  {defaults.modelSuggestions.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>

              {(provider === "ollama" || baseUrl) && (
                <div className="settings-field">
                  <label className="settings-field-label">Base URL</label>
                  <input
                    className="settings-input"
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={defaults.baseUrl ?? "https://api.openai.com/v1"}
                  />
                </div>
              )}

              <div className="settings-field">
                <label className="settings-field-label">Temperature: {temperature.toFixed(1)}</label>
                <input
                  className="settings-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
              </div>
            </>
          )}

          <div className="settings-actions">
            <button className="settings-btn" onClick={handleSaveLLM}>Save</button>
            <button
              className="settings-btn settings-btn-secondary"
              onClick={() => runTest()}
              disabled={testStatus === "testing" || (needsKey && !keyValidation.valid)}
            >
              {testStatus === "testing" ? "Testing..." : "Test Connection"}
            </button>
            {testStatus === "success" && <span className="settings-status settings-status-ok">Connected!</span>}
            {testStatus === "error" && <span className="settings-status settings-status-err" title={testError}>{testError}</span>}
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

/** Map raw error strings to user-friendly messages */
function friendlyError(raw: string, provider: LLMProviderType | string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("invalid api key")) {
    return provider === "anthropic"
      ? "Invalid API key. Check it starts with sk-ant- and hasn't expired."
      : "Invalid API key. Check the key and try again.";
  }
  if (lower.includes("429") || lower.includes("rate limit")) {
    return "Rate limited. Wait a moment and try again.";
  }
  if (lower.includes("402") || lower.includes("payment")) {
    return "Payment required. Add a payment method to your account.";
  }
  if (lower.includes("fetch") || lower.includes("network") || lower.includes("econnrefused")) {
    if (provider === "ollama") return "Cannot reach Ollama. Is it running? (ollama serve)";
    return "Network error. Check your internet connection.";
  }
  if (lower.includes("model") && lower.includes("not found")) {
    return `Model "${lower}" not found. Check the model name.`;
  }
  return raw.length > 80 ? raw.slice(0, 77) + "..." : raw;
}
