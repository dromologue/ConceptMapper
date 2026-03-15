import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LLMProvider } from "../llm/LLMContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { MappingModal } from "../ui/MappingModal";
import { sampleStreams, sampleGenerations, defaultNodeTypeConfigs } from "./fixtures";
import type { TaxonomyTemplate } from "../types/graph-ir";

const sampleTemplate: TaxonomyTemplate = {
  title: "Test Taxonomy",
  streams: sampleStreams,
  generations: sampleGenerations,
  node_types: defaultNodeTypeConfigs,
};

function renderWithTemplate() {
  return render(
    <ThemeProvider>
      <LLMProvider>
        <MappingModal
          template={sampleTemplate}
          savedTemplates={[sampleTemplate]}
          onResult={() => {}}
          onCancel={() => {}}
          isNativeApp={false}
          sendToSwift={() => {}}
        />
      </LLMProvider>
    </ThemeProvider>,
  );
}

function renderWithoutTemplate() {
  return render(
    <ThemeProvider>
      <LLMProvider>
        <MappingModal
          template={null}
          savedTemplates={[sampleTemplate]}
          onResult={() => {}}
          onCancel={() => {}}
          isNativeApp={false}
          sendToSwift={() => {}}
        />
      </LLMProvider>
    </ThemeProvider>,
  );
}

describe("MappingModal", () => {
  it("renders title", () => {
    renderWithTemplate();
    expect(screen.getByText("Map Text to Taxonomy")).toBeTruthy();
  });

  it("shows target taxonomy when template is provided", () => {
    renderWithTemplate();
    expect(screen.getByText(/Test Taxonomy/)).toBeTruthy();
  });

  it("renders textarea when template is selected", () => {
    renderWithTemplate();
    expect(screen.getByPlaceholderText(/Paste or type/)).toBeTruthy();
  });

  it("renders upload file button", () => {
    renderWithTemplate();
    expect(screen.getByText("Upload File")).toBeTruthy();
  });

  it("map button is disabled when textarea is empty", () => {
    renderWithTemplate();
    const btn = screen.getByText("Map to Taxonomy") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("shows template picker when no template provided", () => {
    renderWithoutTemplate();
    expect(screen.getByText(/Choose a taxonomy/)).toBeTruthy();
  });

  it("shows saved templates in picker", () => {
    renderWithoutTemplate();
    expect(screen.getByText("Test Taxonomy")).toBeTruthy();
  });

  it("selects template when clicked in picker", async () => {
    const user = userEvent.setup();
    renderWithoutTemplate();
    await user.click(screen.getByText("Test Taxonomy"));
    // After clicking, should show the textarea
    expect(screen.getByPlaceholderText(/Paste or type/)).toBeTruthy();
  });
});
