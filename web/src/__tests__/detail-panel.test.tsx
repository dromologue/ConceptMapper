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

  it("shows importance as editable dropdown from config", () => {
    render(<DetailPanel node={argyris} edges={personEdges} {...defaultDetailProps} />);
    expect(screen.getByText("Importance")).toBeInTheDocument();
    const importanceSelect = screen.getByDisplayValue("dominant");
    expect(importanceSelect.tagName).toBe("SELECT");
  });

  it("calls onNodeUpdate with properties when importance is changed", async () => {
    const user = userEvent.setup();
    const onNodeUpdate = vi.fn();
    render(<DetailPanel node={argyris} edges={personEdges} {...defaultDetailProps} onNodeUpdate={onNodeUpdate} />);

    await user.selectOptions(screen.getByDisplayValue("dominant"), "major");
    expect(onNodeUpdate).toHaveBeenCalledWith("argyris", expect.objectContaining({
      properties: expect.objectContaining({ importance: "major" }),
    }));
  });

  it("shows config-driven text fields (From, To, Tags, Roles)", () => {
    render(<DetailPanel node={argyris} edges={personEdges} {...defaultDetailProps} />);
    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("To")).toBeInTheDocument();
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("Roles")).toBeInTheDocument();
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

  it("displays concept fields from config as editable controls", () => {
    render(<DetailPanel node={doubleLoop} edges={conceptEdges} {...defaultDetailProps} />);
    expect(screen.getByDisplayValue("distinction")).toBeInTheDocument();
    expect(screen.getByDisplayValue("theoretical")).toBeInTheDocument();
    expect(screen.getByDisplayValue("active")).toBeInTheDocument();
  });

  it("shows Concept type badge", () => {
    render(<DetailPanel node={doubleLoop} edges={conceptEdges} {...defaultDetailProps} />);
    expect(screen.getAllByText("Concept").length).toBeGreaterThanOrEqual(1);
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

  it("shows a markdown preview area in default mode", () => {
    render(<NotesPane node={argyris} edges={[]} {...defaultNotesProps} />);
    expect(document.querySelector(".notes-preview")).toBeInTheDocument();
  });

  it("renders notes content as rendered markdown bullets", () => {
    const nodeWithNotes = { ...argyris, notes: "- First point\n  - Sub point\n- Second point" };
    render(<NotesPane node={nodeWithNotes} edges={[]} {...defaultNotesProps} />);
    const preview = document.querySelector(".notes-preview")!;
    expect(preview.textContent).toContain("First point");
    expect(preview.textContent).toContain("Sub point");
    expect(preview.textContent).toContain("Second point");
    expect(preview.querySelector("ul")).toBeInTheDocument();
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
