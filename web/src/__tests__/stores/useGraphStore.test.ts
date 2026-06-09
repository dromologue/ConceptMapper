import { describe, it, expect, beforeEach } from 'vitest';
import { useGraphStore } from '../../stores/useGraphStore';
import { useUIStore } from '../../stores/useUIStore';
import type { GraphIR } from '../../types/graph-ir';

const sampleGraph: GraphIR = {
  version: '2.0',
  metadata: {
    title: 'Test',
    notes: [],
    
  },
  nodes: [
    { id: 'n1', node_type: 'person', name: 'Alice', classifiers: { generation: '1', stream: 's1' }, properties: { importance: 'major' } },
    { id: 'n2', node_type: 'person', name: 'Bob', classifiers: { generation: '1', stream: 's1' }, properties: {} },
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
      expect(filters.classifiers).toEqual([]);
      expect(filters.attributes).toEqual([]);
      expect(filters.dateRanges).toEqual([]);
      expect(filters.tags).toBeNull();
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

      useGraphStore.getState().handleAddNode('person', 'Charlie', {}, [], { importance: 'minor' });

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
      useGraphStore.getState().handleAddNode('person', 'Charlie', {}, [], {});
      expect(useGraphStore.getState().graphData).toBeNull();
    });

    it('creates linked edges (out/in) to existing nodes using the template', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      const template = { edge_types: [{ id: 'chain', directed: true }, { id: 'alliance', directed: false }] };
      useGraphStore.getState().handleAddNode(
        'person', 'Charlie', {}, [], {},
        [
          { targetId: 'n1', edgeType: 'chain', direction: 'out' },   // charlie -> n1
          { targetId: 'n2', edgeType: 'alliance', direction: 'in' }, // n2 -> charlie
        ],
        template,
      );
      const edges = useGraphStore.getState().graphData!.edges;
      expect(edges).toHaveLength(3); // original chain + 2 new
      expect(edges).toContainEqual(expect.objectContaining({ from: 'charlie', to: 'n1', edge_type: 'chain', directed: true }));
      expect(edges).toContainEqual(expect.objectContaining({ from: 'n2', to: 'charlie', edge_type: 'alliance', directed: false }));
    });

    it('ignores links to non-existent targets', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().handleAddNode(
        'person', 'Charlie', {}, [], {},
        [{ targetId: 'ghost', edgeType: 'chain', direction: 'out' }],
        { edge_types: [{ id: 'chain', directed: true }] },
      );
      expect(useGraphStore.getState().graphData!.edges).toHaveLength(1); // only the original
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
      useGraphStore.getState().handleAddNode('person', 'Charlie', {}, [], {});

      expect(useGraphStore.getState().graphData!.nodes).toHaveLength(3);

      useGraphStore.getState().undo();

      expect(useGraphStore.getState().graphData!.nodes).toHaveLength(2);
      expect(useGraphStore.getState().selectedNode).toBeNull();
    });

    it('redo restores the added node after undo', () => {
      useGraphStore.getState().setGraphData(sampleGraph);
      useGraphStore.getState().handleAddNode('person', 'Charlie', {}, [], {});
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
      useGraphStore.getState().handleAddNode('person', 'Charlie', {}, [], {});
      useGraphStore.getState().undo();
      expect(useGraphStore.getState().future).toHaveLength(1);

      // A new mutation should clear future
      useGraphStore.getState().handleAddNode('person', 'Dave', {}, [], {});
      expect(useGraphStore.getState().future).toHaveLength(0);
    });
  });

  describe('Filter handlers', () => {
    it('handleShowAllFilters resets to empty state', () => {
      useGraphStore.getState().handleAttributeToggle('person', 'importance', 'major', ['major', 'minor']);
      useGraphStore.getState().handleShowAllFilters();

      const { filters } = useGraphStore.getState();
      expect(filters.classifiers).toEqual([]);
      expect(filters.attributes).toEqual([]);
      expect(filters.tags).toBeNull();
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
