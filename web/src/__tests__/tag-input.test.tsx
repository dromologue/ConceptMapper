// SPEC: REQ-087 (Tag autocomplete from existing tags across the graph)
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "../ui/TagInput";
import { collectAllTags } from "../utils/tags";

describe("collectAllTags", () => {
  it("returns sorted, deduplicated tags across all nodes", () => {
    const nodes = [
      { tags: ["beta", "alpha"] },
      { tags: ["gamma", "alpha"] },
      { tags: undefined },
      {},
    ];
    expect(collectAllTags(nodes)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("returns an empty array when no node has tags", () => {
    expect(collectAllTags([{}, { tags: undefined }])).toEqual([]);
  });
});

describe("TagInput", () => {
  it("renders existing tags as removable pills", () => {
    const onChange = vi.fn();
    render(<TagInput value={["research", "design"]} existingTags={[]} onChange={onChange} />);
    expect(screen.getByText("research")).toBeInTheDocument();
    expect(screen.getByText("design")).toBeInTheDocument();
  });

  it("commits a typed tag on Enter and clears the input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["alpha"]} existingTags={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Add tag...");
    await user.type(input, "beta{Enter}");
    expect(onChange).toHaveBeenCalledWith(["alpha", "beta"]);
  });

  it("commits on comma as well as Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} existingTags={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Add tag...");
    await user.type(input, "gamma,");
    expect(onChange).toHaveBeenCalledWith(["gamma"]);
  });

  it("removes a tag when its × is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["alpha", "beta"]} existingTags={[]} onChange={onChange} />);
    const removeButtons = screen.getAllByText("×");
    await user.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith(["beta"]);
  });

  it("shows autocomplete suggestions from existingTags filtered by draft text", async () => {
    const user = userEvent.setup();
    render(<TagInput value={[]} existingTags={["research", "design", "review"]} onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("Add tag...");
    await user.type(input, "re");
    // 'research' and 'review' both contain 're'
    expect(screen.getByRole("option", { name: "research" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "review" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "design" })).not.toBeInTheDocument();
  });

  it("excludes already-applied tags from suggestions", async () => {
    const user = userEvent.setup();
    render(<TagInput value={["research"]} existingTags={["research", "design"]} onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("Add tag...");
    await user.click(input);
    expect(screen.queryByRole("option", { name: "research" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "design" })).toBeInTheDocument();
  });

  it("commits the highlighted suggestion on Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} existingTags={["alpha", "beta"]} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Add tag...");
    await user.click(input);  // opens suggestions, highlight = 0 → "alpha"
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(["alpha"]);
  });

  it("commits a clicked suggestion", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={[]} existingTags={["research", "design"]} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Add tag...");
    await user.click(input);
    await user.click(screen.getByRole("option", { name: "design" }));
    expect(onChange).toHaveBeenCalledWith(["design"]);
  });

  it("does not commit a duplicate tag", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TagInput value={["alpha"]} existingTags={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Add tag...");
    await user.type(input, "alpha{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });
});
