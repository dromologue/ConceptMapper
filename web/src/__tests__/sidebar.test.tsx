import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "../ui/Sidebar";
import { legacyNodeTypeConfigs } from "./fixtures";
import { createEmptyFilterState } from "../utils/filters";

const mockNodes = [
  { id: "n1", name: "Alice", node_type: "person" as string, stream: "s1", generation: 1, properties: { importance: "major" } },
  { id: "n2", name: "Bob", node_type: "person" as string, stream: "s2", generation: 1, properties: { importance: "minor" } },
  { id: "c1", name: "Theory X", node_type: "concept" as string, stream: "s1", generation: 2, properties: { concept_type: "framework" } },
];

const defaultProps = {
  nodes: mockNodes,
  classifiers: [
    {
      id: "stream", label: "Streams", layout: "x" as const,
      values: [
        { id: "s1", label: "Psychology", color: "#ff0000" },
        { id: "s2", label: "Sociology", color: "#00ff00" },
      ],
    },
  ],
  nodeTypeConfigs: legacyNodeTypeConfigs,
  filters: createEmptyFilterState(),
  onClassifierToggle: vi.fn(),
  onTagToggle: vi.fn(),
  onAttributeToggle: vi.fn(),
  onDateRangeChange: vi.fn(),
  onShowAll: vi.fn(),
  onSelectNode: vi.fn(),
  selectedNodeId: null as string | null,
  onAddNode: vi.fn(),
  onAddEdge: vi.fn(),
  interactionMode: "normal",
  onCancelAddEdge: vi.fn(),
};

describe("Sidebar", () => {
  it("renders Explorer header", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Explorer")).toBeInTheDocument();
  });

  it("shows classifier section headers (collapsed by default)", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Streams")).toBeInTheDocument();
    // Items inside collapsed sections are not rendered
    expect(screen.queryByText("Psychology")).not.toBeInTheDocument();
  });

  it("expands classifier section on click and shows items", async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} />);
    await user.click(screen.getByText("Streams"));
    expect(screen.getByText("Psychology")).toBeInTheDocument();
    expect(screen.getByText("Sociology")).toBeInTheDocument();
  });

  it("shows node list", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Theory X")).toBeInTheDocument();
  });

  it("calls onSelectNode when node item is clicked", async () => {
    const user = userEvent.setup();
    const onSelectNode = vi.fn();
    render(<Sidebar {...defaultProps} onSelectNode={onSelectNode} />);

    await user.click(screen.getByText("Alice"));
    expect(onSelectNode).toHaveBeenCalledWith(mockNodes[0]);
  });

  it("highlights selected node", () => {
    render(<Sidebar {...defaultProps} selectedNodeId="n1" />);
    const nodeItem = screen.getByText("Alice").closest(".sidebar-node-item");
    expect(nodeItem?.className).toContain("selected");
  });

  it("filters nodes by search", async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} />);

    const filterInput = screen.getByPlaceholderText("Filter nodes...");
    await user.type(filterInput, "alice");

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("shows dynamic add buttons from nodeTypeConfigs", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("+ Person")).toBeInTheDocument();
    expect(screen.getByText("+ Concept")).toBeInTheDocument();
  });

  it("calls onAddNode with type when add button is clicked", async () => {
    const user = userEvent.setup();
    const onAddNode = vi.fn();
    render(<Sidebar {...defaultProps} onAddNode={onAddNode} />);

    await user.click(screen.getByText("+ Person"));
    expect(onAddNode).toHaveBeenCalledWith("person");
  });

  it("shows + Edge button", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("+ Edge")).toBeInTheDocument();
  });

  it("calls onAddEdge when + Edge is clicked", async () => {
    const user = userEvent.setup();
    const onAddEdge = vi.fn();
    render(<Sidebar {...defaultProps} onAddEdge={onAddEdge} />);

    await user.click(screen.getByText("+ Edge"));
    expect(onAddEdge).toHaveBeenCalled();
  });

  it("shows Cancel Edge when in edge mode", () => {
    render(<Sidebar {...defaultProps} interactionMode="add-edge-source" />);
    expect(screen.getByText("Cancel Edge")).toBeInTheDocument();
  });

  it("calls onClassifierToggle when classifier value is clicked", async () => {
    const user = userEvent.setup();
    const onClassifierToggle = vi.fn();
    render(<Sidebar {...defaultProps} onClassifierToggle={onClassifierToggle} />);

    // Expand classifier section first
    await user.click(screen.getByText("Streams"));
    await user.click(screen.getByText("Psychology"));
    expect(onClassifierToggle).toHaveBeenCalledWith("stream", "s1", ["s1", "s2"]);
  });

  it("groups nodes by type with type headers", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Person")).toBeInTheDocument();
    expect(screen.getByText("Concept")).toBeInTheDocument();
  });

  it("uses classifier labels as section headers", async () => {
    const user = userEvent.setup();
    render(<Sidebar {...defaultProps} classifiers={[
      { id: "workstream", label: "Workstreams", layout: "x", values: [{ id: "ws1", label: "Backend" }] },
      { id: "sprint", label: "Sprints", layout: "y", values: [{ id: "1", label: "Sprint 1" }, { id: "2", label: "Sprint 2" }] },
    ]} />);
    expect(screen.getByText("Workstreams")).toBeInTheDocument();
    expect(screen.getByText("Sprints")).toBeInTheDocument();
    await user.click(screen.getByText("Sprints"));
    expect(screen.getByText("Sprint 1")).toBeInTheDocument();
    expect(screen.getByText("Sprint 2")).toBeInTheDocument();
  });

  it("renders attribute filter section headers (collapsed)", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Importance")).toBeInTheDocument();
  });

  it("calls onAttributeToggle with all values when attribute value is clicked", async () => {
    const user = userEvent.setup();
    const onAttributeToggle = vi.fn();
    render(<Sidebar {...defaultProps} onAttributeToggle={onAttributeToggle} />);

    // Expand the Importance section
    await user.click(screen.getByText("Importance"));
    await user.click(screen.getByText("major"));
    expect(onAttributeToggle).toHaveBeenCalledWith(
      "person", "importance", "major",
      expect.arrayContaining(["dominant", "major", "minor", "secondary"])
    );
  });

  it("hides filtered-out nodes from the node list", () => {
    const filters = {
      streams: new Set(["s1"]),
      generations: null,
      classifiers: [],
      attributes: [],
      dateRanges: [],
      tags: null,
    };
    render(<Sidebar {...defaultProps} filters={filters} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.getByText("Theory X")).toBeInTheDocument();
  });

  it("shows Show All button when filters are active", () => {
    const filters = {
      streams: new Set(["s1"]),
      generations: null,
      classifiers: [],
      attributes: [],
      dateRanges: [],
      tags: null,
    };
    render(<Sidebar {...defaultProps} filters={filters} />);
    expect(screen.getByText("Show All")).toBeInTheDocument();
  });

  it("does not show Show All button when no filters are active", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.queryByText("Show All")).not.toBeInTheDocument();
  });

  it("calls onShowAll when Show All is clicked", async () => {
    const user = userEvent.setup();
    const onShowAll = vi.fn();
    const filters = {
      streams: new Set(["s1"]),
      generations: null,
      classifiers: [],
      attributes: [],
      dateRanges: [],
      tags: null,
    };
    render(<Sidebar {...defaultProps} filters={filters} onShowAll={onShowAll} />);

    await user.click(screen.getByText("Show All"));
    expect(onShowAll).toHaveBeenCalled();
  });

  it("renders text field filters when values have low cardinality", async () => {
    const user = userEvent.setup();
    const nodesWithTags = [
      { id: "n1", name: "Alice", node_type: "person", stream: "s1", generation: 1, properties: { importance: "major", tags: "Harvard" } },
      { id: "n2", name: "Bob", node_type: "person", stream: "s2", generation: 1, properties: { importance: "minor", tags: "MIT" } },
    ];
    render(<Sidebar {...defaultProps} nodes={nodesWithTags} />);
    expect(screen.getByText("Tags")).toBeInTheDocument();
    // Expand Tags section
    await user.click(screen.getByText("Tags"));
    expect(screen.getByText("Harvard")).toBeInTheDocument();
    expect(screen.getByText("MIT")).toBeInTheDocument();
  });

  it("renders date range filter for nodes with date_from/date_to fields", async () => {
    const user = userEvent.setup();
    const nodesWithDates = [
      { id: "n1", name: "Alice", node_type: "person", stream: "s1", generation: 1, properties: { importance: "major", date_from: "1923", date_to: "2013" } },
      { id: "n2", name: "Bob", node_type: "person", stream: "s2", generation: 1, properties: { importance: "minor", date_from: "1947" } },
    ];
    render(<Sidebar {...defaultProps} nodes={nodesWithDates} />);
    expect(screen.getByText("Person Date Range")).toBeInTheDocument();
    // Expand Date Range section
    await user.click(screen.getByText("Person Date Range"));
    // Date inputs use type="date" with min/max attributes
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
  });
});
