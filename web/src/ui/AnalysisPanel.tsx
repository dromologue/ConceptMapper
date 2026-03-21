import { useState, useMemo } from "react";
import type { NetworkAnalysis, PathResult } from "../utils/graph-analysis";
import type { GraphNode, NodeTypeConfig } from "../types/graph-ir";

interface Props {
  analysis: NetworkAnalysis | null;
  nodes: GraphNode[];
  nodeTypeConfigs: NodeTypeConfig[];
  analysisNodeTypes: Set<string> | null; // null = all types
  onSetAnalysisNodeTypes: (types: Set<string> | null) => void;
  selectedNodeId: string | null;
  pathResult: PathResult | null;
  onSelectNode: (nodeId: string) => void;
  onHighlightCommunity: (communityIndex: number | null) => void;
  onFocusCommunity: (memberIds: string[]) => void;
  highlightedCommunity: number | null;
  communityOverlay: boolean;
  onToggleCommunityOverlay: () => void;
  onFindPath: (fromId: string, toId: string) => void;
  onClearPath: () => void;
  pathFrom: string | null;
  pathTo: string | null;
  onSetPathFrom: (id: string | null) => void;
  onSetPathTo: (id: string | null) => void;
}

type SortKey = "name" | "connections" | "bridge" | "influence" | "reach";

const COMMUNITY_COLORS = [
  "#4A90D9", "#50C878", "#E67E22", "#9B59B6", "#E74C3C",
  "#1ABC9C", "#F1C40F", "#2ECC71", "#E91E63", "#00BCD4",
  "#FF5722", "#795548", "#607D8B", "#CDDC39", "#FF9800",
];

export function communityColor(index: number): string {
  return COMMUNITY_COLORS[index % COMMUNITY_COLORS.length];
}

export function AnalysisPanel({
  analysis, nodes, nodeTypeConfigs, analysisNodeTypes, onSetAnalysisNodeTypes,
  selectedNodeId, pathResult,
  onSelectNode, onHighlightCommunity, onFocusCommunity, highlightedCommunity,
  communityOverlay, onToggleCommunityOverlay,
  onFindPath, onClearPath, pathFrom, pathTo, onSetPathFrom, onSetPathTo,
}: Props) {
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [rankingsOpen, setRankingsOpen] = useState(true);
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const [pathOpen, setPathOpen] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("connections");
  const [sortAsc, setSortAsc] = useState(false);
  const [showAllRankings, setShowAllRankings] = useState(false);

  const rankings = useMemo(() => {
    if (!analysis) return [];
    return nodes.map((n) => ({
      id: n.id,
      name: n.name,
      connections: analysis.degreeCounts.get(n.id) ?? 0,
      bridge: analysis.betweenness.get(n.id) ?? 0,
      influence: analysis.eigenvector.get(n.id) ?? 0,
      reach: analysis.closeness.get(n.id) ?? 0,
    })).sort((a, b) => {
      const va = a[sortKey] as number | string;
      const vb = b[sortKey] as number | string;
      const cmp = typeof va === "string" ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
      return sortAsc ? cmp : -cmp;
    });
  }, [analysis, nodes, sortKey, sortAsc]);

  const communityGroups = useMemo(() => {
    if (!analysis) return [];
    const groups = new Map<number, string[]>();
    for (const [id, comm] of analysis.communities) {
      const list = groups.get(comm) ?? [];
      list.push(id);
      groups.set(comm, list);
    }
    return [...groups.entries()]
      .map(([idx, members]) => ({ index: idx, members, names: members.map((id) => nodes.find((n) => n.id === id)?.name ?? id) }))
      .sort((a, b) => b.members.length - a.members.length);
  }, [analysis, nodes]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const fmt = (v: number, decimals = 2) => v < 0.01 && v > 0 ? "<0.01" : v.toFixed(decimals);

  if (!analysis) return <div className="analysis-panel"><div className="analysis-empty">Load a graph to see analysis</div></div>;

  const displayedRankings = showAllRankings ? rankings : rankings.slice(0, 8);

  return (
    <div className="analysis-panel">
      <div className="analysis-header">Network Analysis</div>

      {/* Node type filter */}
      {nodeTypeConfigs.length > 1 && (
        <div className="analysis-type-filter">
          <button
            className={`analysis-type-btn ${analysisNodeTypes === null ? "active" : ""}`}
            onClick={() => onSetAnalysisNodeTypes(null)}
          >All</button>
          {nodeTypeConfigs.map((nt) => (
            <button
              key={nt.id}
              className={`analysis-type-btn ${analysisNodeTypes?.has(nt.id) ? "active" : ""}`}
              onClick={() => {
                if (analysisNodeTypes?.has(nt.id) && analysisNodeTypes.size === 1) {
                  onSetAnalysisNodeTypes(null); // deselecting last type → show all
                } else if (analysisNodeTypes === null) {
                  onSetAnalysisNodeTypes(new Set([nt.id])); // from all → select one
                } else if (analysisNodeTypes.has(nt.id)) {
                  const next = new Set(analysisNodeTypes);
                  next.delete(nt.id);
                  onSetAnalysisNodeTypes(next); // deselect
                } else {
                  const next = new Set(analysisNodeTypes);
                  next.add(nt.id);
                  onSetAnalysisNodeTypes(next); // add
                }
              }}
            >{nt.label}</button>
          ))}
        </div>
      )}

      {/* Overview */}
      <div className="analysis-section">
        <div className="analysis-section-header" onClick={() => setOverviewOpen(!overviewOpen)}>
          <span>Overview</span>
          <span className={`sidebar-chevron ${overviewOpen ? "open" : ""}`}>{overviewOpen ? "▲" : "▼"}</span>
        </div>
        {overviewOpen && (
          <div className="analysis-section-body">
            <div className="analysis-stat"><span className="analysis-stat-label">Nodes</span><span className="analysis-stat-value">{analysis.nodeCount}</span></div>
            <div className="analysis-stat"><span className="analysis-stat-label">Edges</span><span className="analysis-stat-value">{analysis.edgeCount}</span></div>
            <div className="analysis-stat"><span className="analysis-stat-label">Density</span><span className="analysis-stat-value">{fmt(analysis.density)}</span></div>
            <div className="analysis-stat"><span className="analysis-stat-label">Avg Degree</span><span className="analysis-stat-value">{fmt(analysis.avgDegree, 1)}</span></div>
            <div className="analysis-stat"><span className="analysis-stat-label">Diameter</span><span className="analysis-stat-value">{analysis.diameter}</span></div>
            <div className="analysis-stat"><span className="analysis-stat-label">Modularity</span><span className="analysis-stat-value">{fmt(analysis.modularityScore)}</span></div>
            <div className="analysis-stat"><span className="analysis-stat-label">Communities</span><span className="analysis-stat-value">{analysis.communityCount}</span></div>
          </div>
        )}
      </div>

      {/* Node Rankings */}
      <div className="analysis-section">
        <div className="analysis-section-header" onClick={() => setRankingsOpen(!rankingsOpen)}>
          <span>Node Rankings</span>
          <span className={`sidebar-chevron ${rankingsOpen ? "open" : ""}`}>{rankingsOpen ? "▲" : "▼"}</span>
        </div>
        {rankingsOpen && (
          <div className="analysis-section-body">
            <table className="analysis-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("name")} className="analysis-th-sortable">Name{sortKey === "name" ? (sortAsc ? " ↑" : " ↓") : ""}</th>
                  <th onClick={() => handleSort("connections")} className="analysis-th-sortable" title="Degree: number of connections">Conn{sortKey === "connections" ? (sortAsc ? " ↑" : " ↓") : ""}</th>
                  <th onClick={() => handleSort("bridge")} className="analysis-th-sortable" title="Betweenness centrality: bridge/bottleneck score">Bridge{sortKey === "bridge" ? (sortAsc ? " ↑" : " ↓") : ""}</th>
                  <th onClick={() => handleSort("influence")} className="analysis-th-sortable" title="Eigenvector centrality: connected to important nodes">Infl{sortKey === "influence" ? (sortAsc ? " ↑" : " ↓") : ""}</th>
                  <th onClick={() => handleSort("reach")} className="analysis-th-sortable" title="Closeness centrality: average distance to all nodes">Reach{sortKey === "reach" ? (sortAsc ? " ↑" : " ↓") : ""}</th>
                </tr>
              </thead>
              <tbody>
                {displayedRankings.map((r) => (
                  <tr key={r.id} className={`analysis-row ${r.id === selectedNodeId ? "analysis-row-selected" : ""}`} onClick={() => onSelectNode(r.id)}>
                    <td className="analysis-cell-name">{r.name}</td>
                    <td>{r.connections}</td>
                    <td>{fmt(r.bridge)}</td>
                    <td>{fmt(r.influence)}</td>
                    <td>{fmt(r.reach)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rankings.length > 8 && (
              <button className="analysis-show-all" onClick={() => setShowAllRankings(!showAllRankings)}>
                {showAllRankings ? "Show Top 8" : `Show All (${rankings.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Communities */}
      <div className="analysis-section">
        <div className="analysis-section-header" onClick={() => setCommunitiesOpen(!communitiesOpen)}>
          <span>Communities ({analysis.communityCount})</span>
          <span className={`sidebar-chevron ${communitiesOpen ? "open" : ""}`}>{communitiesOpen ? "▲" : "▼"}</span>
        </div>
        {communitiesOpen && (
          <div className="analysis-section-body">
            <label className="analysis-toggle">
              <input type="checkbox" checked={communityOverlay} onChange={onToggleCommunityOverlay} />
              <span>Color by community</span>
            </label>
            {communityGroups.map((g) => (
              <div
                key={g.index}
                className={`analysis-community-item ${highlightedCommunity === g.index ? "active" : ""}`}
              >
                <span
                  className="analysis-community-dot"
                  style={{ backgroundColor: communityColor(g.index) }}
                  onClick={() => onHighlightCommunity(highlightedCommunity === g.index ? null : g.index)}
                  title="Highlight this community"
                />
                <span
                  className="analysis-community-label"
                  onClick={() => onFocusCommunity(g.members)}
                  title="Focus on this community"
                >
                  {g.names.slice(0, 3).join(", ")}{g.names.length > 3 ? ` +${g.names.length - 3}` : ""}
                </span>
                <span className="analysis-community-count">{g.members.length}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Path Finder */}
      <div className="analysis-section">
        <div className="analysis-section-header" onClick={() => setPathOpen(!pathOpen)}>
          <span>Path Finder</span>
          <span className={`sidebar-chevron ${pathOpen ? "open" : ""}`}>{pathOpen ? "▲" : "▼"}</span>
        </div>
        {pathOpen && (
          <div className="analysis-section-body">
            <div className="analysis-path-selector">
              <div className="editor-field">
                <label>From</label>
                <select
                  value={pathFrom ?? ""}
                  onChange={(e) => onSetPathFrom(e.target.value || null)}
                >
                  <option value="">Select node...</option>
                  {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
              <div className="editor-field">
                <label>To</label>
                <select
                  value={pathTo ?? ""}
                  onChange={(e) => onSetPathTo(e.target.value || null)}
                >
                  <option value="">Select node...</option>
                  {nodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
              <div className="analysis-path-actions">
                <button
                  className="sidebar-action-btn"
                  disabled={!pathFrom || !pathTo || pathFrom === pathTo}
                  onClick={() => pathFrom && pathTo && onFindPath(pathFrom, pathTo)}
                >Find Path</button>
                {pathResult && <button className="sidebar-action-btn" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }} onClick={onClearPath}>Clear</button>}
              </div>
            </div>
            {pathResult && (
              <div className="analysis-path-result">
                {pathResult.distance === Infinity ? (
                  <div className="analysis-path-no-route">No path exists between these nodes</div>
                ) : (
                  <>
                    <div className="analysis-stat"><span className="analysis-stat-label">Distance</span><span className="analysis-stat-value">{pathResult.distance} steps</span></div>
                    <div className="analysis-stat"><span className="analysis-stat-label">Routes</span><span className="analysis-stat-value">{pathResult.paths.length}</span></div>
                    {pathResult.fragileEdge && (
                      <div className="analysis-stat">
                        <span className="analysis-stat-label">Weakest Link</span>
                        <span className="analysis-stat-value">
                          {nodes.find((n) => n.id === pathResult.fragileEdge!.from)?.name ?? pathResult.fragileEdge.from}
                          {" → "}
                          {nodes.find((n) => n.id === pathResult.fragileEdge!.to)?.name ?? pathResult.fragileEdge.to}
                        </span>
                      </div>
                    )}
                    <div className="analysis-path-chain">
                      {pathResult.paths[0].map((id, i) => (
                        <span key={id}>
                          <span className="analysis-path-node" onClick={() => onSelectNode(id)}>
                            {nodes.find((n) => n.id === id)?.name ?? id}
                          </span>
                          {i < pathResult.paths[0].length - 1 && <span className="analysis-path-arrow"> → </span>}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
