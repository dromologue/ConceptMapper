// SPEC: REQ-021 (View Modes), REQ-023 (Toolbar), REQ-025 (Import)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../ui/Toolbar";

const defaultProps = {
  viewMode: "full" as const,
  onViewModeChange: vi.fn(),
  onDownloadImage: vi.fn(),
  onDownloadFile: vi.fn(),
  onAddThinker: vi.fn(),
  onAddConcept: vi.fn(),
  onAddEdge: vi.fn(),
  interactionMode: "normal" as const,
  onCancelAddEdge: vi.fn(),
  onImportFile: vi.fn(),
};

describe("Toolbar", () => {
  // AC-023-01: Toolbar is visible
  it("renders all toolbar groups", () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getByText("File")).toBeInTheDocument();
  });

  // AC-023-03: View mode toggle buttons
  it("renders three view mode buttons", () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByText("Full Network")).toBeInTheDocument();
    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Concepts")).toBeInTheDocument();
  });

  // AC-023-04: Active view mode button is visually distinct
  it("highlights the active view mode", () => {
    render(<Toolbar {...defaultProps} viewMode="people" />);
    expect(screen.getByText("People").className).toContain("active");
    expect(screen.getByText("Full Network").className).not.toContain("active");
  });

  // AC-021-01/02: Clicking view mode buttons triggers onViewModeChange
  it("calls onViewModeChange when view buttons are clicked", async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();
    render(<Toolbar {...defaultProps} onViewModeChange={onViewModeChange} />);

    await user.click(screen.getByText("People"));
    expect(onViewModeChange).toHaveBeenCalledWith("people");

    await user.click(screen.getByText("Concepts"));
    expect(onViewModeChange).toHaveBeenCalledWith("concepts");
  });

  // AC-023-05: Add Thinker button
  it("calls onAddThinker when + Thinker is clicked", async () => {
    const user = userEvent.setup();
    const onAddThinker = vi.fn();
    render(<Toolbar {...defaultProps} onAddThinker={onAddThinker} />);

    await user.click(screen.getByText("+ Thinker"));
    expect(onAddThinker).toHaveBeenCalled();
  });

  // AC-023-06: Add Concept button
  it("calls onAddConcept when + Concept is clicked", async () => {
    const user = userEvent.setup();
    const onAddConcept = vi.fn();
    render(<Toolbar {...defaultProps} onAddConcept={onAddConcept} />);

    await user.click(screen.getByText("+ Concept"));
    expect(onAddConcept).toHaveBeenCalled();
  });

  // AC-023-07: Add Edge button triggers edge mode
  it("calls onAddEdge when + Edge is clicked in normal mode", async () => {
    const user = userEvent.setup();
    const onAddEdge = vi.fn();
    render(<Toolbar {...defaultProps} onAddEdge={onAddEdge} />);

    await user.click(screen.getByText("+ Edge"));
    expect(onAddEdge).toHaveBeenCalled();
  });

  // AC-023-07a: Edge mode shows status message
  it("shows edge drawing status when in add-edge-source mode", () => {
    render(<Toolbar {...defaultProps} interactionMode="add-edge-source" />);
    expect(screen.getByText(/Click source node/)).toBeInTheDocument();
    expect(screen.getByText(/(Esc to cancel)/)).toBeInTheDocument();
  });

  it("shows target prompt when in add-edge-target mode", () => {
    render(<Toolbar {...defaultProps} interactionMode="add-edge-target" />);
    expect(screen.getByText(/Click target node/)).toBeInTheDocument();
  });

  // AC-023-09: Download Image button
  it("calls onDownloadImage when Download Image is clicked", async () => {
    const user = userEvent.setup();
    const onDownloadImage = vi.fn();
    render(<Toolbar {...defaultProps} onDownloadImage={onDownloadImage} />);

    await user.click(screen.getByText("Download Image"));
    expect(onDownloadImage).toHaveBeenCalled();
  });

  // AC-023-10: Download File button
  it("calls onDownloadFile when Download File is clicked", async () => {
    const user = userEvent.setup();
    const onDownloadFile = vi.fn();
    render(<Toolbar {...defaultProps} onDownloadFile={onDownloadFile} />);

    await user.click(screen.getByText("Download File"));
    expect(onDownloadFile).toHaveBeenCalled();
  });

  // REQ-025: Import button
  it("calls onImportFile when Import is clicked", async () => {
    const user = userEvent.setup();
    const onImportFile = vi.fn();
    render(<Toolbar {...defaultProps} onImportFile={onImportFile} />);

    await user.click(screen.getByText("Import"));
    expect(onImportFile).toHaveBeenCalled();
  });
});
