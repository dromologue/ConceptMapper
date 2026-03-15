import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LLMProvider, useLLM } from "../llm/LLMContext";

function TestConsumer() {
  const { config, isLLMConfigured } = useLLM();
  return (
    <div>
      <span data-testid="configured">{String(isLLMConfigured)}</span>
      <span data-testid="config">{JSON.stringify(config)}</span>
    </div>
  );
}

describe("LLMContext", () => {
  it("renders provider without crashing", () => {
    render(
      <LLMProvider>
        <TestConsumer />
      </LLMProvider>,
    );
    expect(screen.getByTestId("configured")).toBeTruthy();
  });

  it("initially reports LLM not configured", () => {
    render(
      <LLMProvider>
        <TestConsumer />
      </LLMProvider>,
    );
    expect(screen.getByTestId("configured").textContent).toBe("false");
  });

  it("throws when used outside provider", () => {
    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useLLM must be used within LLMProvider");
  });
});
