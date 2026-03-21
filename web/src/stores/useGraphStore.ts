import { create } from 'zustand';
import type { GraphIR, GraphNode, GraphEdge } from '../types/graph-ir';
import type { FilterState } from '../utils/filters';
import { createEmptyFilterState } from '../utils/filters';
import { useUIStore } from './useUIStore';

export type InteractionMode = "normal" | "add-edge-source" | "add-edge-target";

function mergeNodeUpdate(node: GraphNode, updates: Partial<GraphNode>): GraphNode {
  const merged = { ...node, ...updates };
  if (updates.properties && node.properties) {
    merged.properties = { ...node.properties, ...updates.properties };
  }
  return merged;
}

interface GraphState {
  graphData: GraphIR | null;
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  edgePopoverPos: { x: number; y: number } | null;
  viewMode: string;
  revealedNodes: Set<string>;
  collapsedNodes: Set<string>;
  edgeSource: string | null;
  edgeTarget: string | null;
  interactionMode: InteractionMode;
  filters: FilterState;
  centerOnNode: { id: string; ts: number } | null;

  // Core setters
  setGraphData: (data: GraphIR | null) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setViewMode: (mode: string) => void;
  setFilters: (fn: FilterState | ((prev: FilterState) => FilterState)) => void;
  setCenterOnNode: (v: { id: string; ts: number } | null) => void;

  // Node operations
  handleSelectNode: (node: GraphNode | null) => void;
  handleNodeUpdate: (nodeId: string, updates: Partial<GraphNode>) => void;
  handleAddNode: (nodeType: string, name: string, stream: string, generation: number, properties: Record<string, string | undefined>) => void;
  handleDeleteNode: (nodeId: string) => void;
  handleNavigateToNode: (nodeId: string) => void;
  handleCloseNode: () => void;

  // Edge operations
  handleAddEdge: (edgeType: string, weight: number, template: { edge_types?: { id: string; directed: boolean; style?: string; color?: string }[] } | null) => void;
  handleDeleteEdge: (fromId: string, toId: string) => void;
  handleEdgeUpdate: (fromId: string, toId: string, updates: Partial<GraphEdge>) => void;
  handleSelectEdge: (edge: GraphEdge | null, pos?: { x: number; y: number }) => void;

  // Interaction mode
  handleStartAddEdge: () => void;
  handleCancelAddEdge: () => void;

  // Collapse
  toggleCollapse: (nodeId: string) => void;

  // Filter handlers
  handleStreamToggle: (streamId: string, allStreamIds: string[]) => void;
  handleGenerationToggle: (gen: number, allGens: number[]) => void;
  handleAttributeToggle: (nodeType: string, field: string, value: string, allValues: string[]) => void;
  handleDateRangeChange: (nodeType: string, fromField: string, toField: string | undefined, bound: "from" | "to", value: string) => void;
  handleShowAllFilters: () => void;

  // Search select
  handleSearchSelect: (node: GraphNode) => void;

  // Undo/Redo (placeholder for Step 10)
  history: GraphIR[];
  future: GraphIR[];
  pushState: () => void;
  undo: () => void;
  redo: () => void;
}

function getEdgeVisual(edgeType: string) {
  if (edgeType === "rivalry" || edgeType === "opposes") {
    return { style: "dashed", color: "#D94A4A", show_arrow: false };
  }
  if (edgeType === "alliance" || edgeType === "institutional") {
    return { style: "dotted", color: "#999999", show_arrow: false };
  }
  return { style: "solid", show_arrow: true };
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graphData: null,
  selectedNode: null,
  selectedEdge: null,
  edgePopoverPos: null,
  viewMode: 'full',
  revealedNodes: new Set(),
  collapsedNodes: new Set(),
  edgeSource: null,
  edgeTarget: null,
  interactionMode: 'normal' as InteractionMode,
  filters: createEmptyFilterState(),
  centerOnNode: null,

  setGraphData: (data) => set({ graphData: data }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setViewMode: (mode) => set({ viewMode: mode, revealedNodes: new Set() }),
  setFilters: (fn) => set((s) => ({
    filters: typeof fn === 'function' ? fn(s.filters) : fn,
  })),
  setCenterOnNode: (v) => set({ centerOnNode: v }),

  handleSelectNode: (node) => {
    const s = get();
    if (s.interactionMode === 'add-edge-source' && node) {
      set({ edgeSource: node.id, interactionMode: 'add-edge-target' });
      return;
    }
    if (s.interactionMode === 'add-edge-target' && node) {
      set({ edgeTarget: node.id, interactionMode: 'normal' });
      // Open the add edge modal via UI store
      useUIStore.getState().openModal('addEdge');
      return;
    }

    set({ selectedNode: node });

    if (node && s.viewMode !== 'full' && s.graphData) {
      const connected = new Set<string>();
      s.graphData.edges.forEach((e) => {
        if (e.from === node.id) connected.add(e.to);
        if (e.to === node.id) connected.add(e.from);
      });
      set((prev) => {
        const next = new Set(prev.revealedNodes);
        connected.forEach((id) => next.add(id));
        return { revealedNodes: next };
      });
    }
  },

  handleNodeUpdate: (nodeId, updates) => {
    const s = get();
    if (!s.graphData) return;
    s.pushState();
    set({
      graphData: {
        ...s.graphData,
        nodes: s.graphData.nodes.map((n) =>
          n.id === nodeId ? mergeNodeUpdate(n, updates) : n
        ),
      },
      selectedNode: s.selectedNode?.id === nodeId
        ? mergeNodeUpdate(s.selectedNode, updates)
        : s.selectedNode,
    });
  },

  handleAddNode: (nodeType, name, stream, generation, properties) => {
    const s = get();
    if (!s.graphData) return;
    s.pushState();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const newNode: GraphNode = { id, node_type: nodeType, name, generation, stream, properties: { ...properties } };
    set({
      graphData: { ...s.graphData, nodes: [...s.graphData.nodes, newNode] },
      selectedNode: newNode,
    });
    // Close modal via UI store

    useUIStore.getState().closeModal();
  },

  handleDeleteNode: (nodeId) => {
    const s = get();
    if (!s.graphData) return;
    s.pushState();
    set({
      graphData: {
        ...s.graphData,
        nodes: s.graphData.nodes.filter((n) => n.id !== nodeId),
        edges: s.graphData.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
      },
      selectedNode: null,
    });

    useUIStore.getState().setNotesOpen(false);
  },

  handleNavigateToNode: (nodeId) => {
    const s = get();
    if (!s.graphData) return;
    const node = s.graphData.nodes.find((n) => n.id === nodeId);
    if (node) {
      const next = new Set(s.revealedNodes);
      next.add(nodeId);
      set({ selectedNode: node, revealedNodes: next });
    }
  },

  handleCloseNode: () => {
    set({ selectedNode: null });

    useUIStore.getState().setNotesOpen(false);
  },

  handleAddEdge: (edgeType, weight = 1.0, template) => {
    const s = get();
    if (!s.graphData || !s.edgeSource || !s.edgeTarget) return;
    const fromNode = s.graphData.nodes.find((n) => n.id === s.edgeSource);
    const toNode = s.graphData.nodes.find((n) => n.id === s.edgeTarget);
    if (!fromNode || !toNode) return;
    s.pushState();

    const edgeTypeConfig = template?.edge_types?.find((e) => e.id === edgeType);
    const directed = edgeTypeConfig ? edgeTypeConfig.directed : !['rivalry', 'alliance', 'institutional', 'opposes'].includes(edgeType);
    const visual = edgeTypeConfig
      ? { style: edgeTypeConfig.style ?? 'solid', color: edgeTypeConfig.color, show_arrow: edgeTypeConfig.directed }
      : getEdgeVisual(edgeType);

    const newEdge: GraphEdge = { from: s.edgeSource, to: s.edgeTarget, edge_type: edgeType, directed, weight, visual };
    set({
      graphData: { ...s.graphData, edges: [...s.graphData.edges, newEdge] },
      edgeSource: null,
      edgeTarget: null,
    });

    useUIStore.getState().closeModal();
  },

  handleDeleteEdge: (fromId, toId) => {
    const s = get();
    if (!s.graphData) return;
    s.pushState();
    set({
      graphData: {
        ...s.graphData,
        edges: s.graphData.edges.filter((e) => !(e.from === fromId && e.to === toId)),
      },
      selectedEdge: null,
      edgePopoverPos: null,
    });
  },

  handleEdgeUpdate: (fromId, toId, updates) => {
    const s = get();
    if (!s.graphData) return;
    s.pushState();
    set({
      graphData: {
        ...s.graphData,
        edges: s.graphData.edges.map((e) =>
          e.from === fromId && e.to === toId ? { ...e, ...updates } : e
        ),
      },
      selectedEdge: s.selectedEdge && s.selectedEdge.from === fromId && s.selectedEdge.to === toId
        ? { ...s.selectedEdge, ...updates }
        : s.selectedEdge,
    });
  },

  handleSelectEdge: (edge, pos) => {
    set({
      selectedEdge: edge,
      edgePopoverPos: pos ?? null,
      selectedNode: edge ? null : get().selectedNode,
    });
    if (edge) {
      useUIStore.getState().setNotesOpen(true);
    }
  },

  handleStartAddEdge: () => set({
    interactionMode: 'add-edge-source',
    edgeSource: null,
    edgeTarget: null,
    selectedNode: null,
  }),

  handleCancelAddEdge: () => {
    set({
      interactionMode: 'normal',
      edgeSource: null,
      edgeTarget: null,
    });

    useUIStore.getState().closeModal();
  },

  toggleCollapse: (nodeId) => set((s) => {
    const next = new Set(s.collapsedNodes);
    if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
    return { collapsedNodes: next };
  }),

  handleStreamToggle: (streamId, allStreamIds) => set((s) => {
    const streams = s.filters.streams;
    if (!streams) {
      const next = new Set(allStreamIds);
      next.delete(streamId);
      return { filters: { ...s.filters, streams: next } };
    }
    const next = new Set(streams);
    if (next.has(streamId)) {
      next.delete(streamId);
    } else {
      next.add(streamId);
      if (next.size >= allStreamIds.length) return { filters: { ...s.filters, streams: null } };
    }
    return { filters: { ...s.filters, streams: next } };
  }),

  handleGenerationToggle: (gen, allGens) => set((s) => {
    const gens = s.filters.generations;
    if (!gens) {
      const next = new Set(allGens);
      next.delete(gen);
      return { filters: { ...s.filters, generations: next } };
    }
    const next = new Set(gens);
    if (next.has(gen)) {
      next.delete(gen);
    } else {
      next.add(gen);
      if (next.size >= allGens.length) return { filters: { ...s.filters, generations: null } };
    }
    return { filters: { ...s.filters, generations: next } };
  }),

  handleAttributeToggle: (nodeType, field, value, allValues) => set((s) => {
    const attrs = [...s.filters.attributes];
    const idx = attrs.findIndex((a) => a.nodeType === nodeType && a.field === field);
    if (idx < 0) {
      const next = new Set(allValues);
      next.delete(value);
      attrs.push({ nodeType, field, values: next });
    } else {
      const current = attrs[idx].values;
      if (!current) {
        const next = new Set(allValues);
        next.delete(value);
        attrs[idx] = { nodeType, field, values: next };
      } else {
        const next = new Set(current);
        if (next.has(value)) {
          next.delete(value);
          attrs[idx] = { nodeType, field, values: next };
        } else {
          next.add(value);
          if (next.size >= allValues.length) {
            attrs.splice(idx, 1);
          } else {
            attrs[idx] = { nodeType, field, values: next };
          }
        }
      }
    }
    return { filters: { ...s.filters, attributes: attrs } };
  }),

  handleDateRangeChange: (nodeType, fromField, toField, bound, value) => set((s) => {
    const ranges = [...s.filters.dateRanges];
    const idx = ranges.findIndex((d) => d.nodeType === nodeType && d.fromField === fromField && d.toField === (toField ?? undefined));
    const current = idx >= 0 ? ranges[idx].range : { from: null, to: null };
    const updated = { ...current, [bound]: value || null };
    if (updated.from === null && updated.to === null) {
      if (idx >= 0) ranges.splice(idx, 1);
    } else if (idx >= 0) {
      ranges[idx] = { nodeType, fromField, toField, range: updated };
    } else {
      ranges.push({ nodeType, fromField, toField, range: updated });
    }
    return { filters: { ...s.filters, dateRanges: ranges } };
  }),

  handleShowAllFilters: () => set({ filters: createEmptyFilterState() }),

  handleSearchSelect: (node) => {
    set({
      selectedNode: node,
      centerOnNode: { id: node.id, ts: Date.now() },
    });

    useUIStore.getState().setSearchQuery('');
    useUIStore.getState().setSearchFocused(false);
  },

  // Undo/Redo
  history: [],
  future: [],
  pushState: () => {
    const s = get();
    if (!s.graphData) return;
    set({
      history: [...s.history.slice(-49), s.graphData],
      future: [],
    });
  },
  undo: () => {
    const s = get();
    if (s.history.length === 0) return;
    const prev = s.history[s.history.length - 1];
    set({
      history: s.history.slice(0, -1),
      future: s.graphData ? [s.graphData, ...s.future] : s.future,
      graphData: prev,
      selectedNode: null,
      selectedEdge: null,
    });
  },
  redo: () => {
    const s = get();
    if (s.future.length === 0) return;
    const next = s.future[0];
    set({
      future: s.future.slice(1),
      history: s.graphData ? [...s.history, s.graphData] : s.history,
      graphData: next,
      selectedNode: null,
      selectedEdge: null,
    });
  },
}));
