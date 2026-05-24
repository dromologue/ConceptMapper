/** Collect all unique tags across a list of nodes (sorted, case-sensitive). */
export function collectAllTags(nodes: { tags?: string[] }[]): string[] {
  const set = new Set<string>();
  for (const n of nodes) {
    if (n.tags) for (const t of n.tags) set.add(t);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
