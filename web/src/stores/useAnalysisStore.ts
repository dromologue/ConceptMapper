import { create } from 'zustand';
import type { NetworkAnalysis, PathResult } from '../utils/graph-analysis';

interface AnalysisState {
  analysis: NetworkAnalysis | null;
  analysisNodeTypes: Set<string> | null;
  pathResult: PathResult | null;
  pathFrom: string | null;
  pathTo: string | null;
  highlightedCommunity: number | null;
  communityOverlay: boolean;
  highlightedPath: string[] | null;

  setAnalysis: (a: NetworkAnalysis | null) => void;
  setAnalysisNodeTypes: (s: Set<string> | null) => void;
  setPathResult: (r: PathResult | null) => void;
  setPathFrom: (id: string | null) => void;
  setPathTo: (id: string | null) => void;
  setHighlightedCommunity: (idx: number | null) => void;
  toggleCommunityOverlay: () => void;
  setCommunityOverlay: (v: boolean) => void;
  setHighlightedPath: (path: string[] | null) => void;
  clearPath: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  analysis: null,
  analysisNodeTypes: null,
  pathResult: null,
  pathFrom: null,
  pathTo: null,
  highlightedCommunity: null,
  communityOverlay: false,
  highlightedPath: null,

  setAnalysis: (a) => set({ analysis: a }),
  setAnalysisNodeTypes: (s) => set({ analysisNodeTypes: s }),
  setPathResult: (r) => set({ pathResult: r }),
  setPathFrom: (id) => set({ pathFrom: id }),
  setPathTo: (id) => set({ pathTo: id }),
  setHighlightedCommunity: (idx) => set({ highlightedCommunity: idx }),
  toggleCommunityOverlay: () => set((s) => ({ communityOverlay: !s.communityOverlay })),
  setCommunityOverlay: (v) => set({ communityOverlay: v }),
  setHighlightedPath: (path) => set({ highlightedPath: path }),
  clearPath: () => set({ pathResult: null, highlightedPath: null }),
}));
