import { useState } from "react";
import type { WorkflowyOutlineNode } from "../types/bridge-protocol";
import { useSecondBrainStore } from "../stores/useSecondBrainStore";

interface Props {
  nodeId: string;
  nodeUrl: string;
}

export function WorkflowyOutlinePane({ nodeUrl }: Props) {
  const { outlineCache } = useSecondBrainStore();
  const outline = nodeUrl ? (outlineCache[nodeUrl] ?? null) : null;

  if (!nodeUrl) return null;

  return (
    <div className="workflowy-outline-pane">
      {!outline && (
        <div className="workflowy-outline-empty">Loading outline…</div>
      )}
      {outline && outline.length === 0 && (
        <div className="workflowy-outline-empty">No items found.</div>
      )}
      {outline && outline.length > 0 && (
        <div className="workflowy-outline-tree">
          {outline.map((n) => (
            <OutlineNode key={n.id} node={n} depth={0} />
          ))}
        </div>
      )}
      <div className="workflowy-readonly-notice">Read-only — edit in Workflowy</div>
    </div>
  );
}

function OutlineNode({ node, depth }: { node: WorkflowyOutlineNode; depth: number }) {
  const [collapsed, setCollapsed] = useState(depth > 1);
  const hasChildren = node.children.length > 0;

  return (
    <div className="outline-node" style={{ paddingLeft: `${depth * 14}px` }}>
      <div className="outline-node-row">
        {hasChildren ? (
          <button
            className="outline-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "▶" : "▼"}
          </button>
        ) : (
          <span className="outline-toggle-spacer" />
        )}
        <span className="outline-node-name">{node.name || "(unnamed)"}</span>
      </div>
      {node.description && !collapsed && (
        <div className="outline-node-desc" style={{ paddingLeft: `${14}px` }}>
          {node.description}
        </div>
      )}
      {hasChildren && !collapsed && (
        <div className="outline-children">
          {node.children.map((child) => (
            <OutlineNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
