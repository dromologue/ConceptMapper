// SPEC: REQ-037 (Settings Modal)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsModal } from "../ui/SettingsModal";
import { ThemeProvider } from "../theme/ThemeContext";
import { LLMProvider } from "../llm/LLMContext";
import { sampleStreams } from "./fixtures";

const edgeTypes = ["chain", "originates", "rivalry", "alliance"];

function renderSettings(props: Partial<React.ComponentProps<typeof SettingsModal>> = {}) {
  return render(
    <ThemeProvider>
      <LLMProvider>
        <SettingsModal
          streams={sampleStreams}
          edgeTypes={edgeTypes}
          onClose={vi.fn()}
          {...props}
        />
      </LLMProvider>
    </ThemeProvider>
  );
}

describe("SettingsModal", () => {
  // AC-037-01: Settings modal renders with title
  it("renders with Settings title", () => {
    renderSettings();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  // AC-037-02: Theme picker shows all 6 themes
  it("shows all 6 theme swatches", () => {
    renderSettings();
    expect(screen.getByText("Midnight")).toBeInTheDocument();
    expect(screen.getByText("Obsidian")).toBeInTheDocument();
    expect(screen.getByText("Solarized Dark")).toBeInTheDocument();
    expect(screen.getByText("Nord")).toBeInTheDocument();
    expect(screen.getByText("Ivory")).toBeInTheDocument();
    expect(screen.getByText("Paper")).toBeInTheDocument();
  });

  // AC-037-03: Theme picker highlights active theme
  it("highlights the active theme swatch", () => {
    renderSettings();
    const midnightButton = screen.getByTitle("Midnight");
    expect(midnightButton.className).toContain("theme-swatch-active");
  });

  // AC-037-04: Clicking a theme switches it
  it("switches theme when swatch is clicked", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByTitle("Nord"));
    // After clicking, Nord should be active
    expect(screen.getByTitle("Nord").className).toContain("theme-swatch-active");
    expect(screen.getByTitle("Midnight").className).not.toContain("theme-swatch-active");
  });

  // AC-037-05: Stream colors section shows streams
  it("shows stream color pickers for all streams", () => {
    renderSettings();
    expect(screen.getByText("Stream Colors")).toBeInTheDocument();
    expect(screen.getByText("Psychology & Cognition")).toBeInTheDocument();
    expect(screen.getByText("Systems & Complexity")).toBeInTheDocument();
    expect(screen.getByText("Sensemaking & Safety")).toBeInTheDocument();
  });

  // AC-037-06: Edge type colors section shows edge types
  it("shows edge type color pickers for all edge types", () => {
    renderSettings();
    expect(screen.getByText("Edge Type Colors")).toBeInTheDocument();
    expect(screen.getByText("chain")).toBeInTheDocument();
    expect(screen.getByText("originates")).toBeInTheDocument();
    expect(screen.getByText("rivalry")).toBeInTheDocument();
    expect(screen.getByText("alliance")).toBeInTheDocument();
  });

  // AC-037-07: Close button calls onClose
  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSettings({ onClose });
    const closeButtons = screen.getAllByText("\u00d7");
    await user.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  // AC-037-08: Clicking overlay calls onClose
  it("calls onClose when overlay is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSettings({ onClose });
    const overlay = document.querySelector(".modal-overlay")!;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  // AC-037-09: LLM Configuration section is present
  it("shows LLM Configuration section", () => {
    renderSettings();
    expect(screen.getByText("LLM Configuration")).toBeInTheDocument();
  });

  // AC-037-10: Provider select defaults to Anthropic
  it("defaults provider to Anthropic", () => {
    renderSettings();
    const select = screen.getByDisplayValue("Anthropic (Claude)");
    expect(select).toBeInTheDocument();
  });

  // AC-037-11: Shows prominent Get API Key button
  it("shows Get API Key button for Anthropic", () => {
    renderSettings();
    const btn = screen.getByText(/Get your Anthropic API key/);
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
  });

  // AC-037-12: Paste field present
  it("shows paste field for API key", () => {
    renderSettings();
    expect(screen.getByPlaceholderText(/sk-ant-/)).toBeInTheDocument();
  });

  // AC-037-13: Advanced options toggle
  it("has show/hide advanced options toggle", () => {
    renderSettings();
    expect(screen.getByText(/advanced options/i)).toBeInTheDocument();
  });

  // AC-037-14: Switching to Ollama hides API key field and shows local info
  it("shows Ollama local info when Ollama is selected", async () => {
    const user = userEvent.setup();
    renderSettings();
    const select = screen.getByDisplayValue("Anthropic (Claude)");
    await user.selectOptions(select, "ollama");
    expect(screen.queryByText(/Get your/)).not.toBeInTheDocument();
    expect(screen.getByText(/no API key needed/i)).toBeInTheDocument();
  });
});
