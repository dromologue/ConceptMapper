import { describe, it, expect } from "vitest";
import { buildMappingSystemPrompt, buildMappingUserPrompt, buildChatSystemPrompt } from "../llm/prompts";
import { sampleStreams, sampleGenerations, sampleGraphData } from "./fixtures";
import { defaultNodeTypeConfigs } from "./fixtures";
import { dataFromGraphIR } from "../migration";
import type { TaxonomyTemplate } from "../types/graph-ir";

const sampleTaxonomy: TaxonomyTemplate = {
  title: "Test Taxonomy",
  streams: sampleStreams,
  generations: sampleGenerations,
  node_types: defaultNodeTypeConfigs,
};

describe("buildMappingSystemPrompt", () => {
  it("includes node type definitions", () => {
    const prompt = buildMappingSystemPrompt(sampleTaxonomy);
    expect(prompt).toContain("node");
    expect(prompt).toContain("Node");
  });

  it("includes streams", () => {
    const prompt = buildMappingSystemPrompt(sampleTaxonomy);
    expect(prompt).toContain("psychology");
    expect(prompt).toContain("Psychology & Cognition");
  });

  it("includes horizons", () => {
    const prompt = buildMappingSystemPrompt(sampleTaxonomy);
    expect(prompt).toContain("horizon 2");
    expect(prompt).toContain("Systematisers");
  });

  it("instructs JSON output", () => {
    const prompt = buildMappingSystemPrompt(sampleTaxonomy);
    expect(prompt).toContain('"version": "2.0"');
    expect(prompt).toContain('"nodes"');
    expect(prompt).toContain('"edges"');
  });
});

describe("buildMappingUserPrompt", () => {
  it("wraps source text", () => {
    const prompt = buildMappingUserPrompt("Test text about concepts");
    expect(prompt).toContain("Test text about concepts");
    expect(prompt).toContain("concept map JSON");
  });
});

describe("buildChatSystemPrompt", () => {
  it("includes node and edge counts", () => {
    const cmData = dataFromGraphIR(sampleGraphData, "");
    const prompt = buildChatSystemPrompt(cmData, sampleTaxonomy);
    expect(prompt).toContain("5 nodes");
    expect(prompt).toContain("3 edges");
  });

  it("lists node names", () => {
    const cmData = dataFromGraphIR(sampleGraphData, "");
    const prompt = buildChatSystemPrompt(cmData, sampleTaxonomy);
    expect(prompt).toContain("Chris Argyris");
    expect(prompt).toContain("Peter Senge");
  });

  it("includes taxonomy title", () => {
    const cmData = dataFromGraphIR(sampleGraphData, "");
    const prompt = buildChatSystemPrompt(cmData, sampleTaxonomy);
    expect(prompt).toContain("Test Taxonomy");
  });
});
