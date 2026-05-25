import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { GraphNode, GraphEdge } from "../types/graph-ir";
import { EDGE_LABELS } from "../utils/edge-labels";
import { postToSwift } from "../utils/swiftBridge";

interface Props {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  onNodeUpdate: (nodeId: string, updates: Partial<GraphNode>) => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}

type Mode = "edit" | "preview";

export function NotesPane({ node, edges, nodes, onNodeUpdate }: Props) {
  // key on node.id so switching nodes re-mounts the editor with fresh state.
  return <NotesPaneInner key={node.id} node={node} edges={edges} nodes={nodes} onNodeUpdate={onNodeUpdate} />;
}

function NotesPaneInner({ node, edges, nodes, onNodeUpdate }: Props) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const [content, setContent] = useState<string>(node.notes ?? "");
  const [attachedPath, setAttachedPath] = useState<string | undefined>(node.notes_file);
  const [mode, setMode] = useState<Mode>("preview");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist debounced edits. When a file is attached we also write through to
  // the source file; otherwise the text lives inline on the node.
  const save = useCallback(
    (newContent: string, path: string | undefined) => {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onNodeUpdate(node.id, { notes: newContent || undefined });
        if (path) {
          postToSwift("writeNotesFile", JSON.stringify({ path, content: newContent }));
        }
      }, 500);
    },
    [node.id, onNodeUpdate],
  );

  // On mount / path change: if a file is attached, pull its content from disk
  // and overwrite the inline notes. This makes the file the source of truth
  // any time the pane opens.
  useEffect(() => {
    if (!attachedPath) return;
    const onRead = (e: Event) => {
      const detail = (e as CustomEvent).detail as { nodeId: string; path: string; content: string; exists: boolean };
      if (detail.nodeId !== node.id) return;
      if (detail.exists) {
        setContent(detail.content);
        onNodeUpdate(node.id, { notes: detail.content || undefined });
      }
    };
    window.addEventListener("notesFileRead", onRead);
    postToSwift("readNotesFile", JSON.stringify({ nodeId: node.id, path: attachedPath }));
    return () => window.removeEventListener("notesFileRead", onRead);
  }, [attachedPath, node.id, onNodeUpdate]);

  // Handle attach-completion (Swift fires this after the file picker returns).
  useEffect(() => {
    const onAttached = (e: Event) => {
      const detail = (e as CustomEvent).detail as { nodeId: string; path: string; content: string };
      if (detail.nodeId !== node.id) return;
      setAttachedPath(detail.path);
      setContent(detail.content);
      onNodeUpdate(node.id, { notes_file: detail.path, notes: detail.content || undefined });
    };
    window.addEventListener("notesFileAttached", onAttached);
    return () => window.removeEventListener("notesFileAttached", onAttached);
  }, [node.id, onNodeUpdate]);

  const onContentChange = (val: string) => {
    setContent(val);
    save(val, attachedPath);
  };

  const onAttachClick = () => {
    postToSwift("attachNotesFile", JSON.stringify({ nodeId: node.id }));
  };

  // Detach: drop the file reference but KEEP the loaded text inline. The user
  // can edit or re-attach later — no work is lost.
  const onDetachClick = () => {
    setAttachedPath(undefined);
    onNodeUpdate(node.id, { notes_file: undefined });
  };

  const toggleMode = () => {
    setMode((m) => (m === "edit" ? "preview" : "edit"));
  };

  // When entering edit mode, focus the textarea.
  useEffect(() => {
    if (mode === "edit") textareaRef.current?.focus();
  }, [mode]);

  const edgeNotes = edges
    .filter((e) => e.note)
    .map((e) => {
      const otherId = e.from === node.id ? e.to : e.from;
      const otherNode = nodeMap.get(otherId);
      const label = EDGE_LABELS[e.edge_type] ?? e.edge_type;
      const direction = e.from === node.id ? "→" : "←";
      return { label: `${label} ${direction} ${otherNode?.name ?? otherId}`, note: e.note! };
    });

  const attachedBasename = attachedPath ? attachedPath.split("/").pop() ?? attachedPath : undefined;

  return (
    <div className="notes-pane">
      <div className="notes-pane-header">
        <span className="notes-pane-title">Notes: {node.name}</span>
        <div className="notes-pane-actions">
          {attachedPath ? (
            <>
              <span className="notes-attached-file" title={attachedPath}>
                {attachedBasename}
              </span>
              <button className="notes-pane-btn" onClick={onDetachClick} title="Detach file (keep content)">
                Detach
              </button>
            </>
          ) : (
            <button className="notes-pane-btn" onClick={onAttachClick} title="Attach a markdown file">
              Attach .md
            </button>
          )}
          <button
            className="notes-pane-btn notes-pane-btn-primary"
            onClick={toggleMode}
            title={mode === "edit" ? "Show rendered markdown" : "Edit markdown source"}
          >
            {mode === "edit" ? "Preview" : "Edit"}
          </button>
        </div>
      </div>

      {edgeNotes.length > 0 && (
        <div className="notes-context">
          <div className="field-label" style={{ marginBottom: 6 }}>Relationship Context</div>
          {edgeNotes.map((en, i) => (
            <div key={i} className="context-note">
              <span className="context-label">{en.label}</span>
              <span className="context-text">{en.note}</span>
            </div>
          ))}
        </div>
      )}

      <div className="notes-content">
        {mode === "edit" ? (
          <textarea
            ref={textareaRef}
            className="notes-editor"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder={attachedPath ? `Editing ${attachedBasename}...` : "Write markdown here. Use **bold**, _italic_, [links](url), # headings, - lists..."}
            spellCheck={false}
          />
        ) : (
          <div className="notes-preview">
            {content.trim() ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <em className="notes-preview-empty">No notes. Click Edit to add some.</em>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
