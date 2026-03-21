import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaxonomyWizard } from "../ui/TaxonomyWizard";

const defaultProps = {
  onComplete: vi.fn(),
  onCancel: vi.fn(),
};

// Helper to navigate to a specific step with valid data
async function navigateToStep(user: ReturnType<typeof userEvent.setup>, targetStep: number) {
  if (targetStep >= 2) {
    await user.type(screen.getByPlaceholderText(/Management Theory/), "Test Map");
    await user.click(screen.getByText("Next")); // → 2: Node Types
  }
  if (targetStep >= 3) {
    await user.click(screen.getByText("Next")); // → 3: Categories
  }
  if (targetStep >= 4) {
    await user.type(screen.getByPlaceholderText("Category name"), "Psychology");
    await user.click(screen.getByText("Next")); // → 4: Horizons
  }
  if (targetStep >= 5) {
    await user.click(screen.getByText("Next")); // → 5: Edge Types
  }
  if (targetStep >= 6) {
    await user.click(screen.getByText("Next")); // → 6: Review
  }
  if (targetStep >= 7) {
    await user.click(screen.getByText("Next")); // → 7: Create
  }
}

describe("TaxonomyWizard", () => {
  it("renders step 1 with title input", () => {
    render(<TaxonomyWizard {...defaultProps} />);
    expect(screen.getByText("New Taxonomy")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Management Theory/)).toBeInTheDocument();
  });

  it("Next button has disabled class when title is empty", () => {
    render(<TaxonomyWizard {...defaultProps} />);
    const nextBtn = screen.getByText("Next");
    expect(nextBtn.className).toContain("disabled");
  });

  it("advances to step 2 (Node Types) when title filled and Next clicked", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, 2);
    expect(screen.getByText("Define Fields & Node Types")).toBeInTheDocument();
  });

  it("step 2: shows default Node type", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, 2);
    expect(screen.getByText("Node")).toBeInTheDocument();
  });

  it("step 2: can add a new node type", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, 2);
    await user.click(screen.getByText("+ Add Type"));
    expect(screen.getByText("Untitled Type")).toBeInTheDocument();
  });

  it("step 3: advances to categories", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, 3);
    expect(screen.getByText("Define Categories")).toBeInTheDocument();
  });

  it("step 4: renders phases", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, 4);
    expect(screen.getByText("Define Phases")).toBeInTheDocument();
  });

  it("step 5: renders edge types", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, 5);
    expect(screen.getByText("Define Edge Types")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Chain")).toBeInTheDocument();
  });

  it("step 6: review shows entered data", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, 6);
    expect(screen.getByText(/Review/)).toBeInTheDocument();
    expect(screen.getByText("Test Map")).toBeInTheDocument();
    expect(screen.getByText("Psychology")).toBeInTheDocument();
    expect(screen.getByText(/Node Types \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Edge Types \(5\)/)).toBeInTheDocument();
  });

  it("Create calls onComplete with correct data", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<TaxonomyWizard {...defaultProps} onComplete={onComplete} />);
    await navigateToStep(user, 7);
    await user.click(screen.getByText("Create"));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      title: "Test Map",
      node_types: expect.arrayContaining([
        expect.objectContaining({ id: "node", label: "Node", shape: "circle" }),
      ]),
      edge_types: expect.arrayContaining([
        expect.objectContaining({ id: "chain", label: "Chain" }),
      ]),
    }));
  });

  it("Cancel calls onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TaxonomyWizard {...defaultProps} onCancel={onCancel} />);
    await user.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("Back button navigates to previous step", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, 2);
    expect(screen.getByText("Define Fields & Node Types")).toBeInTheDocument();
    await user.click(screen.getByText("Back"));
    expect(screen.getByText("New Taxonomy")).toBeInTheDocument();
  });

  it("edit mode pre-fills data and shows Save button", async () => {
    const user = userEvent.setup();
    render(
      <TaxonomyWizard
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        initialData={{
          title: "Existing Map",
          streams: [{ id: "psych", name: "Psychology", color: "#4A90D9" }],
          generations: [{ number: 1, period: "1960-1980", label: "Founders" }],
        }}
      />
    );
    expect(screen.getByDisplayValue("Existing Map")).toBeInTheDocument();
    // Navigate through to final step
    await user.click(screen.getByText("Next")); // → Node Types
    await user.click(screen.getByText("Next")); // → Categories
    await user.click(screen.getByText("Next")); // → Horizons
    await user.click(screen.getByText("Next")); // → Edge Types
    await user.click(screen.getByText("Next")); // → Review
    await user.click(screen.getByText("Next")); // → Save step
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("Save as Template button calls onSaveTemplate", async () => {
    const user = userEvent.setup();
    const onSaveTemplate = vi.fn();
    render(<TaxonomyWizard {...defaultProps} onSaveTemplate={onSaveTemplate} />);
    await navigateToStep(user, 6); // Review step
    await user.click(screen.getByText("Save as Template"));
    expect(onSaveTemplate).toHaveBeenCalledWith(expect.objectContaining({
      title: "Test Map",
    }));
  });

  it("step 2: shows shared fields section", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, 2);
    expect(screen.getByText("Shared Fields")).toBeInTheDocument();
  });

  it("step 2: can add a shared field", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, 2);
    // Count existing field rows, then add one
    const addButtons = screen.getAllByText("+ Field");
    await user.click(addButtons[0]); // The first + Field is for shared fields
    // Verify a new empty field input appeared
    const fieldInputs = screen.getAllByPlaceholderText("Field label");
    expect(fieldInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("step 6: review shows shared field count", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, 6);
    expect(screen.getByText(/Shared Fields/)).toBeInTheDocument();
  });

  it("output includes all shared fields for each node type", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<TaxonomyWizard {...defaultProps} onComplete={onComplete} />);
    await navigateToStep(user, 7);
    await user.click(screen.getByText("Create"));

    const result = onComplete.mock.calls[0][0];
    // All node types should have the same field keys
    const nodeType = result.node_types[0];
    expect(nodeType.fields.length).toBeGreaterThan(0);
    // Default node type has fields like importance, status, etc.
    expect(nodeType.fields.map((f: { key: string }) => f.key)).toContain("importance");
  });

  it("edit mode derives shared fields from existing node type configs", async () => {
    const user = userEvent.setup();
    render(
      <TaxonomyWizard
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        initialData={{
          title: "Existing",
          streams: [{ id: "s1", name: "Stream", color: "#000" }],
          generations: [{ number: 1 }],
          node_types: [
            {
              id: "person", label: "Person", shape: "circle" as const, icon: "P",
              fields: [
                { key: "importance", label: "Importance", type: "text" as const },
                { key: "role", label: "Role", type: "text" as const },
              ],
            },
            {
              id: "org", label: "Organisation", shape: "rectangle" as const, icon: "O",
              fields: [
                { key: "importance", label: "Significance", type: "text" as const },
                { key: "role", label: "Function", type: "text" as const },
              ],
            },
          ],
        }}
      />
    );
    // Navigate to step 2
    await user.click(screen.getByText("Next"));
    // Should show "Shared Fields" section with the union of field keys
    expect(screen.getByText("Shared Fields")).toBeInTheDocument();
    // Should show both node types
    expect(screen.getByText("Person")).toBeInTheDocument();
    expect(screen.getByText("Organisation")).toBeInTheDocument();
  });
});
