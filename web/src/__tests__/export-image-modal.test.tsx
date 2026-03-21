import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportImageModal } from "../ui/ExportImageModal";

// SPEC: REQ-062 - Image Export (PNG/PDF)

const defaultProps = {
  onExport: vi.fn(),
  onCancel: vi.fn(),
  currentBgColor: "#1a1a2e",
};

describe("ExportImageModal", () => {
  it("renders format options (PNG and PDF)", () => {
    render(<ExportImageModal {...defaultProps} />);
    expect(screen.getByText("PNG")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("renders background options", () => {
    render(<ExportImageModal {...defaultProps} />);
    expect(screen.getByText("As Viewed")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("renders resolution options", () => {
    render(<ExportImageModal {...defaultProps} />);
    expect(screen.getByText("1x")).toBeInTheDocument();
    expect(screen.getByText("2x (Retina)")).toBeInTheDocument();
  });

  it("shows color picker when Custom background selected", async () => {
    const user = userEvent.setup();
    render(<ExportImageModal {...defaultProps} />);
    await user.click(screen.getByText("Custom"));
    expect(document.querySelector('input[type="color"]')).toBeInTheDocument();
  });

  it("calls onExport with correct options when Export clicked", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<ExportImageModal {...defaultProps} onExport={onExport} />);
    await user.click(screen.getByText("Export"));
    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({
      format: "png",
      background: "as-viewed",
      scale: 2,
    }));
  });

  it("calls onCancel when Cancel clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ExportImageModal {...defaultProps} onCancel={onCancel} />);
    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("PDF format can be selected", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<ExportImageModal {...defaultProps} onExport={onExport} />);
    await user.click(screen.getByText("PDF"));
    await user.click(screen.getByText("Export"));
    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({
      format: "pdf",
    }));
  });
});
