import { create } from 'zustand';
import type { TaxonomyTemplate, NodeTypeConfig } from '../types/graph-ir';
import type { TaxonomyWizardInitial } from '../ui/TaxonomyWizard';

const DEFAULT_NODE_CONFIG: NodeTypeConfig = {
  id: 'node',
  label: 'Node',
  shape: 'circle',
  icon: 'N',
  fields: [],
};
const DEFAULT_NODE_TYPES: NodeTypeConfig[] = [DEFAULT_NODE_CONFIG];

interface FileState {
  template: TaxonomyTemplate | null;
  templateFilePath: string | null;
  sourceFilePath: string | null;
  saveIndicator: boolean;
  parserReady: boolean;
  nativeMaps: { name: string; path: string }[];
  loadedNativeTemplates: Map<string, TaxonomyWizardInitial>;
  taxonomyEditData: TaxonomyWizardInitial | undefined;
  error: string | null;

  // Computed
  nodeTypeConfigs: NodeTypeConfig[];

  setTemplate: (t: TaxonomyTemplate | null) => void;
  setSourceFilePath: (p: string | null) => void;
  setSaveIndicator: (v: boolean) => void;
  setParserReady: (v: boolean) => void;
  setNativeMaps: (maps: { name: string; path: string }[]) => void;
  addNativeTemplate: (title: string, data: TaxonomyWizardInitial) => void;
  setTaxonomyEditData: (data: TaxonomyWizardInitial | undefined) => void;
  setError: (e: string | null) => void;
}

export const useFileStore = create<FileState>((set) => ({
  template: null,
  templateFilePath: null,
  sourceFilePath: null,
  saveIndicator: false,
  parserReady: false,
  nativeMaps: [],
  loadedNativeTemplates: new Map(),
  taxonomyEditData: undefined,
  error: null,
  nodeTypeConfigs: DEFAULT_NODE_TYPES,

  setTemplate: (t) => set({
    template: t,
    nodeTypeConfigs: t?.node_types ?? DEFAULT_NODE_TYPES,
  }),
  setSourceFilePath: (p) => set({ sourceFilePath: p }),
  setSaveIndicator: (v) => set({ saveIndicator: v }),
  setParserReady: (v) => set({ parserReady: v }),
  setNativeMaps: (maps) => set({ nativeMaps: maps }),
  addNativeTemplate: (title, data) => set((s) => {
    const next = new Map(s.loadedNativeTemplates);
    next.set(title, data);
    return { loadedNativeTemplates: next };
  }),
  setTaxonomyEditData: (data) => set({ taxonomyEditData: data }),
  setError: (e) => set({ error: e }),
}));

export { DEFAULT_NODE_TYPES };
