import { describe, it, expect } from "vitest";
import { truncateLabel, LABEL_TRUNCATE_LENGTH } from "../utils/label";

describe("truncateLabel", () => {
  it("passes short strings through unchanged", () => {
    expect(truncateLabel("short")).toBe("short");
    expect(truncateLabel("exactly20chars!!!!!!")).toBe("exactly20chars!!!!!!"); // 20 chars
    expect(truncateLabel("exactly20chars!!!!!!").length).toBe(LABEL_TRUNCATE_LENGTH);
  });

  it("truncates strings over the limit and appends an ellipsis", () => {
    const long = "This is a very long node name that needs truncating";
    const out = truncateLabel(long);
    expect(out.length).toBe(LABEL_TRUNCATE_LENGTH);
    expect(out.endsWith("…")).toBe(true);
  });

  it("trims trailing whitespace before the ellipsis", () => {
    // Truncate at 5; slice(0, 4) of "abc      def" is "abc " → trimEnd → "abc" + "…".
    expect(truncateLabel("abc      def", 5)).toBe("abc…");
  });

  it("handles empty strings", () => {
    expect(truncateLabel("")).toBe("");
  });

  it("honours an explicit max override", () => {
    expect(truncateLabel("abcdefghij", 5)).toBe("abcd…");
  });
});
