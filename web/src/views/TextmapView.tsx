import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { GraphIR, GraphNode, NodeTypeConfig, EdgeTypeConfig } from "../types/graph-ir";
import ReactMarkdown from "react-markdown";
import { postToSwift, subscribe } from "../utils/swiftBridge";
import { IconNotes } from "../ui/Icons";
import {
  indexNodes,
  connectionsOf,
  groupConnections,
  findRoots,
  MAX_TEXTMAP_DEPTH,
} from "./textmap";

interface Props {
  data: GraphIR;
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNode | null) => void;
  /** Persist node edits (notes). Same handler the canvas/NotesPane use. */
  onNodeUpdate?: (nodeId: string, updates: Partial<GraphNode>) => void;
  /** Open the Add Node dialog (template-driven fields + link dropdown). */
  onAddNode?: () => void;
  nodeTypeConfigs?: NodeTypeConfig[];
  edgeTypeConfigs?: EdgeTypeConfig[];
}

/**
 * Outline ("textmap") projection of the concept graph. Each node lists its
 * connected nodes, grouped by relationship; each connection expands to reveal
 * its own connections, enabling navigation across the whole graph. Cycles are
 * handled by tracking the ancestor path: a connection back to an ancestor is
 * shown as a leaf loop-link rather than expanded, so recursion cannot run away.
 */
export function TextmapView({
  data,
  selectedNodeId,
  onSelectNode,
  onNodeUpdate,
  onAddNode,
  nodeTypeConfigs,
  edgeTypeConfigs,
}: Props) {
  const byId = useMemo(() => indexNodes(data.nodes), [data.nodes]);
  const iconFor = useCallback(
    (typeId: string) => {
      const c = nodeTypeConfigs?.find((t) => t.id === typeId);
      return c?.icon ?? c?.label?.[0] ?? "•";
    },
    [nodeTypeConfigs],
  );

  // Current focus root (null = show all roots) and the trail that led here.
  const [rootId, setRootId] = useState<string | null>(null);
  const [trail, setTrail] = useState<GraphNode[]>([]);
  // Expanded rows keyed by full ancestor path so the same node can be open
  // independently in different branches.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((pathKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pathKey)) next.delete(pathKey);
      else next.add(pathKey);
      return next;
    });
  }, []);

  // Rows whose inline notes editor is open, keyed by ancestor path.
  const [notesOpen, setNotesOpen] = useState<Set<string>>(new Set());
  const toggleNotes = useCallback((pathKey: string) => {
    setNotesOpen((prev) => {
      const next = new Set(prev);
      if (next.has(pathKey)) next.delete(pathKey);
      else next.add(pathKey);
      return next;
    });
  }, []);

  const focus = useCallback(
    (node: GraphNode) => {
      setTrail((t) => [...t, node]);
      setRootId(node.id);
      setExpanded(new Set());
      onSelectNode(node);
    },
    [onSelectNode],
  );

  const goToTrail = useCallback(
    (index: number) => {
      // index -1 = "All roots"; otherwise jump back to that trail entry.
      setExpanded(new Set());
      if (index < 0) {
        setTrail([]);
        setRootId(null);
        return;
      }
      const sliced = trail.slice(0, index + 1);
      setTrail(sliced);
      setRootId(sliced[sliced.length - 1]?.id ?? null);
    },
    [trail],
  );

  const roots: GraphNode[] = useMemo(() => {
    if (rootId) {
      const r = byId.get(rootId);
      return r ? [r] : [];
    }
    return findRoots(data);
  }, [rootId, byId, data]);

  return (
    <div className="textmap" role="tree" aria-label="Concept outline">
      <div className="textmap-breadcrumb">
        <button className="textmap-crumb" onClick={() => goToTrail(-1)}>
          All roots
        </button>
        {trail.map((n, i) => (
          <span key={`${n.id}-${i}`}>
            <span className="textmap-crumb-sep">›</span>
            <button className="textmap-crumb" onClick={() => goToTrail(i)}>
              {n.name}
            </button>
          </span>
        ))}
        {onAddNode && (
          <button className="textmap-add-node" onClick={onAddNode} title="Add a node">
            + Node
          </button>
        )}
      </div>

      <div className="textmap-body">
        {roots.length === 0 ? (
          <p className="textmap-empty">No nodes to outline.</p>
        ) : (
          roots.map((r) => (
            <TextmapRow
              key={r.id}
              node={r}
              ancestors={[]}
              depth={0}
              byId={byId}
              edges={data.edges}
              edgeTypeConfigs={edgeTypeConfigs}
              iconFor={iconFor}
              selectedNodeId={selectedNodeId}
              expanded={expanded}
              onToggle={toggle}
              onSelect={onSelectNode}
              onFocus={focus}
              notesOpen={notesOpen}
              onToggleNotes={toggleNotes}
              onNodeUpdate={onNodeUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface RowProps {
  node: GraphNode;
  ancestors: string[];
  depth: number;
  byId: Map<string, GraphNode>;
  edges: GraphIR["edges"];
  edgeTypeConfigs?: EdgeTypeConfig[];
  iconFor: (typeId: string) => string;
  selectedNodeId: string | null;
  expanded: Set<string>;
  onToggle: (pathKey: string) => void;
  onSelect: (node: GraphNode) => void;
  onFocus: (node: GraphNode) => void;
  notesOpen: Set<string>;
  onToggleNotes: (pathKey: string) => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<GraphNode>) => void;
}

function TextmapRow({
  node,
  ancestors,
  depth,
  byId,
  edges,
  edgeTypeConfigs,
  iconFor,
  selectedNodeId,
  expanded,
  onToggle,
  onSelect,
  onFocus,
  notesOpen,
  onToggleNotes,
  onNodeUpdate,
}: RowProps) {
  const pathKey = [...ancestors, node.id].join(">");
  const isOpen = expanded.has(pathKey);
  const notesShown = notesOpen.has(pathKey);
  const hasNotes = Boolean(node.notes?.trim() || node.notes_file);
  // First non-empty line of the notes, for the read-at-a-glance preview.
  const notePreview =
    node.notes?.split("\n").find((l) => l.trim())?.trim().slice(0, 140) ?? "";
  const ancestorSet = useMemo(() => new Set(ancestors), [ancestors]);

  const groups = useMemo(
    () => groupConnections(connectionsOf(node.id, edges, byId), edgeTypeConfigs),
    [node.id, edges, byId, edgeTypeConfigs],
  );
  const hasChildren = groups.some((g) => g.connections.length > 0);
  const atDepthCap = depth >= MAX_TEXTMAP_DEPTH;
  const canExpand = hasChildren && !atDepthCap;

  return (
    <div className="textmap-node" role="treeitem" aria-expanded={canExpand ? isOpen : undefined}>
      <div className={`textmap-row ${selectedNodeId === node.id ? "selected" : ""}`}>
        <button
          className="textmap-disclosure"
          onClick={() => canExpand && onToggle(pathKey)}
          disabled={!canExpand}
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          {canExpand ? (isOpen ? "▾" : "▸") : "·"}
        </button>
        <span className="textmap-badge" aria-hidden="true">
          {iconFor(node.node_type)}
        </span>
        <button className="textmap-name" onClick={() => onSelect(node)} title="Select">
          {node.name}
        </button>
        {onNodeUpdate && (
          <button
            className={`textmap-note-btn ${hasNotes ? "has-notes" : ""} ${notesShown ? "active" : ""}`}
            onClick={() => onToggleNotes(pathKey)}
            title={hasNotes ? "Read / edit notes" : "Add notes"}
            aria-label={`Notes for ${node.name}`}
          >
            <IconNotes size={14} />
          </button>
        )}
        <button
          className="textmap-focus"
          onClick={() => onFocus(node)}
          title="Focus here"
          aria-label={`Focus on ${node.name}`}
        >
          ⤢
        </button>
      </div>

      {onNodeUpdate && hasNotes && !notesShown && (
        <button
          className="textmap-notes-preview"
          onClick={() => onToggleNotes(pathKey)}
          title="Expand notes"
        >
          <IconNotes size={12} className="textmap-notes-preview-icon" />
          <span className="textmap-notes-preview-text">
            {notePreview || `Attached: ${node.notes_file?.split("/").pop() ?? "notes"}`}
          </span>
          <span className="textmap-notes-preview-expand">Expand ▸</span>
        </button>
      )}

      {notesShown && onNodeUpdate && (
        <TextmapNotes
          key={node.id}
          node={node}
          onNodeUpdate={onNodeUpdate}
          onCollapse={() => onToggleNotes(pathKey)}
        />
      )}

      {isOpen && canExpand && (
        <div className="textmap-children">
          {groups.map((g) => (
            <div className="textmap-group" key={g.key}>
              <div className="textmap-group-label">
                {g.label} <span className="textmap-count">({g.connections.length})</span>
              </div>
              {g.connections.map((c) => {
                const isLoop = ancestorSet.has(c.node.id);
                if (isLoop) {
                  return (
                    <div className="textmap-loop" key={`${g.key}:${c.node.id}`}>
                      <span className="textmap-loop-glyph" aria-hidden="true">
                        ↺
                      </span>
                      <button className="textmap-name" onClick={() => onFocus(c.node)} title="Loops back — focus here">
                        {c.node.name}
                      </button>
                    </div>
                  );
                }
                return (
                  <TextmapRow
                    key={`${g.key}:${c.node.id}`}
                    node={c.node}
                    ancestors={[...ancestors, node.id]}
                    depth={depth + 1}
                    byId={byId}
                    edges={edges}
                    edgeTypeConfigs={edgeTypeConfigs}
                    iconFor={iconFor}
                    selectedNodeId={selectedNodeId}
                    expanded={expanded}
                    onToggle={onToggle}
                    onSelect={onSelect}
                    onFocus={onFocus}
                    notesOpen={notesOpen}
                    onToggleNotes={onToggleNotes}
                    onNodeUpdate={onNodeUpdate}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type NotesMode = "preview" | "edit";

/**
 * Expanded notes view for a node inside the outline. Opens in a rendered
 * (read) view; offers Edit (toggle to a textarea) and Attach .md. Mirrors the
 * canvas NotesPane's persistence: edits save to the map (via onNodeUpdate, the
 * app's auto-save) and write through to an attached markdown file when present.
 * If a file is attached, its contents are the source of truth on open.
 */
function TextmapNotes({
  node,
  onNodeUpdate,
  onCollapse,
}: {
  node: GraphNode;
  onNodeUpdate: (nodeId: string, updates: Partial<GraphNode>) => void;
  onCollapse: () => void;
}) {
  const [content, setContent] = useState<string>(node.notes ?? "");
  const [attachedPath, setAttachedPath] = useState<string | undefined>(node.notes_file);
  const [mode, setMode] = useState<NotesMode>(
    node.notes?.trim() || node.notes_file ? "preview" : "edit",
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // No re-seed effect needed: the parent renders this with `key={node.id}`, so
  // a different node remounts the component and the useState initializers above
  // re-seed content/attachedPath from the new node.

  // File is the source of truth: pull its contents when opened / path changes.
  useEffect(() => {
    if (!attachedPath) return;
    const unsubscribe = subscribe("notesFileRead", (detail) => {
      if (detail.nodeId !== node.id) return;
      if (detail.exists) {
        setContent(detail.content);
        onNodeUpdate(node.id, { notes: detail.content || undefined });
      }
    });
    postToSwift("readNotesFile", { nodeId: node.id, path: attachedPath });
    return unsubscribe;
  }, [attachedPath, node.id, onNodeUpdate]);

  // Attach-completion from the native file picker.
  useEffect(() => {
    const unsubscribe = subscribe("notesFileAttached", (detail) => {
      if (detail.nodeId !== node.id) return;
      setAttachedPath(detail.path);
      setContent(detail.content);
      onNodeUpdate(node.id, { notes_file: detail.path, notes: detail.content || undefined });
      setMode("preview");
    });
    return unsubscribe;
  }, [node.id, onNodeUpdate]);

  const save = (val: string, path: string | undefined) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onNodeUpdate(node.id, { notes: val || undefined });
      if (path) postToSwift("writeNotesFile", { path, content: val });
    }, 500);
  };
  const onChange = (val: string) => {
    setContent(val);
    save(val, attachedPath);
  };

  const onAttach = () => postToSwift("attachNotesFile", { nodeId: node.id });
  const onDetach = () => {
    setAttachedPath(undefined);
    onNodeUpdate(node.id, { notes_file: undefined });
  };

  const filename = attachedPath?.split("/").pop();

  return (
    <div className="textmap-notes">
      <div className="textmap-notes-header">
        <span className="textmap-notes-title">Notes</span>
        <div className="textmap-notes-actions">
          {attachedPath ? (
            <>
              <span className="textmap-notes-filename" title={attachedPath}>{filename}</span>
              <button className="textmap-notes-btn" onClick={onDetach} title="Detach file (keep content)">
                Detach
              </button>
            </>
          ) : (
            <button className="textmap-notes-btn" onClick={onAttach} title="Attach a markdown file">
              Attach .md
            </button>
          )}
          <button
            className="textmap-notes-btn"
            onClick={() => setMode((m) => (m === "edit" ? "preview" : "edit"))}
            title={mode === "edit" ? "Show rendered notes" : "Edit notes"}
          >
            {mode === "edit" ? "Preview" : "Edit"}
          </button>
          <button className="textmap-notes-btn" onClick={onCollapse} title="Collapse" aria-label="Collapse notes">
            ▾
          </button>
        </div>
      </div>
      <div className="textmap-notes-body">
        {mode === "edit" ? (
          <textarea
            className="textmap-notes-editor"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={attachedPath ? `Editing ${filename}…` : "Write markdown notes…"}
            spellCheck={false}
            autoFocus
          />
        ) : content.trim() ? (
          <div className="textmap-notes-rendered">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        ) : (
          <em className="textmap-notes-empty">No notes yet. Click Edit to add some.</em>
        )}
      </div>
    </div>
  );
}
