import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaxonomyWizard } from "../ui/TaxonomyWizard";

const defaultProps = {
  onComplete: vi.fn(),
  onCancel: vi.fn(),
};

// Steps: title → node_types → classifiers → edges → review → create
async function navigateToStep(user: ReturnType<typeof userEvent.setup>, stepId: string) {
  const order = ["title", "node_types", "classifiers", "edges", "review", "create"];
  const targetIdx = order.indexOf(stepId);
  if (targetIdx < 0) throw new Error(`Unknown step: ${stepId}`);

  // Step 0 (title) is shown on render
  if (targetIdx >= 1) {
    await user.type(screen.getByPlaceholderText(/Management Theory/), "Test Map");
    await user.click(screen.getByText("Next")); // title → node_types
  }
  if (targetIdx >= 2) {
    await user.click(screen.getByText("Next")); // node_types → classifiers
  }
  if (targetIdx >= 3) {
    // Fill in default classifier so we can advance
    const classifierNameInput = screen.getByPlaceholderText("Classifier name");
    await user.clear(classifierNameInput);
    await user.type(classifierNameInput, "Category");
    const valueLabelInput = screen.getByPlaceholderText("Value label");
    await user.type(valueLabelInput, "General");
    await user.click(screen.getByText("Next")); // classifiers → edges
  }
  if (targetIdx >= 4) {
    await user.click(screen.getByText("Next")); // edges → review
  }
  if (targetIdx >= 5) {
    await user.click(screen.getByText("Next")); // review → create
  }
}

describe("TaxonomyWizard", () => {
  it("renders step 1 (title) with name input", () => {
    render(<TaxonomyWizard {...defaultProps} />);
    expect(screen.getByText("Name Your Taxonomy")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Management Theory/)).toBeInTheDocument();
  });

  it("Next button has disabled class when title is empty", () => {
    render(<TaxonomyWizard {...defaultProps} />);
    const nextBtn = screen.getByText("Next");
    expect(nextBtn.className).toContain("disabled");
  });

  it("advances to node types step", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");
    expect(screen.getByText("Define Node Types & Fields")).toBeInTheDocument();
  });

  it("node types step shows default Node type", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");
    expect(screen.getByDisplayValue("Node")).toBeInTheDocument();
  });

  it("node types step: can add a new node type", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");
    await user.click(screen.getByText("+ Add Type"));
    expect(screen.getByText("Untitled Type")).toBeInTheDocument();
  });

  it("classifiers step shows default classifier", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "classifiers");
    expect(screen.getByText("Define Classifiers")).toBeInTheDocument();
  });

  it("classifiers step: can add a classifier", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "classifiers");
    await user.click(screen.getByText("+ Add Classifier"));
    // Should now have 2 classifier name inputs
    const nameInputs = screen.getAllByPlaceholderText("Classifier name");
    expect(nameInputs.length).toBe(2);
  });

  it("edges step shows default edge types", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "edges");
    expect(screen.getByText("Define Edge Types")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Chain")).toBeInTheDocument();
  });

  it("review step shows entered data", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "review");
    expect(screen.getByText(/Review/)).toBeInTheDocument();
    expect(screen.getByText("Test Map")).toBeInTheDocument();
    expect(screen.getByText(/Node Types \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Edge Types \(5\)/)).toBeInTheDocument();
  });

  it("Create calls onComplete with classifiers", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<TaxonomyWizard {...defaultProps} onComplete={onComplete} />);
    await navigateToStep(user, "create");
    await user.click(screen.getByText("Create"));

    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      title: "Test Map",
      classifiers: expect.any(Array),
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
    await navigateToStep(user, "node_types");
    expect(screen.getByText("Define Node Types & Fields")).toBeInTheDocument();
    await user.click(screen.getByText("Back"));
    expect(screen.getByPlaceholderText(/Management Theory/)).toBeInTheDocument();
  });

  it("edit mode pre-fills data and shows Save button", async () => {
    const user = userEvent.setup();
    render(
      <TaxonomyWizard
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        initialData={{
          title: "Existing",
          classifiers: [
            { id: "disc", label: "Disciplines", layout: "x", values: [{ id: "psych", label: "Psychology", color: "#4A90D9" }] },
          ],
        }}
      />
    );
    // Step 1 is title
    expect(screen.getByText("Edit Taxonomy")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Existing")).toBeInTheDocument();
    // Navigate to final step
    await user.click(screen.getByText("Next")); // → node_types
    await user.click(screen.getByText("Next")); // → classifiers
    await user.click(screen.getByText("Next")); // → edges
    await user.click(screen.getByText("Next")); // → review
    await user.click(screen.getByText("Next")); // → create
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("edit mode with legacy streams/generations converts to classifiers", async () => {
    const user = userEvent.setup();
    render(
      <TaxonomyWizard
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        initialData={{
          title: "Legacy",
          streams: [{ id: "psych", name: "Psychology", color: "#4A90D9" }],
          generations: [{ number: 1, period: "1960-1980", label: "Founders" }],
        }}
      />
    );
    // Navigate to classifiers step
    await user.click(screen.getByText("Next")); // → node_types
    await user.click(screen.getByText("Next")); // → classifiers
    expect(screen.getByText("Define Classifiers")).toBeInTheDocument();
    // Should have converted streams to a classifier
    expect(screen.getByDisplayValue("Psychology")).toBeInTheDocument();
  });

  it("Save as Template button calls onSaveTemplate", async () => {
    const user = userEvent.setup();
    const onSaveTemplate = vi.fn();
    render(<TaxonomyWizard {...defaultProps} onSaveTemplate={onSaveTemplate} />);
    await navigateToStep(user, "review");
    await user.click(screen.getByText("Save as Template"));
    expect(onSaveTemplate).toHaveBeenCalledWith(expect.objectContaining({
      title: "Test Map",
      classifiers: expect.any(Array),
    }));
  });

  it("can add a field to a node type", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");
    await user.click(screen.getByText("+ Field"));
    const fieldInputs = screen.getAllByPlaceholderText("Field label");
    expect(fieldInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("shape dropdown offers all 6 shape options", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");
    const shapeSelect = screen.getByDisplayValue("Circle");
    expect(shapeSelect).toBeInTheDocument();
    const options = shapeSelect.querySelectorAll("option");
    const values = [...options].map((o) => o.getAttribute("value"));
    expect(values).toContain("circle");
    expect(values).toContain("rectangle");
    expect(values).toContain("diamond");
    expect(values).toContain("hexagon");
    expect(values).toContain("triangle");
    expect(values).toContain("pill");
  });

  it("field type dropdown includes Date option", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");
    await user.click(screen.getByText("+ Field"));
    const typeSelect = screen.getByDisplayValue("Text");
    const options = typeSelect.querySelectorAll("option");
    const values = [...options].map((o) => o.getAttribute("value"));
    expect(values).toContain("text");
    expect(values).toContain("select");
    expect(values).toContain("time");
    expect(values).not.toContain("textarea");
  });

  // --- REQ-097: Classifier validation tolerates empty value rows ---

  it("classifier step allows Next when at least one value has a non-empty label", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "classifiers");

    const classifierNameInput = screen.getByPlaceholderText("Classifier name");
    await user.clear(classifierNameInput);
    await user.type(classifierNameInput, "Domain");

    // Type a label in the first value row
    const valueLabelInput = screen.getByPlaceholderText("Value label");
    await user.type(valueLabelInput, "Science");

    // Add an empty value row (should not block)
    await user.click(screen.getByText("+ Add Value"));

    const nextBtn = screen.getByText("Next");
    expect(nextBtn.className).not.toContain("disabled");
  });

  it("classifier step blocks Next when all value rows are empty", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "classifiers");

    const classifierNameInput = screen.getByPlaceholderText("Classifier name");
    await user.clear(classifierNameInput);
    await user.type(classifierNameInput, "Domain");

    // Default value row exists but is empty — should block
    const nextBtn = screen.getByText("Next");
    expect(nextBtn.className).toContain("disabled");
  });

  it("empty value rows are filtered out of the final result", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<TaxonomyWizard {...defaultProps} onComplete={onComplete} />);

    // Title
    await user.type(screen.getByPlaceholderText(/Management Theory/), "Filter Test");
    await user.click(screen.getByText("Next")); // → node_types
    await user.click(screen.getByText("Next")); // → classifiers

    const classifierNameInput = screen.getByPlaceholderText("Classifier name");
    await user.clear(classifierNameInput);
    await user.type(classifierNameInput, "Domain");

    const valueLabelInput = screen.getByPlaceholderText("Value label");
    await user.type(valueLabelInput, "Science");

    // Add an empty value row
    await user.click(screen.getByText("+ Add Value"));

    await user.click(screen.getByText("Next")); // → edges
    await user.click(screen.getByText("Next")); // → review
    await user.click(screen.getByText("Next")); // → create
    await user.click(screen.getByText("Create"));

    const result = onComplete.mock.calls[0][0];
    const classifier = result.classifiers[0];
    // Only "Science" should be present, empty row filtered
    expect(classifier.values).toHaveLength(1);
    expect(classifier.values[0].label).toBe("Science");
  });

  // --- REQ-098: Select field options comma input ---

  it("select options input accepts commas without snapping back", async () => {
    const user = userEvent.setup();
    render(<TaxonomyWizard {...defaultProps} />);
    await navigateToStep(user, "node_types");

    // Add a field and set its type to select
    await user.click(screen.getByText("+ Field"));
    const typeSelect = screen.getByDisplayValue("Text");
    await user.selectOptions(typeSelect, "select");

    // Type comma-separated options
    const optionsInput = screen.getByPlaceholderText("option1, option2, ...");
    await user.type(optionsInput, "Red, Green, Blue");

    // The text should remain as typed (not stripped of commas)
    expect(optionsInput).toHaveValue("Red, Green, Blue");
  });

  it("select options are parsed on blur", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<TaxonomyWizard {...defaultProps} onComplete={onComplete} />);

    // Title
    await user.type(screen.getByPlaceholderText(/Management Theory/), "Options Test");
    await user.click(screen.getByText("Next")); // → node_types

    // Add a select field
    await user.click(screen.getByText("+ Field"));
    const typeSelect = screen.getByDisplayValue("Text");
    await user.selectOptions(typeSelect, "select");

    const optionsInput = screen.getByPlaceholderText("option1, option2, ...");
    await user.type(optionsInput, "A, B, , C");
    // Blur to commit
    await user.tab();

    await user.click(screen.getByText("Next")); // → classifiers
    // Fill classifier
    const classifierNameInput = screen.getByPlaceholderText("Classifier name");
    await user.clear(classifierNameInput);
    await user.type(classifierNameInput, "Cat");
    const valueLabelInput = screen.getByPlaceholderText("Value label");
    await user.type(valueLabelInput, "Val");
    await user.click(screen.getByText("Next")); // → edges
    await user.click(screen.getByText("Next")); // → review
    await user.click(screen.getByText("Next")); // → create
    await user.click(screen.getByText("Create"));

    const result = onComplete.mock.calls[0][0];
    const field = result.node_types[0].fields?.find((f: { type: string }) => f.type === "select");
    expect(field).toBeDefined();
    // Empty strings from trailing commas should be filtered
    expect(field.options).toEqual(["A", "B", "C"]);
  });

  it("edit mode shows existing node types", async () => {
    const user = userEvent.setup();
    render(
      <TaxonomyWizard
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        initialData={{
          title: "Existing",
          classifiers: [{ id: "s1", label: "Stream", layout: "x", values: [{ id: "s1", label: "S1" }] }],
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
    // Navigate to node types step
    await user.click(screen.getByText("Next")); // → node_types
    expect(screen.getByText("Person")).toBeInTheDocument();
    expect(screen.getByText("Organisation")).toBeInTheDocument();
  });
});
