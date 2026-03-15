import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "../ui/Sidebar";
import { defaultNodeTypeConfigs } from "./fixtures";

const mockNodes = [
  { id: "n1", name: "Alice", node_type: "person" as string, stream: "s1", generation: 1, properties: { importance: "major" } },
  { id: "n2", name: "Bob", node_type: "person" as string, stream: "s2", generation: 1, properties: { importance: "minor" } },
  { id: "c1", name: "Theory X", node_type: "concept" as string, stream: "s1", generation: 2, properties: { concept_type: "framework" } },
];

const defaultProps = {
  nodes: mockNodes,
  streams: [
    { id: "s1", name: "Psychology", color: "#ff0000" },
    { id: "s2", name: "Sociology", color: "#00ff00" },
  ],
  nodeTypeConfigs: defaultNodeTypeConfigs,
  activeStreams: null as Set<string> | null,
  onStreamToggle: vi.fn(),
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

  it("shows categories section", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Categories")).toBeInTheDocument();
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
    expect(screen.getByText("+ Node")).toBeInTheDocument();
  });

  it("calls onAddNode with type when add button is clicked", async () => {
    const user = userEvent.setup();
    const onAddNode = vi.fn();
    render(<Sidebar {...defaultProps} onAddNode={onAddNode} />);

    await user.click(screen.getByText("+ Node"));
    expect(onAddNode).toHaveBeenCalledWith("node");
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

  it("calls onStreamToggle when stream is clicked", async () => {
    const user = userEvent.setup();
    const onStreamToggle = vi.fn();
    render(<Sidebar {...defaultProps} onStreamToggle={onStreamToggle} />);

    await user.click(screen.getByText("Psychology"));
    expect(onStreamToggle).toHaveBeenCalledWith("s1");
  });

  it("shows node type icon indicators", () => {
    render(<Sidebar {...defaultProps} />);
    // Person nodes show "P", Concept nodes show "C"
    const typeIndicators = screen.getAllByText("P");
    expect(typeIndicators.length).toBeGreaterThanOrEqual(2); // Alice and Bob
    expect(screen.getByText("C")).toBeInTheDocument(); // Theory X
  });
});
