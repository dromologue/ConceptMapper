import { useState, useEffect, useRef, useCallback } from "react";
import type { GraphNode, GraphEdge } from "../types/graph-ir";
import { EDGE_LABELS } from "../utils/edge-labels";

interface Props {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  onNodeUpdate: (nodeId: string, updates: Partial<GraphNode>) => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}

interface OutlineItem {
  text: string;
  indent: number; // 0-based indent level
}

/** Parse notes string into outline items. Each line is a bullet; leading 2-space groups = indent. */
function parseOutline(notes: string): OutlineItem[] {
  if (!notes) return [{ text: "", indent: 0 }];
  return notes.split("\n").map((line) => {
    // Count leading "  " pairs OR leading "- " bullet markers
    let stripped = line;
    let indent = 0;
    while (stripped.startsWith("  ")) {
      indent++;
      stripped = stripped.slice(2);
    }
    // Strip leading bullet marker if present
    if (stripped.startsWith("- ")) stripped = stripped.slice(2);
    else if (stripped.startsWith("* ")) stripped = stripped.slice(2);
    return { text: stripped, indent };
  });
}

/** Serialize outline items back to notes string. Uses 2-space indentation + "- " prefix. */
function serializeOutline(items: OutlineItem[]): string {
  return items.map((item) => "  ".repeat(item.indent) + "- " + item.text).join("\n");
}

export function NotesPane({ node, edges, nodes, onNodeUpdate }: Props) {
  return <NotesPaneInner key={node.id} node={node} edges={edges} nodes={nodes} onNodeUpdate={onNodeUpdate} />;
}

function NotesPaneInner({ node, edges, nodes, onNodeUpdate }: Props) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const [items, setItems] = useState<OutlineItem[]>(() => parseOutline(node.notes ?? ""));
  const [focusedLine, setFocusedLine] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  // Focus the right input when focusedLine changes
  useEffect(() => {
    const input = inputRefs.current.get(focusedLine);
    if (input) input.focus();
  }, [focusedLine, items.length]);

  const save = useCallback((newItems: OutlineItem[]) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const text = serializeOutline(newItems);
      onNodeUpdate(node.id, { notes: text || undefined });
    }, 500);
  }, [node.id, onNodeUpdate]);

  const updateItems = (newItems: OutlineItem[]) => {
    setItems(newItems);
    save(newItems);
  };

  const handleTextChange = (index: number, text: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], text };
    updateItems(newItems);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;

    if (e.key === "Tab") {
      e.preventDefault();
      const newItems = [...items];
      if (e.shiftKey) {
        // Outdent (min 0)
        if (newItems[index].indent > 0) {
          newItems[index] = { ...newItems[index], indent: newItems[index].indent - 1 };
          updateItems(newItems);
        }
      } else {
        // Indent (max = parent indent + 1)
        const maxIndent = index > 0 ? newItems[index - 1].indent + 1 : 0;
        if (newItems[index].indent < maxIndent) {
          newItems[index] = { ...newItems[index], indent: newItems[index].indent + 1 };
          updateItems(newItems);
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Split at cursor: text before cursor stays, text after goes to new line
      const cursorPos = input.selectionStart ?? items[index].text.length;
      const textBefore = items[index].text.slice(0, cursorPos);
      const textAfter = items[index].text.slice(cursorPos);
      const newItems = [...items];
      newItems[index] = { ...newItems[index], text: textBefore };
      newItems.splice(index + 1, 0, { text: textAfter, indent: items[index].indent });
      updateItems(newItems);
      setFocusedLine(index + 1);
    } else if (e.key === "Backspace" && input.selectionStart === 0 && input.selectionEnd === 0) {
      e.preventDefault();
      if (items[index].indent > 0) {
        // First outdent
        const newItems = [...items];
        newItems[index] = { ...newItems[index], indent: newItems[index].indent - 1 };
        updateItems(newItems);
      } else if (index > 0) {
        // Merge with previous line
        const newItems = [...items];
        const prevText = newItems[index - 1].text;
        newItems[index - 1] = { ...newItems[index - 1], text: prevText + newItems[index].text };
        newItems.splice(index, 1);
        updateItems(newItems);
        setFocusedLine(index - 1);
        // Set cursor to end of previous text after focus
        setTimeout(() => {
          const prevInput = inputRefs.current.get(index - 1);
          if (prevInput) {
            prevInput.setSelectionRange(prevText.length, prevText.length);
          }
        }, 0);
      }
    } else if (e.key === "ArrowUp") {
      if (index > 0) { e.preventDefault(); setFocusedLine(index - 1); }
    } else if (e.key === "ArrowDown") {
      if (index < items.length - 1) { e.preventDefault(); setFocusedLine(index + 1); }
    }
  };

  const edgeNotes = edges
    .filter((e) => e.note)
    .map((e) => {
      const otherId = e.from === node.id ? e.to : e.from;
      const otherNode = nodeMap.get(otherId);
      const label = EDGE_LABELS[e.edge_type] ?? e.edge_type;
      const direction = e.from === node.id ? "\u2192" : "\u2190";
      return { label: `${label} ${direction} ${otherNode?.name ?? otherId}`, note: e.note! };
    });

  return (
    <div className="notes-pane">
      <div className="notes-pane-header">
        <span className="notes-pane-title">Notes: {node.name}</span>
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
        <div className="outline-editor">
          {items.map((item, i) => (
            <div
              key={i}
              className="outline-item"
              style={{ paddingLeft: item.indent * 20 + 4 }}
            >
              <span className="outline-bullet">&#x2022;</span>
              <input
                ref={(el) => { if (el) inputRefs.current.set(i, el); else inputRefs.current.delete(i); }}
                className="outline-input"
                type="text"
                value={item.text}
                onChange={(e) => handleTextChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={() => setFocusedLine(i)}
                placeholder={i === 0 ? "Start typing..." : ""}
              />
            </div>
          ))}
        </div>
        <div className="outline-hint">
          Tab to indent &middot; Shift+Tab to outdent &middot; Enter for new line
        </div>
      </div>
    </div>
  );
}
