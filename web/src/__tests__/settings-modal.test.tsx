// SPEC: REQ-037 (Settings Modal)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsModal } from "../ui/SettingsModal";
import { ThemeProvider } from "../theme/ThemeContext";
import { sampleStreams } from "./fixtures";

const edgeTypes = ["chain", "originates", "rivalry", "alliance"];

function renderSettings(props: Partial<React.ComponentProps<typeof SettingsModal>> = {}) {
  return render(
    <ThemeProvider>
      <SettingsModal
        streams={sampleStreams}
        edgeTypes={edgeTypes}
        onClose={vi.fn()}
        {...props}
      />
    </ThemeProvider>
  );
}

describe("SettingsModal", () => {
  it("renders with Settings title", () => {
    renderSettings();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows all 6 theme swatches", () => {
    renderSettings();
    expect(screen.getByText("Midnight")).toBeInTheDocument();
    expect(screen.getByText("Obsidian")).toBeInTheDocument();
    expect(screen.getByText("Solarized Dark")).toBeInTheDocument();
    expect(screen.getByText("Nord")).toBeInTheDocument();
    expect(screen.getByText("Ivory")).toBeInTheDocument();
    expect(screen.getByText("Paper")).toBeInTheDocument();
  });

  it("highlights the active theme swatch", () => {
    renderSettings();
    const midnightButton = screen.getByTitle("Midnight");
    expect(midnightButton.className).toContain("theme-swatch-active");
  });

  it("switches theme when swatch is clicked", async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByTitle("Nord"));
    expect(screen.getByTitle("Nord").className).toContain("theme-swatch-active");
    expect(screen.getByTitle("Midnight").className).not.toContain("theme-swatch-active");
  });

  it("shows stream color pickers for all streams", () => {
    renderSettings();
    expect(screen.getByText("Stream Colors")).toBeInTheDocument();
    expect(screen.getByText("Psychology & Cognition")).toBeInTheDocument();
    expect(screen.getByText("Systems & Complexity")).toBeInTheDocument();
    expect(screen.getByText("Sensemaking & Safety")).toBeInTheDocument();
  });

  it("shows edge type color pickers for all edge types", () => {
    renderSettings();
    expect(screen.getByText("Edge Type Colors")).toBeInTheDocument();
    expect(screen.getByText("chain")).toBeInTheDocument();
    expect(screen.getByText("originates")).toBeInTheDocument();
    expect(screen.getByText("rivalry")).toBeInTheDocument();
    expect(screen.getByText("alliance")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSettings({ onClose });
    const closeButtons = screen.getAllByText("\u00d7");
    await user.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when overlay is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderSettings({ onClose });
    const overlay = document.querySelector(".modal-overlay")!;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });
});
