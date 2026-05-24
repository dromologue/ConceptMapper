import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpPanel } from "../ui/HelpPanel";
import { HELP_SECTIONS } from "../help/content";

describe("HelpPanel", () => {
  it("renders the help panel with search field", () => {
    render(<HelpPanel onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText(/search help/i)).toBeInTheDocument();
  });

  it("renders all help section titles", () => {
    render(<HelpPanel onClose={vi.fn()} />);
    for (const section of HELP_SECTIONS) {
      expect(screen.getByText(section.title)).toBeInTheDocument();
    }
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<HelpPanel onClose={onClose} />);
    const closeButtons = screen.getAllByText("\u00d7");
    await user.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("has sections for key features", () => {
    render(<HelpPanel onClose={vi.fn()} />);
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("Using an LLM to Map Content to a Template")).toBeInTheDocument();
    expect(screen.getByText("Canvas Navigation and Interaction")).toBeInTheDocument();
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Troubleshooting")).toBeInTheDocument();
  });

  it("documents the new features (REQ-087 / REQ-088 / REQ-089 / REQ-090)", () => {
    render(<HelpPanel onClose={vi.fn()} />);
    // REQ-088: collapse / expand to level
    expect(screen.getByText("Collapse and Expand to Level")).toBeInTheDocument();
    // REQ-087 + REQ-089: tags + sidebar tag list
    expect(screen.getByText("Tags: Pills, Autocomplete, and the Sidebar List")).toBeInTheDocument();
    // REQ-090: the round-trip behaviour is documented in the taxonomy wizard section.
    const wizardSection = HELP_SECTIONS.find((s) => s.id === "taxonomy-wizard");
    expect(wizardSection?.content).toMatch(/Round-trip to disk/i);
  });

  it("includes the expected number of help sections", () => {
    expect(HELP_SECTIONS.length).toBeGreaterThanOrEqual(12);
    // Each section should have id, title, content
    for (const section of HELP_SECTIONS) {
      expect(section.id).toBeTruthy();
      expect(section.title).toBeTruthy();
      expect(section.content.length).toBeGreaterThan(10);
    }
  });
});
