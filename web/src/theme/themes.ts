/** Theme configuration for both CSS (panels/toolbar/modals) and canvas (nodes/edges/labels). */
export interface ThemeConfig {
  id: string;
  name: string;

  // UI chrome colors (injected as CSS custom properties)
  bgBody: string;
  bgPanel: string;
  bgHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  accent: string;
  accentLight: string;
  badgeThinkerBg: string;
  badgeThinkerText: string;
  badgeConceptBg: string;
  badgeConceptText: string;
  btnExportBg: string;
  btnExportText: string;
  btnAddBg: string;
  btnAddText: string;
  errorText: string;

  // Canvas colors (passed as JS object to GraphCanvas)
  canvasBg: string;
  canvasLabelBg: string;
  canvasEdgeDefault: string;
  canvasEdgeDim: string;
  canvasEdgeHover: string;
  canvasLabelHighlight: string;
  canvasLabelDim: string;
  canvasSelectionStroke: string;
  canvasEdgeSourceStroke: string;
  canvasNotesIndicator: string;

  // Layout chrome colors
  titlebarBg: string;
  activityBarBg: string;
  activityBarFg: string;
  activityBarActiveFg: string;
  activityBarActiveBorder: string;
  statusBarBg: string;
  statusBarFg: string;
  sidebarBg: string;

  // User-customizable overrides (not part of presets)
  edgeColorOverrides: Record<string, string>;
  streamColorOverrides: Record<string, string>;
}

/** Midnight — the current default dark navy theme (exact existing colors). */
const midnight: ThemeConfig = {
  id: "midnight",
  name: "Midnight",
  bgBody: "#1a1a2e",
  bgPanel: "#16213e",
  bgHover: "#2a2a4a",
  textPrimary: "#ffffff",
  textSecondary: "#cccccc",
  textMuted: "#aaaaaa",
  textDim: "#666666",
  accent: "#4A90D9",
  accentLight: "#8ab4f8",
  badgeThinkerBg: "#2a4a6e",
  badgeThinkerText: "#8ab4f8",
  badgeConceptBg: "#4a3a2a",
  badgeConceptText: "#f8c88a",
  btnExportBg: "#1a3a2a",
  btnExportText: "#8af8a8",
  btnAddBg: "#1a2a3a",
  btnAddText: "#8ab4f8",
  errorText: "#ff6b6b",
  canvasBg: "#1a1a2e",
  canvasLabelBg: "rgba(26,26,46,0.85)",
  canvasEdgeDefault: "#555555",
  canvasEdgeDim: "#333333",
  canvasEdgeHover: "#ffffff",
  canvasLabelHighlight: "#dddddd",
  canvasLabelDim: "#666666",
  canvasSelectionStroke: "#ffffff",
  canvasEdgeSourceStroke: "#4AD94A",
  canvasNotesIndicator: "#f8c88a",
  titlebarBg: "#141428",
  activityBarBg: "#111122",
  activityBarFg: "#666688",
  activityBarActiveFg: "#ffffff",
  activityBarActiveBorder: "#4A90D9",
  statusBarBg: "#2a4a7a",
  statusBarFg: "#e0e8f0",
  sidebarBg: "#16213e",
  edgeColorOverrides: {},
  streamColorOverrides: {},
};

const obsidian: ThemeConfig = {
  ...midnight,
  id: "obsidian",
  name: "Obsidian",
  bgBody: "#1a1a1a",
  bgPanel: "#222222",
  bgHover: "#333333",
  textPrimary: "#e8e8e8",
  textSecondary: "#bbbbbb",
  textMuted: "#999999",
  textDim: "#555555",
  accent: "#7c8efa",
  accentLight: "#a4b0ff",
  badgeThinkerBg: "#2a2a40",
  badgeThinkerText: "#a4b0ff",
  badgeConceptBg: "#3a3020",
  badgeConceptText: "#f0c878",
  btnExportBg: "#1a2a1a",
  btnExportText: "#80e890",
  btnAddBg: "#1a1a2a",
  btnAddText: "#a4b0ff",
  errorText: "#ff6666",
  canvasBg: "#1a1a1a",
  canvasLabelBg: "rgba(26,26,26,0.85)",
  canvasEdgeDefault: "#555555",
  canvasEdgeDim: "#333333",
  canvasEdgeHover: "#ffffff",
  canvasLabelHighlight: "#cccccc",
  canvasLabelDim: "#555555",
  canvasSelectionStroke: "#ffffff",
  canvasEdgeSourceStroke: "#4AD94A",
  canvasNotesIndicator: "#f0c878",
  titlebarBg: "#151515",
  activityBarBg: "#111111",
  activityBarFg: "#555555",
  activityBarActiveFg: "#e8e8e8",
  activityBarActiveBorder: "#7c8efa",
  statusBarBg: "#3a3a5a",
  statusBarFg: "#d0d0e0",
  sidebarBg: "#222222",
};

const solarized: ThemeConfig = {
  ...midnight,
  id: "solarized",
  name: "Solarized Dark",
  bgBody: "#002b36",
  bgPanel: "#073642",
  bgHover: "#094956",
  textPrimary: "#fdf6e3",
  textSecondary: "#93a1a1",
  textMuted: "#839496",
  textDim: "#586e75",
  accent: "#268bd2",
  accentLight: "#6cb0e0",
  badgeThinkerBg: "#0a4a5a",
  badgeThinkerText: "#6cb0e0",
  badgeConceptBg: "#3a3510",
  badgeConceptText: "#b58900",
  btnExportBg: "#0a3020",
  btnExportText: "#859900",
  btnAddBg: "#0a2a3a",
  btnAddText: "#6cb0e0",
  errorText: "#dc322f",
  canvasBg: "#002b36",
  canvasLabelBg: "rgba(0,43,54,0.85)",
  canvasEdgeDefault: "#586e75",
  canvasEdgeDim: "#2a3e45",
  canvasEdgeHover: "#fdf6e3",
  canvasLabelHighlight: "#93a1a1",
  canvasLabelDim: "#586e75",
  canvasSelectionStroke: "#fdf6e3",
  canvasEdgeSourceStroke: "#859900",
  canvasNotesIndicator: "#b58900",
  titlebarBg: "#002028",
  activityBarBg: "#001a22",
  activityBarFg: "#4a6a72",
  activityBarActiveFg: "#fdf6e3",
  activityBarActiveBorder: "#268bd2",
  statusBarBg: "#0a4a6a",
  statusBarFg: "#d0e8f0",
  sidebarBg: "#073642",
};

const nord: ThemeConfig = {
  ...midnight,
  id: "nord",
  name: "Nord",
  bgBody: "#2e3440",
  bgPanel: "#3b4252",
  bgHover: "#434c5e",
  textPrimary: "#eceff4",
  textSecondary: "#d8dee9",
  textMuted: "#a0aab8",
  textDim: "#616e80",
  accent: "#88c0d0",
  accentLight: "#8fbcbb",
  badgeThinkerBg: "#3a4a5a",
  badgeThinkerText: "#88c0d0",
  badgeConceptBg: "#4a3a30",
  badgeConceptText: "#ebcb8b",
  btnExportBg: "#2a3a2a",
  btnExportText: "#a3be8c",
  btnAddBg: "#2a3a4a",
  btnAddText: "#88c0d0",
  errorText: "#bf616a",
  canvasBg: "#2e3440",
  canvasLabelBg: "rgba(46,52,64,0.85)",
  canvasEdgeDefault: "#616e80",
  canvasEdgeDim: "#434c5e",
  canvasEdgeHover: "#eceff4",
  canvasLabelHighlight: "#d8dee9",
  canvasLabelDim: "#616e80",
  canvasSelectionStroke: "#eceff4",
  canvasEdgeSourceStroke: "#a3be8c",
  canvasNotesIndicator: "#ebcb8b",
  titlebarBg: "#272c36",
  activityBarBg: "#22272f",
  activityBarFg: "#616e80",
  activityBarActiveFg: "#eceff4",
  activityBarActiveBorder: "#88c0d0",
  statusBarBg: "#3a5a6a",
  statusBarFg: "#d8dee9",
  sidebarBg: "#3b4252",
};

const ivory: ThemeConfig = {
  ...midnight,
  id: "ivory",
  name: "Ivory",
  bgBody: "#f5f0e8",
  bgPanel: "#ede6da",
  bgHover: "#e0d8cc",
  textPrimary: "#2c2c2c",
  textSecondary: "#4a4a4a",
  textMuted: "#7a7a7a",
  textDim: "#aaaaaa",
  accent: "#5a7abf",
  accentLight: "#7a94d0",
  badgeThinkerBg: "#d0d8e8",
  badgeThinkerText: "#3a5a9a",
  badgeConceptBg: "#e8d8c0",
  badgeConceptText: "#8a6a30",
  btnExportBg: "#d0e0d0",
  btnExportText: "#2a6a2a",
  btnAddBg: "#d0d8e8",
  btnAddText: "#3a5a9a",
  errorText: "#c44040",
  canvasBg: "#f5f0e8",
  canvasLabelBg: "rgba(245,240,232,0.9)",
  canvasEdgeDefault: "#aaaaaa",
  canvasEdgeDim: "#cccccc",
  canvasEdgeHover: "#2c2c2c",
  canvasLabelHighlight: "#4a4a4a",
  canvasLabelDim: "#aaaaaa",
  canvasSelectionStroke: "#2c2c2c",
  canvasEdgeSourceStroke: "#4a9a4a",
  canvasNotesIndicator: "#d4a030",
  titlebarBg: "#e8e0d4",
  activityBarBg: "#ddd5c8",
  activityBarFg: "#9a9080",
  activityBarActiveFg: "#2c2c2c",
  activityBarActiveBorder: "#5a7abf",
  statusBarBg: "#5a7abf",
  statusBarFg: "#f0f0f0",
  sidebarBg: "#ede6da",
};

const paper: ThemeConfig = {
  ...midnight,
  id: "paper",
  name: "Paper",
  bgBody: "#ffffff",
  bgPanel: "#f5f5f5",
  bgHover: "#e8e8e8",
  textPrimary: "#1a1a1a",
  textSecondary: "#444444",
  textMuted: "#888888",
  textDim: "#bbbbbb",
  accent: "#2563eb",
  accentLight: "#60a5fa",
  badgeThinkerBg: "#dbeafe",
  badgeThinkerText: "#1e40af",
  badgeConceptBg: "#fef3c7",
  badgeConceptText: "#92400e",
  btnExportBg: "#dcfce7",
  btnExportText: "#166534",
  btnAddBg: "#dbeafe",
  btnAddText: "#1e40af",
  errorText: "#dc2626",
  canvasBg: "#ffffff",
  canvasLabelBg: "rgba(255,255,255,0.9)",
  canvasEdgeDefault: "#999999",
  canvasEdgeDim: "#cccccc",
  canvasEdgeHover: "#1a1a1a",
  canvasLabelHighlight: "#333333",
  canvasLabelDim: "#999999",
  canvasSelectionStroke: "#1a1a1a",
  canvasEdgeSourceStroke: "#16a34a",
  canvasNotesIndicator: "#d97706",
  titlebarBg: "#f0f0f0",
  activityBarBg: "#e8e8e8",
  activityBarFg: "#999999",
  activityBarActiveFg: "#1a1a1a",
  activityBarActiveBorder: "#2563eb",
  statusBarBg: "#2563eb",
  statusBarFg: "#ffffff",
  sidebarBg: "#f5f5f5",
};

export const THEMES: ThemeConfig[] = [midnight, obsidian, solarized, nord, ivory, paper];

export function getThemeById(id: string): ThemeConfig {
  return THEMES.find((t) => t.id === id) ?? midnight;
}
