import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from '../../stores/useGraphStore';
import { useUIStore } from '../../stores/useUIStore';
import type { GraphIR } from '../../types/graph-ir';

const sampleGraph: GraphIR = {
  version: '2.0',
  metadata: {
    title: 'Test',
    generations: [{ number: 1 }],
    streams: [{ id: 's1', name: 'Stream 1' }],
    external_shocks: [],
    structural_observations: [],
  },
  nodes: [
    { id: 'n1', node_type: 'person', name: 'Alice', generation: 1, stream: 's1', properties: { importance: 'major' } },
    { id: 'n2', node_type: 'person', name: 'Bob', generation: 1, stream: 's1', properties: {} },
  ],
  edges: [
    { from: 'n1', to: 'n2', edge_type: 'chain', directed: true, weight: 1, visual: { style: 'solid', show_arrow: true } },
  ],
};

// Capture initial state once for resets
const initialGraphState = useGraphStore.getState();
const initialUIState = useUIStore.getState();

beforeEach(() => {
  useGraphStore.setState(initialGraphState, true);
  useUIStore.setState(initialUIState, true);
});

describe('useGraphStore', () => {
  describe('initial state', () => {
    it('has null graphData', () => {
      expect(useGraphStore.getState().graphData).toBeNull();
    });

    it('has null selectedNode', () => {
      expect(useGraphStore.getState().selectedNode).toBeNull();
    });

    it('has normal interactionMode', () => {
      expect(useGraphStore.getState().interactionMode).toBe('normal');
    });

    it('has empty filters', () => {
      const { filters } = useGraphStore.getState();
      expect(filters.streams).toBeNull();
      expect(filters.generations).toBeNull();
      expect(filters.attributes).toEqual([]);
      expect(filters.dateRanges).toEqual([]);
    });

    it('has empty history and future', () => {
      expect(useGraphStore.getState().history).toEqual([]);
      expect(useGraphStore.getState().future).toEqual([]);
    });
  });

  describe('setGraphData', () => {
    it('sets graph data correctly', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      expect(useGraphStore.getState().graphData).toEqual(sampleGraph);
    });

    it('can set graph data to null', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().setGraphData(null);
      expect(useGraphStore.getState().graphData).toBeNull();
    });
  });

  describe('handleAddNode', () => {
    it('adds a node to graphData and closes the modal', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useUIStore.getState().openModal('addNode');

      useGraphStore.getState().handleAddNode('person', 'Charlie', 's1', 1, { importance: 'minor' });

      const state = useGraphStore.getState();
      expect(state.graphData!.nodes).toHaveLength(3);
      const added = state.graphData!.nodes.find((n) => n.name === 'Charlie');
      expect(added).toBeDefined();
      expect(added!.id).toBe('charlie');
      expect(added!.node_type).toBe('person');
      expect(added!.properties).toEqual({ importance: 'minor' });
      // selectedNode set to new node
      expect(state.selectedNode?.id).toBe('charlie');
      // modal closed
      expect(useUIStore.getState().activeModal).toBeNull();
    });

    it('does nothing when graphData is null', () => {
      useGraphStore.getState().handleAddNode('person', 'Charlie', 's1', 1, {});
      expect(useGraphStore.getState().graphData).toBeNull();
    });
  });

  describe('handleDeleteNode', () => {
    it('removes the node and connected edges', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().handleDeleteNode('n1');

      const state = useGraphStore.getState();
      expect(state.graphData!.nodes).toHaveLength(1);
      expect(state.graphData!.nodes[0].id).toBe('n2');
      // Edge n1->n2 should be removed
      expect(state.graphData!.edges).toHaveLength(0);
      expect(state.selectedNode).toBeNull();
    });

    it('does nothing when graphData is null', () => {
      useGraphStore.getState().handleDeleteNode('n1');
      expect(useGraphStore.getState().graphData).toBeNull();
    });
  });

  describe('handleNodeUpdate', () => {
    it('updates node properties', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().handleNodeUpdate('n1', { name: 'Alice Updated' });

      const node = useGraphStore.getState().graphData!.nodes.find((n) => n.id === 'n1');
      expect(node!.name).toBe('Alice Updated');
    });

    it('merges properties correctly', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().handleNodeUpdate('n1', { properties: { role: 'protagonist' } });

      const node = useGraphStore.getState().graphData!.nodes.find((n) => n.id === 'n1');
      expect(node!.properties).toEqual({ importance: 'major', role: 'protagonist' });
    });

    it('updates selectedNode when it matches the updated node', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().setSelectedNode(sampleGraph.nodes[0]);
      useGraphStore.getState().handleNodeUpdate('n1', { name: 'Alice v2' });

      expect(useGraphStore.getState().selectedNode!.name).toBe('Alice v2');
    });
  });

  describe('handleAddEdge', () => {
    it('adds an edge between source and target', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.setState({ edgeSource: 'n2', edgeTarget: 'n1' });

      useGraphStore.getState().handleAddEdge('chain', 0.5, null);

      const edges = useGraphStore.getState().graphData!.edges;
      expect(edges).toHaveLength(2);
      const newEdge = edges.find((e) => e.from === 'n2' && e.to === 'n1');
      expect(newEdge).toBeDefined();
      expect(newEdge!.edge_type).toBe('chain');
      expect(newEdge!.weight).toBe(0.5);
      // Source/target cleared
      expect(useGraphStore.getState().edgeSource).toBeNull();
      expect(useGraphStore.getState().edgeTarget).toBeNull();
    });

    it('does nothing without edgeSource/edgeTarget', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().handleAddEdge('chain', 1, null);
      expect(useGraphStore.getState().graphData!.edges).toHaveLength(1);
    });
  });

  describe('handleDeleteEdge', () => {
    it('removes the specified edge', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().handleDeleteEdge('n1', 'n2');

      expect(useGraphStore.getState().graphData!.edges).toHaveLength(0);
    });
  });

  describe('handleEdgeUpdate', () => {
    it('updates edge properties', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().handleEdgeUpdate('n1', 'n2', { weight: 5 });

      const edge = useGraphStore.getState().graphData!.edges[0];
      expect(edge.weight).toBe(5);
      expect(edge.edge_type).toBe('chain'); // unchanged
    });
  });

  describe('handleStartAddEdge', () => {
    it('sets interactionMode to add-edge-source', () => {
      useGraphStore.getState().handleStartAddEdge();
      const state = useGraphStore.getState();
      expect(state.interactionMode).toBe('add-edge-source');
      expect(state.edgeSource).toBeNull();
      expect(state.edgeTarget).toBeNull();
      expect(state.selectedNode).toBeNull();
    });
  });

  describe('handleCancelAddEdge', () => {
    it('resets interactionMode to normal', () => {
      useGraphStore.getState().handleStartAddEdge();
      useGraphStore.getState().handleCancelAddEdge();

      const state = useGraphStore.getState();
      expect(state.interactionMode).toBe('normal');
      expect(state.edgeSource).toBeNull();
      expect(state.edgeTarget).toBeNull();
    });
  });

  describe('Undo/Redo', () => {
    it('undo restores previous state after adding a node', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().handleAddNode('person', 'Charlie', 's1', 1, {});

      expect(useGraphStore.getState().graphData!.nodes).toHaveLength(3);

      useGraphStore.getState().undo();

      expect(useGraphStore.getState().graphData!.nodes).toHaveLength(2);
      expect(useGraphStore.getState().selectedNode).toBeNull();
    });

    it('redo restores the added node after undo', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().handleAddNode('person', 'Charlie', 's1', 1, {});
      useGraphStore.getState().undo();
      useGraphStore.getState().redo();

      expect(useGraphStore.getState().graphData!.nodes).toHaveLength(3);
    });

    it('undo does nothing when history is empty', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().undo();
      expect(useGraphStore.getState().graphData).toEqual(sampleGraph);
    });

    it('redo does nothing when future is empty', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().redo();
      expect(useGraphStore.getState().graphData).toEqual(sampleGraph);
    });

    it('history is capped at 50 entries', () => {
      useGraphStore.getState().setGraphData(sampleGraph);

      // Push 55 states
      for (let i = 0; i < 55; i++) {
        useGraphStore.getState().pushState();
      }

      expect(useGraphStore.getState().history.length).toBeLessThanOrEqual(50);
    });

    it('pushing state clears future', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().handleAddNode('person', 'Charlie', 's1', 1, {});
      useGraphStore.getState().undo();
      expect(useGraphStore.getState().future).toHaveLength(1);

      // A new mutation should clear future
      useGraphStore.getState().handleAddNode('person', 'Dave', 's1', 1, {});
      expect(useGraphStore.getState().future).toHaveLength(0);
    });
  });

  describe('Filter handlers', () => {
    it('handleStreamToggle toggles stream visibility', () => {
      // Initially streams is null (all visible)
      useGraphStore.getState().handleStreamToggle('s1', ['s1', 's2']);

      const { filters } = useGraphStore.getState();
      // Toggling off s1 from "all visible" should show only s2
      expect(filters.streams).toBeDefined();
      expect(filters.streams!.has('s2')).toBe(true);
      expect(filters.streams!.has('s1')).toBe(false);
    });

    it('handleStreamToggle returns to null when all streams re-enabled', () => {
      useGraphStore.getState().handleStreamToggle('s1', ['s1', 's2']);
      // Now s2 is visible, s1 is hidden. Toggle s1 back on.
      useGraphStore.getState().handleStreamToggle('s1', ['s1', 's2']);

      expect(useGraphStore.getState().filters.streams).toBeNull();
    });

    it('handleShowAllFilters resets to empty state', () => {
      useGraphStore.getState().handleStreamToggle('s1', ['s1', 's2']);
      useGraphStore.getState().handleShowAllFilters();

      const { filters } = useGraphStore.getState();
      expect(filters.streams).toBeNull();
      expect(filters.generations).toBeNull();
      expect(filters.attributes).toEqual([]);
    });

    it('handleAttributeToggle adds an attribute filter', () => {
      useGraphStore.getState().handleAttributeToggle('person', 'importance', 'major', ['major', 'minor']);

      const { filters } = useGraphStore.getState();
      expect(filters.attributes).toHaveLength(1);
      expect(filters.attributes[0].nodeType).toBe('person');
      expect(filters.attributes[0].field).toBe('importance');
      // Toggling 'major' off from all values should leave 'minor'
      expect(filters.attributes[0].values!.has('minor')).toBe(true);
      expect(filters.attributes[0].values!.has('major')).toBe(false);
    });

    it('handleAttributeToggle removes filter when all values re-enabled', () => {
      useGraphStore.getState().handleAttributeToggle('person', 'importance', 'major', ['major', 'minor']);
      // Now only 'minor' visible. Toggle 'major' back on.
      useGraphStore.getState().handleAttributeToggle('person', 'importance', 'major', ['major', 'minor']);

      expect(useGraphStore.getState().filters.attributes).toHaveLength(0);
    });
  });
});
