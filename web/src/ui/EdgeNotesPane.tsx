import { useState, useEffect, useRef, useCallback } from "react";
import type { GraphEdge, GraphNode } from "../types/graph-ir";

interface Props {
  edge: GraphEdge;
  nodes: GraphNode[];
  onEdgeUpdate: (fromId: string, toId: string, updates: Partial<GraphEdge>) => void;
}

interface OutlineItem {
  text: string;
  indent: number;
}

function parseOutline(notes: string): OutlineItem[] {
  if (!notes) return [{ text: "", indent: 0 }];
  return notes.split("\n").map((line) => {
    let stripped = line;
    let indent = 0;
    while (stripped.startsWith("  ")) { indent++; stripped = stripped.slice(2); }
    if (stripped.startsWith("- ")) stripped = stripped.slice(2);
    else if (stripped.startsWith("* ")) stripped = stripped.slice(2);
    return { text: stripped, indent };
  });
}

function serializeOutline(items: OutlineItem[]): string {
  return items.map((item) => "  ".repeat(item.indent) + "- " + item.text).join("\n");
}

export function EdgeNotesPane({ edge, nodes, onEdgeUpdate }: Props) {
  const edgeKey = `${edge.from}|${edge.to}`;
  return <EdgeNotesPaneInner key={edgeKey} edge={edge} nodes={nodes} onEdgeUpdate={onEdgeUpdate} />;
}

function EdgeNotesPaneInner({ edge, nodes, onEdgeUpdate }: Props) {
  const fromNode = nodes.find((n) => n.id === edge.from);
  const toNode = nodes.find((n) => n.id === edge.to);
  const [items, setItems] = useState<OutlineItem[]>(() => parseOutline(edge.note ?? ""));
  const [focusedLine, setFocusedLine] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  useEffect(() => {
    const input = inputRefs.current.get(focusedLine);
    if (input) input.focus();
  }, [focusedLine, items.length]);

  const save = useCallback((newItems: OutlineItem[]) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const text = serializeOutline(newItems);
      onEdgeUpdate(edge.from, edge.to, { note: text || undefined });
    }, 500);
  }, [edge.from, edge.to, onEdgeUpdate]);

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
        if (newItems[index].indent > 0) {
          newItems[index] = { ...newItems[index], indent: newItems[index].indent - 1 };
          updateItems(newItems);
        }
      } else {
        const maxIndent = index > 0 ? newItems[index - 1].indent + 1 : 0;
        if (newItems[index].indent < maxIndent) {
          newItems[index] = { ...newItems[index], indent: newItems[index].indent + 1 };
          updateItems(newItems);
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
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
        const newItems = [...items];
        newItems[index] = { ...newItems[index], indent: newItems[index].indent - 1 };
        updateItems(newItems);
      } else if (index > 0) {
        const newItems = [...items];
        const prevText = newItems[index - 1].text;
        newItems[index - 1] = { ...newItems[index - 1], text: prevText + newItems[index].text };
        newItems.splice(index, 1);
        updateItems(newItems);
        setFocusedLine(index - 1);
        setTimeout(() => {
          const prevInput = inputRefs.current.get(index - 1);
          if (prevInput) prevInput.setSelectionRange(prevText.length, prevText.length);
        }, 0);
      }
    } else if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault(); setFocusedLine(index - 1);
    } else if (e.key === "ArrowDown" && index < items.length - 1) {
      e.preventDefault(); setFocusedLine(index + 1);
    }
  };

  return (
    <div className="notes-pane">
      <div className="notes-pane-header">
        <span className="notes-pane-title">
          Edge: {fromNode?.name ?? edge.from} → {toNode?.name ?? edge.to}
        </span>
        <span className="edge-notes-type">{edge.edge_type}</span>
      </div>
      <div className="notes-content">
        <div className="outline-editor">
          {items.map((item, i) => (
            <div key={i} className="outline-item" style={{ paddingLeft: item.indent * 20 + 4 }}>
              <span className="outline-bullet">&#x2022;</span>
              <input
                ref={(el) => { if (el) inputRefs.current.set(i, el); else inputRefs.current.delete(i); }}
                className="outline-input"
                type="text"
                value={item.text}
                onChange={(e) => handleTextChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={() => setFocusedLine(i)}
                placeholder={i === 0 ? "Add edge notes..." : ""}
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
