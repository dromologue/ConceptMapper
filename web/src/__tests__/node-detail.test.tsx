// SPEC: REQ-010 (Detail Panel), REQ-018 (Editing), REQ-023 (Notes)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NodeDetail } from "../ui/NodeDetail";
import { argyris, senge, doubleLoop, sampleEdges, sampleStreams, sampleGraphData } from "./fixtures";

const defaultProps = {
  nodes: sampleGraphData.nodes,
  streams: sampleStreams,
  onClose: vi.fn(),
  onNotesChange: vi.fn(),
  onNavigateToNode: vi.fn(),
};

describe("NodeDetail — Thinker Node", () => {
  const thinkerEdges = sampleEdges.filter(
    (e) => e.from === "argyris" || e.to === "argyris"
  );

  // AC-010-04: Detail panel shows all node fields
  it("displays thinker name and type badge", () => {
    render(<NodeDetail node={argyris} edges={thinkerEdges} {...defaultProps} />);
    expect(screen.getByText("Chris Argyris")).toBeInTheDocument();
    expect(screen.getByText("thinker")).toBeInTheDocument();
  });

  it("displays dates, eminence, generation", () => {
    render(<NodeDetail node={argyris} edges={thinkerEdges} {...defaultProps} />);
    expect(screen.getByText("1923–2013")).toBeInTheDocument();
    expect(screen.getByText("dominant")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("displays structural roles", () => {
    render(<NodeDetail node={argyris} edges={thinkerEdges} {...defaultProps} />);
    expect(screen.getByText("intellectual_leader, chain_originator")).toBeInTheDocument();
  });

  it("displays active period and institutional base", () => {
    render(<NodeDetail node={argyris} edges={thinkerEdges} {...defaultProps} />);
    expect(screen.getByText("1960–1995")).toBeInTheDocument();
    expect(screen.getByText("Harvard Business School")).toBeInTheDocument();
  });

  it("displays stream with color dot", () => {
    render(<NodeDetail node={argyris} edges={thinkerEdges} {...defaultProps} />);
    expect(screen.getByText("Psychology & Cognition")).toBeInTheDocument();
  });

  // AC-010-03: Close button
  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<NodeDetail node={argyris} edges={thinkerEdges} {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  // Connections section
  it("displays connections with edge type labels", () => {
    render(<NodeDetail node={argyris} edges={thinkerEdges} {...defaultProps} />);
    expect(screen.getByText(/Connections \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("Chain")).toBeInTheDocument();
    expect(screen.getByText("Originates")).toBeInTheDocument();
  });

  // Edge note display — note appears in both the connections list and the notes section
  it("displays edge notes in connections", () => {
    render(<NodeDetail node={argyris} edges={thinkerEdges} {...defaultProps} />);
    // The note text appears in the edge-notes-list and/or the connections section
    const noteElements = screen.getAllByText(/Learning organisation draws directly/);
    expect(noteElements.length).toBeGreaterThan(0);
  });

  // Clickable connection names
  it("calls onNavigateToNode when connection name is clicked", async () => {
    const user = userEvent.setup();
    const onNavigateToNode = vi.fn();
    render(<NodeDetail node={argyris} edges={thinkerEdges} {...defaultProps} onNavigateToNode={onNavigateToNode} />);

    await user.click(screen.getByText("Peter Senge"));
    expect(onNavigateToNode).toHaveBeenCalledWith("senge");
  });
});

describe("NodeDetail — Concept Node", () => {
  const conceptEdges = sampleEdges.filter(
    (e) => e.from === "double_loop" || e.to === "double_loop"
  );

  it("displays concept fields", () => {
    render(<NodeDetail node={doubleLoop} edges={conceptEdges} {...defaultProps} />);
    expect(screen.getByText("Double-Loop Learning")).toBeInTheDocument();
    expect(screen.getByText("concept")).toBeInTheDocument();
    expect(screen.getByText("distinction")).toBeInTheDocument();
    expect(screen.getByText("theoretical")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("1977")).toBeInTheDocument();
  });

  // Originator is a clickable link
  it("displays originator as clickable link", async () => {
    const user = userEvent.setup();
    const onNavigateToNode = vi.fn();
    render(<NodeDetail node={doubleLoop} edges={conceptEdges} {...defaultProps} onNavigateToNode={onNavigateToNode} />);

    // Find the link button for the originator (Chris Argyris appears both as originator and in connections)
    const originatorLink = screen.getAllByText("Chris Argyris").find(
      el => el.tagName === "BUTTON"
    );
    expect(originatorLink).toBeTruthy();
    if (originatorLink) await user.click(originatorLink);
    expect(onNavigateToNode).toHaveBeenCalledWith("argyris");
  });
});

describe("NodeDetail — Notes Section", () => {
  // AC-023-15: Notes section is collapsible
  it("renders notes section header with toggle", () => {
    render(<NodeDetail node={argyris} edges={[]} {...defaultProps} />);
    expect(screen.getByText("Notes & Content")).toBeInTheDocument();
  });

  // AC-018-06: Notes textarea is visible and editable
  it("renders notes textarea", () => {
    render(<NodeDetail node={argyris} edges={[]} {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Add notes about this node...");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute("rows", "8");
  });

  // AC-018-06a: Notes changes update immediately
  it("calls onNotesChange when notes are edited", async () => {
    const user = userEvent.setup();
    const onNotesChange = vi.fn();
    render(<NodeDetail node={argyris} edges={[]} {...defaultProps} onNotesChange={onNotesChange} />);

    const textarea = screen.getByPlaceholderText("Add notes about this node...");
    await user.type(textarea, "My research note");
    expect(onNotesChange).toHaveBeenCalled();
    expect(onNotesChange).toHaveBeenCalledWith("argyris", expect.stringContaining("M"));
  });

  // Collapsible behavior
  it("hides notes body when toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<NodeDetail node={argyris} edges={[]} {...defaultProps} />);

    // Notes section should be open by default
    expect(screen.getByPlaceholderText("Add notes about this node...")).toBeInTheDocument();

    // Click the header to collapse
    await user.click(screen.getByText("Notes & Content"));
    expect(screen.queryByPlaceholderText("Add notes about this node...")).not.toBeInTheDocument();

    // Click again to expand
    await user.click(screen.getByText("Notes & Content"));
    expect(screen.getByPlaceholderText("Add notes about this node...")).toBeInTheDocument();
  });

  // Edge notes in notes section
  it("displays edge relationship context in notes section", () => {
    const edgesWithNotes = sampleEdges.filter(
      (e) => (e.from === "argyris" || e.to === "argyris") && e.note
    );
    render(<NodeDetail node={argyris} edges={edgesWithNotes} {...defaultProps} />);
    const noteElements = screen.getAllByText(/Learning organisation draws directly/);
    expect(noteElements.length).toBeGreaterThan(0);
  });

  // Pre-existing notes shown
  it("displays pre-existing notes from node data", () => {
    const nodeWithNotes = { ...argyris, notes: "Important thinker in organizational learning" };
    render(<NodeDetail node={nodeWithNotes} edges={[]} {...defaultProps} />);
    const textarea = screen.getByPlaceholderText("Add notes about this node...");
    expect(textarea).toHaveValue("Important thinker in organizational learning");
  });
});
