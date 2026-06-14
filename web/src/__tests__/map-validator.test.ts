// SPEC: REQ-085 (Template-Owned Structure)
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { findStructuralSections, formatStructuralSectionWarning } from "../utils/map-validator";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");

function listCmFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f: string) => f.endsWith(".cm"))
    .map((f: string) => join(dir, f));
}

describe("findStructuralSections", () => {
  it("flags a ## Generations section (AC-085-03)", () => {
    const content = "# Map\n\n## Generations\n\n| g |\n| - |";
    const warnings = findStructuralSections(content);
    expect(warnings).toEqual([{ section: "Generations", line: 3 }]);
  });

  it("flags a ## Streams section (AC-085-03)", () => {
    const content = "# Map\n## Streams\n\n## Thinker Nodes\n";
    const warnings = findStructuralSections(content);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ section: "Streams", line: 2 });
  });

  it("flags both structural sections when both appear", () => {
    const content = "# Map\n\n## Generations\n...\n## Streams\n...\n## Thinker Nodes\n";
    const warnings = findStructuralSections(content);
    expect(warnings.map((w) => w.section)).toEqual(["Generations", "Streams"]);
  });

  it("does not flag content sections (Nodes, Edges, Notes)", () => {
    const content = "# Map\n\n## Thinker Nodes\n\n## Edges\n\n## Notes\n";
    expect(findStructuralSections(content)).toEqual([]);
  });

  it("flags legacy ## External Shocks (now ordinary notes)", () => {
    const content = "# Map\n\n## External Shocks\n";
    expect(findStructuralSections(content).map((w) => w.section)).toEqual(["External Shocks"]);
  });

  it("flags legacy ## Structural Observations (replaced by ## Notes)", () => {
    const content = "# Map\n\n## Structural Observations\n";
    expect(findStructuralSections(content).map((w) => w.section)).toEqual(["Structural Observations"]);
  });

  it("does not flag h3 or h1 headers with structural names", () => {
    const content = "# Streams\n### Generations\n## thinker nodes\n";
    expect(findStructuralSections(content)).toEqual([]);
  });

  it("formats warnings into human-readable strings", () => {
    const w = { section: "Generations", line: 6 };
    expect(formatStructuralSectionWarning(w)).toMatch(/Line 6/);
    expect(formatStructuralSectionWarning(w)).toMatch(/## Generations/);
    expect(formatStructuralSectionWarning(w)).toMatch(/template/);
  });
});

describe("repository-wide .cm compliance with REQ-085", () => {
  const mapDirs = [join(REPO_ROOT, "Maps"), join(REPO_ROOT, "macos/Resources/maps")];

  for (const dir of mapDirs) {
    for (const path of listCmFiles(dir)) {
      const name = path.replace(`${REPO_ROOT}/`, "");

      it(`${name} references a .cmt template (AC-085-01)`, () => {
        const content = readFileSync(path, "utf-8");
        expect(content).toMatch(/<!--\s*template:\s*\S+?(\.cmt)?\s*-->/i);
      });

      it(`${name} has no structural sections (AC-085-02)`, () => {
        const content = readFileSync(path, "utf-8");
        expect(findStructuralSections(content)).toEqual([]);
      });
    }
  }
});
