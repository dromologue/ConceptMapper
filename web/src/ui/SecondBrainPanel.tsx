import { useState } from "react";
import { useSecondBrainStore } from "../stores/useSecondBrainStore";
import { postToSwift, sendToSwift } from "../utils/swiftBridge";

export function SecondBrainPanel() {
  const { folders, hasWorkflowyKey, isScanning, lastScannedAt, lastFileCount, setIsScanning } =
    useSecondBrainStore();
  const [keyDraft, setKeyDraft] = useState("");
  const [keySaved, setKeySaved] = useState(false);

  function handleAddFolder() {
    postToSwift("addSecondBrainFolder", undefined as unknown as void);
  }

  function handleRemoveFolder(path: string) {
    postToSwift("removeSecondBrainFolder", { path });
  }

  async function handleSaveKey() {
    if (!keyDraft.trim()) return;
    await sendToSwift("saveWorkflowyKey", { key: keyDraft.trim() });
    setKeyDraft("");
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }

  function handleScan() {
    setIsScanning(true);
    postToSwift("scanSecondBrain", undefined as unknown as void);
  }

  const scanStatus = isScanning
    ? "Scanning…"
    : lastScannedAt
    ? `Scanned ${formatTime(lastScannedAt)} · ${lastFileCount} file${lastFileCount === 1 ? "" : "s"}`
    : null;

  return (
    <div className="second-brain-panel">
      <section className="second-brain-section">
        <div className="second-brain-section-label">Watched Folders</div>
        {folders.length === 0 && (
          <div className="second-brain-empty">No folders added yet.</div>
        )}
        {folders.map((f) => (
          <div key={f.path} className="second-brain-folder-row">
            <span className="second-brain-folder-name" title={f.path}>{f.name}</span>
            <button
              className="second-brain-remove-btn"
              onClick={() => handleRemoveFolder(f.path)}
              title="Remove folder"
            >
              ×
            </button>
          </div>
        ))}
        <button className="second-brain-add-btn" onClick={handleAddFolder}>
          + Add Folder
        </button>
      </section>

      <section className="second-brain-section">
        <div className="second-brain-section-label">
          Workflowy API Key
          {hasWorkflowyKey && <span className="second-brain-key-badge">saved</span>}
        </div>
        <div className="second-brain-key-row">
          <input
            type="password"
            className="second-brain-key-input"
            placeholder={hasWorkflowyKey ? "Replace existing key…" : "Paste API key…"}
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveKey(); }}
          />
          <button
            className="second-brain-save-key-btn"
            onClick={handleSaveKey}
            disabled={!keyDraft.trim()}
          >
            {keySaved ? "Saved" : "Save"}
          </button>
        </div>
      </section>

      <section className="second-brain-scan-section">
        <button
          className="second-brain-scan-btn"
          onClick={handleScan}
          disabled={isScanning || folders.length === 0}
        >
          {isScanning ? "Scanning…" : "Scan Now"}
        </button>
        {scanStatus && <div className="second-brain-scan-status">{scanStatus}</div>}
      </section>
    </div>
  );
}

function formatTime(d: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
