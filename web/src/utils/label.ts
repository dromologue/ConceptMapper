// Max characters drawn inline on the canvas. Longer node names are truncated
// with an ellipsis; the full label appears in the hover tooltip.
export const LABEL_TRUNCATE_LENGTH = 20;

export function truncateLabel(text: string, max = LABEL_TRUNCATE_LENGTH): string {
  if (!text || text.length <= max) return text;
  // Unicode ellipsis is one character, so the visible string is exactly `max` chars.
  return text.slice(0, max - 1).trimEnd() + "…";
}
