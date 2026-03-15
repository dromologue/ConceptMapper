import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LLMProvider } from "../llm/LLMContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { ChatPane } from "../ui/ChatPane";
import { sampleGraphData, sampleStreams, sampleGenerations } from "./fixtures";
import { defaultNodeTypeConfigs } from "./fixtures";
import type { TaxonomyTemplate } from "../types/graph-ir";

const sampleTemplate: TaxonomyTemplate = {
  title: "Test",
  streams: sampleStreams,
  generations: sampleGenerations,
  node_types: defaultNodeTypeConfigs,
};

function renderChat() {
  return render(
    <ThemeProvider>
      <LLMProvider>
        <ChatPane
          graphData={sampleGraphData}
          template={sampleTemplate}
          isNativeApp={false}
          sendToSwift={() => {}}
        />
      </LLMProvider>
    </ThemeProvider>,
  );
}

describe("ChatPane", () => {
  it("renders empty state message", () => {
    renderChat();
    expect(screen.getByText(/Ask questions about your concept map/)).toBeTruthy();
  });

  it("renders input field", () => {
    renderChat();
    expect(screen.getByPlaceholderText(/Ask about your concept map/)).toBeTruthy();
  });

  it("renders send button", () => {
    renderChat();
    expect(screen.getByText("Send")).toBeTruthy();
  });

  it("send button is disabled when input is empty", () => {
    renderChat();
    const btn = screen.getByText("Send") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
