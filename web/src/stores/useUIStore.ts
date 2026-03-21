import { create } from 'zustand';

type ModalName = 'addNode' | 'addEdge' | 'settings' | 'help' | 'taxonomyWizard' | 'mapping' | 'exportImage' | null;

interface UIState {
  // Modal management (unified)
  activeModal: ModalName;
  modalData: unknown; // e.g. nodeTypeId for addNode
  openModal: (name: ModalName, data?: unknown) => void;
  closeModal: () => void;

  // Panel visibility
  chatOpen: boolean;
  notesOpen: boolean;
  analysisOpen: boolean;
  sidebarOpen: boolean;
  labelMenuOpen: boolean;

  toggleChat: () => void;
  toggleNotes: () => void;
  toggleAnalysis: () => void;
  toggleSidebar: () => void;
  toggleLabelMenu: () => void;
  setNotesOpen: (open: boolean) => void;

  // Search
  searchQuery: string;
  searchFocused: boolean;
  searchHighlight: number;
  setSearchQuery: (q: string) => void;
  setSearchFocused: (f: boolean) => void;
  setSearchHighlight: (h: number) => void;

  // Panel dimensions
  auxPanelWidth: number;
  notesHeight: number;
  chatHeight: number;
  setAuxPanelWidth: (w: number) => void;
  setNotesHeight: (h: number) => void;
  setChatHeight: (h: number) => void;

  // Label visibility
  hiddenLabelTypes: Set<string>;
  setHiddenLabelTypes: (s: Set<string>) => void;
  toggleLabelType: (key: string) => void;

  // Canvas controls (declarative - for Step 8)
  fitToViewTrigger: number;
  zoomAction: { action: 'in' | 'out'; ts: number } | null;
  triggerFitToView: () => void;
  triggerZoom: (action: 'in' | 'out') => void;
  clearZoomAction: () => void;

  // MCP status
  mcpConfigured: boolean;
  setMcpConfigured: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  modalData: null,
  openModal: (name, data) => set({ activeModal: name, modalData: data ?? null }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  chatOpen: false,
  notesOpen: false,
  analysisOpen: false,
  sidebarOpen: true,
  labelMenuOpen: false,

  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen, ...(s.chatOpen ? {} : { notesOpen: false }) })),
  toggleNotes: () => set((s) => ({ notesOpen: !s.notesOpen })),
  toggleAnalysis: () => set((s) => ({ analysisOpen: !s.analysisOpen })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleLabelMenu: () => set((s) => ({ labelMenuOpen: !s.labelMenuOpen })),
  setNotesOpen: (open) => set({ notesOpen: open }),

  searchQuery: '',
  searchFocused: false,
  searchHighlight: -1,
  setSearchQuery: (q) => set({ searchQuery: q, searchHighlight: -1 }),
  setSearchFocused: (f) => set({ searchFocused: f }),
  setSearchHighlight: (h) => set({ searchHighlight: h }),

  auxPanelWidth: 340,
  notesHeight: 250,
  chatHeight: 300,
  setAuxPanelWidth: (w) => set({ auxPanelWidth: w }),
  setNotesHeight: (h) => set({ notesHeight: h }),
  setChatHeight: (h) => set({ chatHeight: h }),

  hiddenLabelTypes: new Set(),
  setHiddenLabelTypes: (s) => set({ hiddenLabelTypes: s }),
  toggleLabelType: (key) => set((s) => {
    const next = new Set(s.hiddenLabelTypes);
    if (next.has(key)) next.delete(key); else next.add(key);
    return { hiddenLabelTypes: next };
  }),

  fitToViewTrigger: 0,
  zoomAction: null,
  triggerFitToView: () => set((s) => ({ fitToViewTrigger: s.fitToViewTrigger + 1 })),
  triggerZoom: (action) => set({ zoomAction: { action, ts: Date.now() } }),
  clearZoomAction: () => set({ zoomAction: null }),

  mcpConfigured: false,
  setMcpConfigured: (v) => set({ mcpConfigured: v }),
}));
