import { useEffect, useRef, useCallback } from "react";
import type { GraphNode, GraphEdge } from "../types/graph-ir";

interface Props {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  onNodeUpdate: (nodeId: string, updates: Partial<GraphNode>) => void;
  onClose?: () => void;
  style?: React.CSSProperties;
}

const EDGE_LABELS: Record<string, string> = {
  teacher_pupil: "Teacher \u2192 Pupil", chain: "Chain", rivalry: "Rivalry",
  alliance: "Alliance", synthesis: "Synthesis", institutional: "Institutional",
  originates: "Originates", develops: "Develops", contests: "Contests",
  applies: "Applies", extends: "Extends", opposes: "Opposes",
  subsumes: "Subsumes", enables: "Enables", reframes: "Reframes",
  // Note: this must match the labels in DetailPanel.tsx and GraphCanvas.tsx
};

const ZWS = "\u200B"; // zero-width space for empty lines

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Style inline markdown — keeps all syntax characters visible but styled */
function styleInline(escaped: string): string {
  escaped = escaped.replace(
    /\*\*(.+?)\*\*/g,
    '<span class="md-syn">**</span><strong>$1</strong><span class="md-syn">**</span>'
  );
  escaped = escaped.replace(
    /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
    '<span class="md-syn">*</span><em>$1</em><span class="md-syn">*</span>'
  );
  escaped = escaped.replace(
    /`(.+?)`/g,
    '<span class="md-syn">`</span><code>$1</code><span class="md-syn">`</span>'
  );
  return escaped;
}

/** Render a single line of markdown as styled HTML inside a <div>. */
function highlightLine(line: string): string {
  if (line === "") return `<div>${ZWS}</div>`;

  const hMatch = line.match(/^(#{1,4})\s(.*)$/);
  if (hMatch) {
    const lvl = hMatch[1].length;
    return `<div class="md-h${lvl}"><span class="md-syn">${escapeHtml(hMatch[1])}</span> ${styleInline(escapeHtml(hMatch[2]))}</div>`;
  }

  const liMatch = line.match(/^(\s*[-*])\s(.*)$/);
  if (liMatch) {
    return `<div class="md-li"><span class="md-syn">${escapeHtml(liMatch[1])}</span> ${styleInline(escapeHtml(liMatch[2]))}</div>`;
  }

  if (line.startsWith("> ")) {
    return `<div class="md-bq"><span class="md-syn">&gt;</span> ${styleInline(escapeHtml(line.slice(2)))}</div>`;
  }

  return `<div>${styleInline(escapeHtml(line))}</div>`;
}

function highlightMarkdown(md: string): string {
  if (!md) return "";
  return md.split("\n").map(highlightLine).join("");
}

/** Extract clean markdown from the editor's DOM.
 *  Each top-level child div is one line. We read innerText per-div
 *  to avoid the double-newline issue from contentEditable's block elements. */
function extractMarkdown(el: HTMLElement): string {
  const children = el.childNodes;
  if (children.length === 0) return el.innerText?.replace(/\u200B/g, "") ?? "";

  const lines: string[] = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === Node.TEXT_NODE) {
      // Bare text node (before any div is created, e.g. first line)
      const text = (child.textContent ?? "").replace(/\u200B/g, "");
      if (text) lines.push(text);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName;
      if (tag === "BR") {
        // Trailing <br> that browsers add — ignore unless it's meaningful
        if (i < children.length - 1) lines.push("");
      } else {
        // <div>, <p>, etc. — one line
        const text = (el.innerText ?? "").replace(/\u200B/g, "");
        lines.push(text);
      }
    }
  }
  return lines.join("\n");
}

/** Save cursor as (lineIndex, column) relative to the editor's child divs. */
function saveCursor(el: HTMLElement): { line: number; col: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  let container: Node = range.startContainer;

  // Walk up to find which direct child of `el` contains the cursor
  let lineDiv: Node | null = container;
  while (lineDiv && lineDiv.parentNode !== el) {
    lineDiv = lineDiv.parentNode;
  }

  if (!lineDiv) {
    // Cursor is in a bare text node directly under el (no div wrapper yet)
    // This happens on the very first line before Enter is pressed
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    return { line: 0, col: pre.toString().length };
  }

  // Find the line index
  let line = 0;
  let sibling: Node | null = el.firstChild;
  while (sibling && sibling !== lineDiv) {
    line++;
    sibling = sibling.nextSibling;
  }

  // Find column offset within this div
  const pre = range.cloneRange();
  pre.selectNodeContents(lineDiv);
  pre.setEnd(range.startContainer, range.startOffset);
  const col = pre.toString().length;

  return { line, col };
}

/** Restore cursor to (lineIndex, column) within the editor's child divs. */
function restoreCursor(el: HTMLElement, pos: { line: number; col: number }) {
  const sel = window.getSelection();
  if (!sel) return;

  const children = el.childNodes;
  if (children.length === 0) return;

  // Clamp line index
  const lineIndex = Math.min(pos.line, children.length - 1);
  const lineNode = children[lineIndex];
  if (!lineNode) return;

  // Walk text nodes within this line div to find the column offset
  const targetCol = pos.col;
  let cur = 0;
  const walker = document.createTreeWalker(lineNode, NodeFilter.SHOW_TEXT);
  let textNode: Text | null;
  while ((textNode = walker.nextNode() as Text | null)) {
    const text = textNode.textContent ?? "";
    // Skip zero-width spaces in offset counting
    const visibleLen = text.replace(/\u200B/g, "").length;
    if (cur + visibleLen >= targetCol) {
      // Find the actual offset within this text node accounting for ZWS
      let actualOffset = 0;
      let visibleSeen = 0;
      const needed = targetCol - cur;
      for (let i = 0; i < text.length; i++) {
        if (visibleSeen >= needed) break;
        if (text[i] !== "\u200B") visibleSeen++;
        actualOffset = i + 1;
      }
      const range = document.createRange();
      range.setStart(textNode, Math.min(actualOffset, text.length));
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    cur += visibleLen;
  }

  // Past end — place at end of this line
  const range = document.createRange();
  range.selectNodeContents(lineNode);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function NotesPane({ node, edges, nodes, onNodeUpdate }: Props) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const notesRef = useRef(node.notes ?? "");
  const isComposingRef = useRef(false);

  const save = useCallback((text: string) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onNodeUpdate(node.id, { notes: text || undefined });
    }, 500);
  }, [node.id, onNodeUpdate]);

  /** Re-render the editor HTML from its current text, preserving cursor. */
  const rerender = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isComposingRef.current) return; // don't disrupt IME

    const md = extractMarkdown(el);
    notesRef.current = md;
    const cursor = saveCursor(el);
    el.innerHTML = highlightMarkdown(md);
    if (cursor) restoreCursor(el, cursor);
  }, []);

  // Init / node switch
  useEffect(() => {
    notesRef.current = node.notes ?? "";
    if (editorRef.current) {
      editorRef.current.innerHTML = highlightMarkdown(node.notes ?? "");
    }
  }, [node.id]);

  useEffect(() => { editorRef.current?.focus(); }, []);

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    if (isComposingRef.current) return;

    // Re-highlight immediately on every input
    rerender();

    const md = notesRef.current;
    save(md);
  };

  const handleBlur = () => {
    rerender();
    save(notesRef.current);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Prevent browser's default <div><br></div> insertion — it breaks our
      // line-per-div structure. Instead, manually insert a newline by splitting
      // the current line at the cursor position.
      e.preventDefault();
      const el = editorRef.current;
      if (!el) return;

      const cursor = saveCursor(el);
      const md = extractMarkdown(el);
      if (!cursor) {
        // Fallback: append newline at end
        notesRef.current = md + "\n";
        el.innerHTML = highlightMarkdown(notesRef.current);
        restoreCursor(el, { line: md.split("\n").length, col: 0 });
        save(notesRef.current);
        return;
      }

      // Convert (line, col) to a flat offset, insert \n, re-render
      const lines = md.split("\n");
      const lineIdx = Math.min(cursor.line, lines.length - 1);
      const col = Math.min(cursor.col, lines[lineIdx]?.length ?? 0);

      // Build new text with the newline inserted
      const before = lines.slice(0, lineIdx).join("\n")
        + (lineIdx > 0 ? "\n" : "")
        + lines[lineIdx].slice(0, col);
      const after = lines[lineIdx].slice(col)
        + (lineIdx < lines.length - 1 ? "\n" : "")
        + lines.slice(lineIdx + 1).join("\n");

      notesRef.current = before + "\n" + after;
      el.innerHTML = highlightMarkdown(notesRef.current);
      restoreCursor(el, { line: lineIdx + 1, col: 0 });
      save(notesRef.current);
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
        <div
          ref={editorRef}
          className="notes-rendered notes-inline-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; handleInput(); }}
          spellCheck
        />
      </div>
    </div>
  );
}
