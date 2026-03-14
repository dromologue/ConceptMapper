// SPEC: REQ-010 (Detail Panel), REQ-018 (Editing), REQ-030 (Attribute Editing)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailPanel } from "../ui/DetailPanel";
import { NotesPane } from "../ui/NotesPane";
import { argyris, doubleLoop, sampleEdges, sampleStreams, sampleGenerations, sampleGraphData } from "./fixtures";

const defaultDetailProps = {
  nodes: sampleGraphData.nodes,
  streams: sampleStreams,
  generations: sampleGenerations,
  onClose: vi.fn(),
  onNodeUpdate: vi.fn(),
  onNavigateToNode: vi.fn(),
  onOpenNotes: vi.fn(),
  notesOpen: false,
};

describe("DetailPanel — Thinker Node", () => {
  const thinkerEdges = sampleEdges.filter(
    (e) => e.from === "argyris" || e.to === "argyris"
  );

  it("displays thinker name in editable input", () => {
    render(<DetailPanel node={argyris} edges={thinkerEdges} {...defaultDetailProps} />);
    const nameInput = screen.getByLabelText("Node name");
    expect(nameInput).toHaveValue("Chris Argyris");
  });

  it("displays type badge", () => {
    render(<DetailPanel node={argyris} edges={thinkerEdges} {...defaultDetailProps} />);
    expect(screen.getByText("thinker")).toBeInTheDocument();
  });

  // AC-030-03: Eminence editable as dropdown
  it("shows eminence as editable dropdown", () => {
    render(<DetailPanel node={argyris} edges={thinkerEdges} {...defaultDetailProps} />);
    const eminenceSelect = screen.getByDisplayValue("dominant");
    expect(eminenceSelect.tagName).toBe("SELECT");
  });

  it("calls onNodeUpdate when eminence is changed", async () => {
    const user = userEvent.setup();
    const onNodeUpdate = vi.fn();
    render(<DetailPanel node={argyris} edges={thinkerEdges} {...defaultDetailProps} onNodeUpdate={onNodeUpdate} />);

    await user.selectOptions(screen.getByDisplayValue("dominant"), "major");
    expect(onNodeUpdate).toHaveBeenCalledWith("argyris", expect.objectContaining({
      thinker_fields: expect.objectContaining({ eminence: "major" }),
    }));
  });

  it("calls onClose when close button clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DetailPanel node={argyris} edges={thinkerEdges} {...defaultDetailProps} onClose={onClose} />);

    const closeButtons = screen.getAllByText("\u00d7");
    await user.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("displays connections with edge type labels", () => {
    render(<DetailPanel node={argyris} edges={thinkerEdges} {...defaultDetailProps} />);
    expect(screen.getByText(/Connections \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("Chain")).toBeInTheDocument();
    expect(screen.getByText("Originates")).toBeInTheDocument();
  });

  it("calls onNavigateToNode when connection name is clicked", async () => {
    const user = userEvent.setup();
    const onNavigateToNode = vi.fn();
    render(<DetailPanel node={argyris} edges={thinkerEdges} {...defaultDetailProps} onNavigateToNode={onNavigateToNode} />);

    await user.click(screen.getByText("Peter Senge"));
    expect(onNavigateToNode).toHaveBeenCalledWith("senge");
  });

  it("shows Edit Notes button", () => {
    render(<DetailPanel node={argyris} edges={[]} {...defaultDetailProps} />);
    expect(screen.getByText("Edit Notes")).toBeInTheDocument();
  });

  it("calls onOpenNotes when Edit Notes is clicked", async () => {
    const user = userEvent.setup();
    const onOpenNotes = vi.fn();
    render(<DetailPanel node={argyris} edges={[]} {...defaultDetailProps} onOpenNotes={onOpenNotes} />);

    await user.click(screen.getByText("Edit Notes"));
    expect(onOpenNotes).toHaveBeenCalled();
  });
});

describe("DetailPanel — Concept Node", () => {
  const conceptEdges = sampleEdges.filter(
    (e) => e.from === "double_loop" || e.to === "double_loop"
  );

  it("displays concept fields as editable controls", () => {
    render(<DetailPanel node={doubleLoop} edges={conceptEdges} {...defaultDetailProps} />);
    expect(screen.getByDisplayValue("distinction")).toBeInTheDocument();
    expect(screen.getByDisplayValue("theoretical")).toBeInTheDocument();
    expect(screen.getByDisplayValue("active")).toBeInTheDocument();
  });

  it("displays originator as dropdown with thinker names", () => {
    render(<DetailPanel node={doubleLoop} edges={conceptEdges} {...defaultDetailProps} />);
    const originatorSelect = screen.getByDisplayValue("Chris Argyris");
    expect(originatorSelect.tagName).toBe("SELECT");
  });
});

describe("NotesPane", () => {
  const defaultNotesProps = {
    nodes: sampleGraphData.nodes,
    onNodeUpdate: vi.fn(),
    onClose: vi.fn(),
  };

  it("renders notes pane with node name", () => {
    render(<NotesPane node={argyris} edges={[]} {...defaultNotesProps} />);
    expect(screen.getByText(/Notes: Chris Argyris/)).toBeInTheDocument();
  });

  it("shows edit mode by default when no notes exist", () => {
    render(<NotesPane node={argyris} edges={[]} {...defaultNotesProps} />);
    expect(screen.getByPlaceholderText(/Write notes in markdown/)).toBeInTheDocument();
  });

  it("shows read mode with markdown when notes exist", () => {
    const nodeWithNotes = { ...argyris, notes: "**Bold** and *italic*" };
    render(<NotesPane node={nodeWithNotes} edges={[]} {...defaultNotesProps} />);
    // In read mode, the toggle button says "Edit" (to switch to edit mode)
    expect(screen.getByText("Edit")).toBeInTheDocument();
    // Should not show the textarea placeholder (we're in read mode)
    expect(screen.queryByPlaceholderText(/Write notes in markdown/)).not.toBeInTheDocument();
  });

  it("calls onNodeUpdate when notes are edited", async () => {
    const user = userEvent.setup();
    const onNodeUpdate = vi.fn();
    render(<NotesPane node={argyris} edges={[]} {...defaultNotesProps} onNodeUpdate={onNodeUpdate} />);

    const textarea = screen.getByPlaceholderText(/Write notes in markdown/);
    await user.type(textarea, "Test note");
    expect(onNodeUpdate).toHaveBeenCalled();
  });

  it("shows edge relationship context when edges have notes", () => {
    const edgesWithNotes = sampleEdges.filter(
      (e) => (e.from === "argyris" || e.to === "argyris") && e.note
    );
    render(<NotesPane node={argyris} edges={edgesWithNotes} {...defaultNotesProps} />);
    expect(screen.getByText("Relationship Context")).toBeInTheDocument();
    expect(screen.getByText(/Learning organisation draws directly/)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<NotesPane node={argyris} edges={[]} {...defaultNotesProps} onClose={onClose} />);

    const closeButtons = screen.getAllByText("\u00d7");
    await user.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
