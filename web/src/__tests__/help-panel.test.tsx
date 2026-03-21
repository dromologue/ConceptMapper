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
