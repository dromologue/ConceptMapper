import { describe, it, expect } from "vitest";
import type { Classifier } from "../types/graph-ir";
import { serializeViewComment, parseViewComment } from "../utils/viewOptions";

const cls = (id: string, layout?: Classifier["layout"]): Classifier => ({
  id,
  label: id,
  layout,
  values: [],
});

describe("serializeViewComment", () => {
  it("returns empty for the default view (force preset, no classifier layouts)", () => {
    expect(serializeViewComment({ layoutPreset: "force", classifiers: [cls("domain")] })).toBe("");
    expect(serializeViewComment({})).toBe("");
  });

  it("includes a non-default layout preset", () => {
    expect(serializeViewComment({ layoutPreset: "radial" })).toBe('<!-- view: {"layout":"radial"} -->');
  });

  it("includes per-attribute classifier layouts", () => {
    const out = serializeViewComment({ classifiers: [cls("domain", "region"), cls("decade", "y"), cls("status")] });
    expect(out).toBe('<!-- view: {"classifierLayouts":{"domain":"region","decade":"y"}} -->');
  });

  it("includes both when set", () => {
    const out = serializeViewComment({ layoutPreset: "flow", classifiers: [cls("domain", "region")] });
    expect(out).toBe('<!-- view: {"layout":"flow","classifierLayouts":{"domain":"region"}} -->');
  });
});

describe("parseViewComment", () => {
  it("returns null when no view comment is present", () => {
    expect(parseViewComment("# Map\n<!-- template: foo.cmt -->\n")).toBeNull();
  });

  it("round-trips a nested view object (greedy match past inner braces)", () => {
    const comment = serializeViewComment({ layoutPreset: "radial", classifiers: [cls("domain", "region"), cls("decade", "x")] });
    const doc = `# Map\n${comment}\n## Nodes\n`;
    expect(parseViewComment(doc)).toEqual({
      layout: "radial",
      classifierLayouts: { domain: "region", decade: "x" },
    });
  });

  it("ignores an invalid layout value but keeps classifier layouts", () => {
    const doc = `<!-- view: {"layout":"bogus","classifierLayouts":{"domain":"region"}} -->`;
    expect(parseViewComment(doc)).toEqual({ classifierLayouts: { domain: "region" } });
  });

  it("returns null on malformed JSON", () => {
    expect(parseViewComment("<!-- view: {not json} -->")).toBeNull();
  });
});
