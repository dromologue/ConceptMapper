import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBar } from "../ui/StatusBar";

const defaultProps = {
  nodeCount: 42,
  edgeCount: 18,
  saveIndicator: false,
  interactionMode: "normal" as const,
  themeName: "Midnight",
};

describe("StatusBar", () => {
  it("displays node and edge counts", () => {
    render(<StatusBar {...defaultProps} />);
    expect(screen.getByText("42 nodes")).toBeInTheDocument();
    expect(screen.getByText("18 edges")).toBeInTheDocument();
  });

  it("displays theme name", () => {
    render(<StatusBar {...defaultProps} />);
    expect(screen.getByText("Midnight")).toBeInTheDocument();
  });

  it("shows edge mode status", () => {
    render(<StatusBar {...defaultProps} interactionMode="add-edge-source" />);
    expect(screen.getByText("Select source node...")).toBeInTheDocument();
  });

  it("shows save indicator when active", () => {
    const { container } = render(<StatusBar {...defaultProps} saveIndicator={true} />);
    const saveEl = container.querySelector(".status-bar-save");
    expect(saveEl?.className).toContain("visible");
  });
});
