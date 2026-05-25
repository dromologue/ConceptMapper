// SPEC: REQ-010 (Detail Panel), REQ-018 (Editing), REQ-030 (Attribute Editing)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailPanel } from "../ui/DetailPanel";
import { NotesPane } from "../ui/NotesPane";
import { argyris, doubleLoop, sampleEdges, sampleClassifiers, sampleGraphData, legacyNodeTypeConfigs } from "./fixtures";

const defaultDetailProps = {
  nodes: sampleGraphData.nodes,
  classifiers: sampleClassifiers,
  nodeTypeConfigs: legacyNodeTypeConfigs,
  onClose: vi.fn(),
  onNodeUpdate: vi.fn(),
  onNavigateToNode: vi.fn(),
  onOpenNotes: vi.fn(),
  notesOpen: false,
};

describe("DetailPanel — Person Node", () => {
  const personEdges = sampleEdges.filter(
    (e) => e.from === "argyris" || e.to === "argyris"
  );

  it("displays person name in editable input", () => {
    render(<DetailPanel node={argyris} edges={personEdges} {...defaultDetailProps} />);
    const nameInput = screen.getByLabelText("Node name");
    expect(nameInput).toHaveValue("Chris Argyris");
  });

  it("displays type badge from config", () => {
    render(<DetailPanel node={argyris} edges={personEdges} {...defaultDetailProps} />);
    expect(screen.getAllByText("Person").length).toBeGreaterThanOrEqual(1);
  });

  // AC-030-03: Importance editable as dropdown
  it("shows importance as editable dropdown", () => {
    render(<DetailPanel node={argyris} edges={personEdges} {...defaultDetailProps} />);
    const importanceSelect = screen.getByDisplayValue("dominant");
    expect(importanceSelect.tagName).toBe("SELECT");
  });

  it("calls onNodeUpdate when importance is changed", async () => {
    const user = userEvent.setup();
    const onNodeUpdate = vi.fn();
    render(<DetailPanel node={argyris} edges={personEdges} {...defaultDetailProps} onNodeUpdate={onNodeUpdate} />);

    await user.selectOptions(screen.getByDisplayValue("dominant"), "major");
    expect(onNodeUpdate).toHaveBeenCalledWith("argyris", expect.objectContaining({
      properties: expect.objectContaining({ importance: "major" }),
    }));
  });

  it("displays connections with edge type labels", () => {
    render(<DetailPanel node={argyris} edges={personEdges} {...defaultDetailProps} />);
    expect(screen.getByText(/Connections \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("Chain")).toBeInTheDocument();
    expect(screen.getByText("Originates")).toBeInTheDocument();
  });

  it("calls onNavigateToNode when connection name is clicked", async () => {
    const user = userEvent.setup();
    const onNavigateToNode = vi.fn();
    render(<DetailPanel node={argyris} edges={personEdges} {...defaultDetailProps} onNavigateToNode={onNavigateToNode} />);

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

  it("shows concept type badge", () => {
    render(<DetailPanel node={doubleLoop} edges={conceptEdges} {...defaultDetailProps} />);
    expect(screen.getAllByText("Concept").length).toBeGreaterThanOrEqual(1);
  });
});

// SPEC: REQ-111 (Notes file attach + markdown rendering)
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

  it("opens in preview mode by default", () => {
    render(<NotesPane node={argyris} edges={[]} {...defaultNotesProps} />);
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(document.querySelector(".notes-preview")).toBeInTheDocument();
  });

  it("renders empty-state hint when there are no notes", () => {
    render(<NotesPane node={argyris} edges={[]} {...defaultNotesProps} />);
    expect(screen.getByText(/No notes/)).toBeInTheDocument();
  });

  it("renders markdown content as HTML in preview mode", () => {
    const node = { ...argyris, notes: "# Heading\n\n**bold** text and a [link](https://example.com)." };
    render(<NotesPane node={node} edges={[]} {...defaultNotesProps} />);
    const preview = document.querySelector(".notes-preview")!;
    expect(preview.querySelector("h1")).toHaveTextContent("Heading");
    expect(preview.querySelector("strong")).toHaveTextContent("bold");
    expect(preview.querySelector("a")).toHaveAttribute("href", "https://example.com");
  });

  it("switches to a wrapping textarea in edit mode", async () => {
    const user = userEvent.setup();
    const node = { ...argyris, notes: "Some long line that should wrap naturally inside the textarea rather than overflowing horizontally." };
    render(<NotesPane node={node} edges={[]} {...defaultNotesProps} />);
    await user.click(screen.getByText("Edit"));
    const textarea = document.querySelector(".notes-editor") as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toContain("Some long line");
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("shows Attach button when no file is attached", () => {
    render(<NotesPane node={argyris} edges={[]} {...defaultNotesProps} />);
    expect(screen.getByText(/Attach \.md/)).toBeInTheDocument();
  });

  it("shows attached filename and Detach button when a file is attached", () => {
    const node = { ...argyris, notes_file: "/Users/me/notes/argyris.md" };
    render(<NotesPane node={node} edges={[]} {...defaultNotesProps} />);
    expect(screen.getByText("argyris.md")).toBeInTheDocument();
    expect(screen.getByText("Detach")).toBeInTheDocument();
    expect(screen.queryByText(/Attach \.md/)).not.toBeInTheDocument();
  });

  it("detaching keeps inline content but clears the file reference", async () => {
    const user = userEvent.setup();
    const onNodeUpdate = vi.fn();
    const node = { ...argyris, notes: "Loaded body.", notes_file: "/abs/path/notes.md" };
    render(<NotesPane node={node} edges={[]} {...defaultNotesProps} onNodeUpdate={onNodeUpdate} />);
    await user.click(screen.getByText("Detach"));
    expect(onNodeUpdate).toHaveBeenCalledWith(node.id, { notes_file: undefined });
    // Inline body remains in preview after detach
    expect(document.querySelector(".notes-preview")?.textContent).toContain("Loaded body");
  });

  it("shows edge relationship context when edges have notes", () => {
    const edgesWithNotes = sampleEdges.filter(
      (e) => (e.from === "argyris" || e.to === "argyris") && e.note
    );
    render(<NotesPane node={argyris} edges={edgesWithNotes} {...defaultNotesProps} />);
    expect(screen.getByText("Relationship Context")).toBeInTheDocument();
    expect(screen.getByText(/Learning organisation draws directly/)).toBeInTheDocument();
  });
});
