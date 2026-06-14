import { create } from 'zustand';
import type { WorkflowyOutlineNode } from '../types/bridge-protocol';

export interface SecondBrainFolder {
  path: string;
  name: string;
}

interface SecondBrainState {
  folders: SecondBrainFolder[];
  hasWorkflowyKey: boolean;
  isScanning: boolean;
  lastScannedAt: Date | null;
  lastFileCount: number;
  // nodeUrl → outline nodes
  outlineCache: Record<string, WorkflowyOutlineNode[]>;

  setFolders: (folders: SecondBrainFolder[]) => void;
  setHasWorkflowyKey: (has: boolean) => void;
  setIsScanning: (v: boolean) => void;
  setLastScanned: (at: Date, fileCount: number) => void;
  setOutline: (nodeUrl: string, nodes: WorkflowyOutlineNode[]) => void;
}

export const useSecondBrainStore = create<SecondBrainState>((set) => ({
  folders: [],
  hasWorkflowyKey: false,
  isScanning: false,
  lastScannedAt: null,
  lastFileCount: 0,
  outlineCache: {},

  setFolders: (folders) => set({ folders }),
  setHasWorkflowyKey: (has) => set({ hasWorkflowyKey: has }),
  setIsScanning: (v) => set({ isScanning: v }),
  setLastScanned: (at, fileCount) => set({ lastScannedAt: at, lastFileCount: fileCount, isScanning: false }),
  setOutline: (nodeUrl, nodes) => set((s) => ({ outlineCache: { ...s.outlineCache, [nodeUrl]: nodes } })),
}));
