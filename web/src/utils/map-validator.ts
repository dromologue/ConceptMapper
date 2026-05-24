/**
 * Validates the raw text of a .cm file for structural-content rule violations.
 *
 * RULE (SPEC: REQ-072 — Template-Owned Structure):
 *   .cm files contain CONTENT only (nodes, edges, observations). All STRUCTURE
 *   (classifiers, node types, edge types, streams, generations) lives in the
 *   .cmt template referenced via `<!-- template: foo.cmt -->`. Legacy `## Generations`
 *   and `## Streams` table sections in .cm files are structural and must be moved
 *   to the template's `classifiers` array.
 */

/** Section headers that define structure (or carry hardcoded domain types) and
 *  must not appear in .cm content. They were privileged categories in earlier
 *  versions; they are now ordinary classifier values or generic notes. */
const STRUCTURAL_SECTIONS = [
  "Generations",
  "Streams",
  "External Shocks",
  "Structural Observations",
] as const;

export interface StructuralSectionWarning {
  section: string;
  line: number;
}

/** Returns one warning per disallowed structural section header found in `content`. */
export function findStructuralSections(content: string): StructuralSectionWarning[] {
  const warnings: StructuralSectionWarning[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!match) continue;
    const heading = match[1].trim();
    if ((STRUCTURAL_SECTIONS as readonly string[]).includes(heading)) {
      warnings.push({ section: heading, line: i + 1 });
    }
  }
  return warnings;
}

/** Human-readable warning string for a structural-section violation. */
export function formatStructuralSectionWarning(w: StructuralSectionWarning): string {
  return `Line ${w.line}: "## ${w.section}" defines structure — move to the .cmt template's classifiers and remove from the .cm file.`;
}
