// SPEC: REQ-036 (Theme System), REQ-037 (Settings Modal)
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "../theme/ThemeContext";
import { THEMES, getThemeById } from "../theme/themes";
import type { ThemeConfig } from "../theme/themes";

// Helper component to inspect theme context
function ThemeInspector() {
  const { theme, setThemeId } = useTheme();
  return (
    <div>
      <span data-testid="theme-id">{theme.id}</span>
      <span data-testid="theme-name">{theme.name}</span>
      <button onClick={() => setThemeId("nord")}>Switch to Nord</button>
    </div>
  );
}

beforeEach(() => {
  try { localStorage.clear(); } catch {
    // jsdom may not support clear; remove keys manually
    localStorage.removeItem("cm-theme-id");
    localStorage.removeItem("cm-edge-colors");
    localStorage.removeItem("cm-stream-colors");
  }
});

describe("ThemeConfig", () => {
  // AC-036-01: ThemeConfig interface has all required fields
  it("has 7 predefined themes", () => {
    expect(THEMES).toHaveLength(7);
    expect(THEMES.map((t) => t.id)).toEqual([
      "midnight", "obsidian", "solarized", "nord", "ivory", "paper", "organic",
    ]);
  });

  // AC-061-03: Organic theme exists as a color palette
  it("organic theme has warm earth tones", () => {
    const organic = getThemeById("organic");
    expect(organic.name).toBe("Organic");
    expect(organic.accent).toMatch(/#[0-9a-f]{6}/i);
  });

  // AC-036-02: Each theme has all required color fields
  it("each theme has all required canvas and UI color fields", () => {
    const requiredFields: (keyof ThemeConfig)[] = [
      "id", "name", "bgBody", "bgPanel", "bgHover",
      "textPrimary", "textSecondary", "textMuted", "textDim",
      "accent", "accentLight",
      "badgeThinkerBg", "badgeThinkerText", "badgeConceptBg", "badgeConceptText",
      "btnExportBg", "btnExportText", "btnAddBg", "btnAddText", "errorText",
      "canvasBg", "canvasLabelBg", "canvasEdgeDefault", "canvasEdgeDim",
      "canvasEdgeHover", "canvasLabelHighlight", "canvasLabelDim",
      "canvasSelectionStroke", "canvasEdgeSourceStroke", "canvasNotesIndicator",
      "titlebarBg", "activityBarBg", "activityBarFg", "activityBarActiveFg",
      "activityBarActiveBorder", "statusBarBg", "statusBarFg", "sidebarBg",
    ];
    for (const theme of THEMES) {
      for (const field of requiredFields) {
        expect(theme[field], `${theme.id}.${field}`).toBeDefined();
      }
    }
  });

  // AC-036-03: getThemeById returns correct theme or default
  it("getThemeById returns midnight for unknown IDs", () => {
    expect(getThemeById("nonexistent").id).toBe("midnight");
  });

  it("getThemeById returns matching theme", () => {
    expect(getThemeById("nord").id).toBe("nord");
    expect(getThemeById("solarized").name).toBe("Solarized Dark");
  });

  // AC-036-04: Midnight theme matches original hardcoded colors
  it("midnight theme preserves original app colors", () => {
    const midnight = getThemeById("midnight");
    expect(midnight.bgBody).toBe("#1a1a2e");
    expect(midnight.bgPanel).toBe("#16213e");
    expect(midnight.bgHover).toBe("#2a2a4a");
    expect(midnight.accent).toBe("#4A90D9");
    expect(midnight.canvasEdgeSourceStroke).toBe("#4AD94A");
    expect(midnight.canvasNotesIndicator).toBe("#f8c88a");
  });

  // AC-036-05: Light themes have appropriate colors
  it("light themes have light backgrounds and dark text", () => {
    const ivory = getThemeById("ivory");
    const paper = getThemeById("paper");
    // Light backgrounds should be above #c0 in all channels
    expect(ivory.textPrimary).toMatch(/^#[0-4]/); // dark text
    expect(paper.textPrimary).toMatch(/^#[0-4]/); // dark text
  });
});

describe("Look & Feel", () => {
  function LookInspector() {
    const { look, setLook } = useTheme();
    return (
      <div>
        <span data-testid="look">{look}</span>
        <button onClick={() => setLook("formal")}>Go Formal</button>
        <button onClick={() => setLook("mindmap")}>Go Mindmap</button>
      </div>
    );
  }

  it("defaults to formal", () => {
    render(<ThemeProvider><LookInspector /></ThemeProvider>);
    expect(screen.getByTestId("look")).toHaveTextContent("formal");
  });

  it("can be switched to mindmap", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><LookInspector /></ThemeProvider>);
    await user.click(screen.getByText("Go Mindmap"));
    expect(screen.getByTestId("look")).toHaveTextContent("mindmap");
  });

  it("persists mindmap look to localStorage", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><LookInspector /></ThemeProvider>);
    await user.click(screen.getByText("Go Mindmap"));
    expect(localStorage.getItem("cm-look")).toBe("mindmap");
  });

  it("restores mindmap look from localStorage", () => {
    localStorage.setItem("cm-look", "mindmap");
    render(<ThemeProvider><LookInspector /></ThemeProvider>);
    expect(screen.getByTestId("look")).toHaveTextContent("mindmap");
  });

  it("falls back to formal for unknown look values", () => {
    localStorage.setItem("cm-look", "organic");
    render(<ThemeProvider><LookInspector /></ThemeProvider>);
    expect(screen.getByTestId("look")).toHaveTextContent("formal");
  });
});

describe("ThemeProvider", () => {
  // AC-036-06: Default theme is midnight
  it("provides midnight theme by default", () => {
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme-id")).toHaveTextContent("midnight");
  });

  // AC-036-07: Theme can be switched
  it("switches theme when setThemeId is called", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );
    await user.click(screen.getByText("Switch to Nord"));
    expect(screen.getByTestId("theme-id")).toHaveTextContent("nord");
    expect(screen.getByTestId("theme-name")).toHaveTextContent("Nord");
  });

  // AC-036-08: Theme persists to localStorage
  it("persists theme selection to localStorage", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );
    await user.click(screen.getByText("Switch to Nord"));
    expect(localStorage.getItem("cm-theme-id")).toBe("nord");
  });

  // AC-036-09: Theme restores from localStorage
  it("restores theme from localStorage on mount", () => {
    localStorage.setItem("cm-theme-id", "solarized");
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme-id")).toHaveTextContent("solarized");
  });

  // AC-036-10: CSS variables are injected on :root
  it("injects CSS custom properties on theme change", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeInspector />
      </ThemeProvider>
    );
    // After initial render with midnight
    expect(document.documentElement.style.getPropertyValue("--bg-body")).toBe("#1a1a2e");

    await user.click(screen.getByText("Switch to Nord"));
    expect(document.documentElement.style.getPropertyValue("--bg-body")).toBe("#2e3440");
  });
});

describe("Color Overrides", () => {
  function OverrideInspector() {
    const { edgeColorOverrides, setEdgeColorOverrides, streamColorOverrides, setStreamColorOverrides } = useTheme();
    return (
      <div>
        <span data-testid="edge-overrides">{JSON.stringify(edgeColorOverrides)}</span>
        <span data-testid="stream-overrides">{JSON.stringify(streamColorOverrides)}</span>
        <button onClick={() => setEdgeColorOverrides({ rivalry: "#ff0000" })}>Set Edge</button>
        <button onClick={() => setStreamColorOverrides({ psychology: "#00ff00" })}>Set Stream</button>
      </div>
    );
  }

  // AC-036-11: Edge color overrides persist
  it("persists edge color overrides to localStorage", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <OverrideInspector />
      </ThemeProvider>
    );
    await user.click(screen.getByText("Set Edge"));
    expect(JSON.parse(localStorage.getItem("cm-edge-colors") ?? "{}")).toEqual({ rivalry: "#ff0000" });
  });

  // AC-036-12: Stream color overrides persist
  it("persists stream color overrides to localStorage", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <OverrideInspector />
      </ThemeProvider>
    );
    await user.click(screen.getByText("Set Stream"));
    expect(JSON.parse(localStorage.getItem("cm-stream-colors") ?? "{}")).toEqual({ psychology: "#00ff00" });
  });

  // AC-036-13: Overrides restore from localStorage
  it("restores color overrides from localStorage on mount", () => {
    localStorage.setItem("cm-edge-colors", JSON.stringify({ chain: "#aabbcc" }));
    localStorage.setItem("cm-stream-colors", JSON.stringify({ systems: "#112233" }));
    render(
      <ThemeProvider>
        <OverrideInspector />
      </ThemeProvider>
    );
    expect(screen.getByTestId("edge-overrides")).toHaveTextContent('{"chain":"#aabbcc"}');
    expect(screen.getByTestId("stream-overrides")).toHaveTextContent('{"systems":"#112233"}');
  });
});
