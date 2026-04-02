/* eslint-disable react-refresh/only-export-components -- context + hook co-export */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { ThemeConfig } from "./themes";
import { getThemeById, THEMES } from "./themes";

export type LookAndFeel = "formal" | "mindmap";

interface ThemeContextValue {
  theme: ThemeConfig;
  setThemeId: (id: string) => void;
  look: LookAndFeel;
  setLook: (look: LookAndFeel) => void;
  edgeColorOverrides: Record<string, string>;
  setEdgeColorOverrides: (overrides: Record<string, string>) => void;
  streamColorOverrides: Record<string, string>;
  setStreamColorOverrides: (overrides: Record<string, string>) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const LS_THEME = "cm-theme-id";
const LS_LOOK = "cm-look";
const LS_EDGE_COLORS = "cm-edge-colors";
const LS_STREAM_COLORS = "cm-stream-colors";

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* noop */ }
}

function readJson(key: string): Record<string, string> {
  try {
    const raw = lsGet(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Inject CSS custom properties on :root from a ThemeConfig. */
function injectCssVars(theme: ThemeConfig) {
  const root = document.documentElement;
  const vars: [string, string][] = [
    ["--bg-body", theme.bgBody],
    ["--bg-panel", theme.bgPanel],
    ["--bg-hover", theme.bgHover],
    ["--text-primary", theme.textPrimary],
    ["--text-secondary", theme.textSecondary],
    ["--text-muted", theme.textMuted],
    ["--text-dim", theme.textDim],
    ["--accent", theme.accent],
    ["--accent-light", theme.accentLight],
    ["--badge-thinker-bg", theme.badgeThinkerBg],
    ["--badge-thinker-text", theme.badgeThinkerText],
    ["--badge-concept-bg", theme.badgeConceptBg],
    ["--badge-concept-text", theme.badgeConceptText],
    ["--btn-export-bg", theme.btnExportBg],
    ["--btn-export-text", theme.btnExportText],
    ["--btn-add-bg", theme.btnAddBg],
    ["--btn-add-text", theme.btnAddText],
    ["--error-text", theme.errorText],
    ["--titlebar-bg", theme.titlebarBg],
    ["--activity-bar-bg", theme.activityBarBg],
    ["--activity-bar-fg", theme.activityBarFg],
    ["--activity-bar-active-fg", theme.activityBarActiveFg],
    ["--activity-bar-active-border", theme.activityBarActiveBorder],
    ["--status-bar-bg", theme.statusBarBg],
    ["--status-bar-fg", theme.statusBarFg],
    ["--sidebar-bg", theme.sidebarBg],
  ];
  // Notes pane: high-contrast black-on-white or white-on-black
  const isLight = theme.id === "ivory" || theme.id === "paper" || theme.id === "organic";
  vars.push(["--notes-bg", isLight ? "#ffffff" : "#111111"]);
  vars.push(["--notes-fg", isLight ? "#1a1a1a" : "#e8e8e8"]);
  for (const [prop, val] of vars) {
    root.style.setProperty(prop, val);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState(() => lsGet(LS_THEME) ?? "midnight");
  const [look, setLookState] = useState<LookAndFeel>(() => {
    const stored = lsGet(LS_LOOK);
    return (stored === "formal" || stored === "mindmap") ? stored : "formal";
  });
  const [edgeColorOverrides, setEdgeColorOverridesState] = useState(() => readJson(LS_EDGE_COLORS));
  const [streamColorOverrides, setStreamColorOverridesState] = useState(() => readJson(LS_STREAM_COLORS));

  const theme = getThemeById(themeId);

  // Inject CSS vars on mount and theme change
  useEffect(() => {
    injectCssVars(theme);
  }, [theme]);

  const setThemeId = useCallback((id: string) => {
    lsSet(LS_THEME, id);
    setThemeIdState(id);
  }, []);

  const setLook = useCallback((l: LookAndFeel) => {
    lsSet(LS_LOOK, l);
    setLookState(l);
  }, []);

  const setEdgeColorOverrides = useCallback((overrides: Record<string, string>) => {
    lsSet(LS_EDGE_COLORS, JSON.stringify(overrides));
    setEdgeColorOverridesState(overrides);
  }, []);

  const setStreamColorOverrides = useCallback((overrides: Record<string, string>) => {
    lsSet(LS_STREAM_COLORS, JSON.stringify(overrides));
    setStreamColorOverridesState(overrides);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: { ...theme, edgeColorOverrides, streamColorOverrides },
        setThemeId,
        look,
        setLook,
        edgeColorOverrides,
        setEdgeColorOverrides,
        streamColorOverrides,
        setStreamColorOverrides,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export { THEMES };
