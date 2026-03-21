import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../stores/useUIStore';

const initialState = useUIStore.getState();

beforeEach(() => {
  useUIStore.setState(initialState, true);
});

describe('useUIStore', () => {
  describe('initial state', () => {
    it('has null activeModal', () => {
      expect(useUIStore.getState().activeModal).toBeNull();
    });

    it('has sidebarOpen true', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it('has chatOpen false', () => {
      expect(useUIStore.getState().chatOpen).toBe(false);
    });

    it('has notesOpen false', () => {
      expect(useUIStore.getState().notesOpen).toBe(false);
    });

    it('has analysisOpen false', () => {
      expect(useUIStore.getState().analysisOpen).toBe(false);
    });
  });

  describe('openModal / closeModal', () => {
    it('opens a modal with name and data', () => {
      useUIStore.getState().openModal('addNode', { nodeType: 'person' });

      const state = useUIStore.getState();
      expect(state.activeModal).toBe('addNode');
      expect(state.modalData).toEqual({ nodeType: 'person' });
    });

    it('opens a modal without data', () => {
      useUIStore.getState().openModal('help');
      expect(useUIStore.getState().activeModal).toBe('help');
      expect(useUIStore.getState().modalData).toBeNull();
    });

    it('closeModal resets activeModal and modalData', () => {
      useUIStore.getState().openModal('settings', { tab: 1 });
      useUIStore.getState().closeModal();

      const state = useUIStore.getState();
      expect(state.activeModal).toBeNull();
      expect(state.modalData).toBeNull();
    });
  });

  describe('toggleChat', () => {
    it('toggles chatOpen from false to true', () => {
      useUIStore.getState().toggleChat();
      expect(useUIStore.getState().chatOpen).toBe(true);
    });

    it('toggles chatOpen from true to false', () => {
      useUIStore.getState().toggleChat();
      useUIStore.getState().toggleChat();
      expect(useUIStore.getState().chatOpen).toBe(false);
    });

    it('closes notesOpen when opening chat', () => {
      useUIStore.setState({ notesOpen: true });
      useUIStore.getState().toggleChat();

      expect(useUIStore.getState().chatOpen).toBe(true);
      expect(useUIStore.getState().notesOpen).toBe(false);
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebarOpen', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('toggleNotes', () => {
    it('toggles notesOpen', () => {
      useUIStore.getState().toggleNotes();
      expect(useUIStore.getState().notesOpen).toBe(true);
      useUIStore.getState().toggleNotes();
      expect(useUIStore.getState().notesOpen).toBe(false);
    });
  });

  describe('toggleAnalysis', () => {
    it('toggles analysisOpen', () => {
      useUIStore.getState().toggleAnalysis();
      expect(useUIStore.getState().analysisOpen).toBe(true);
      useUIStore.getState().toggleAnalysis();
      expect(useUIStore.getState().analysisOpen).toBe(false);
    });
  });

  describe('search state', () => {
    it('setSearchQuery updates query and resets highlight to -1', () => {
      useUIStore.setState({ searchHighlight: 3 });
      useUIStore.getState().setSearchQuery('alice');

      const state = useUIStore.getState();
      expect(state.searchQuery).toBe('alice');
      expect(state.searchHighlight).toBe(-1);
    });
  });

  describe('fitToViewTrigger', () => {
    it('triggerFitToView increments the counter', () => {
      const before = useUIStore.getState().fitToViewTrigger;
      useUIStore.getState().triggerFitToView();
      expect(useUIStore.getState().fitToViewTrigger).toBe(before + 1);
    });

    it('increments multiple times', () => {
      const before = useUIStore.getState().fitToViewTrigger;
      useUIStore.getState().triggerFitToView();
      useUIStore.getState().triggerFitToView();
      expect(useUIStore.getState().fitToViewTrigger).toBe(before + 2);
    });
  });

  describe('zoomAction', () => {
    it('triggerZoom sets action with timestamp', () => {
      const before = Date.now();
      useUIStore.getState().triggerZoom('in');

      const zoom = useUIStore.getState().zoomAction;
      expect(zoom).not.toBeNull();
      expect(zoom!.action).toBe('in');
      expect(zoom!.ts).toBeGreaterThanOrEqual(before);
    });

    it('triggerZoom works for zoom out', () => {
      useUIStore.getState().triggerZoom('out');
      expect(useUIStore.getState().zoomAction!.action).toBe('out');
    });

    it('clearZoomAction resets to null', () => {
      useUIStore.getState().triggerZoom('in');
      useUIStore.getState().clearZoomAction();
      expect(useUIStore.getState().zoomAction).toBeNull();
    });
  });
});
