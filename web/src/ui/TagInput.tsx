// SPEC: REQ-087 — Tag autocomplete from existing tags across the graph.
// Tags are the only first-class string-list attribute on a node. Anything
// else with similar shape belongs in a classifier or generic property.
import { useState, useMemo, useRef, useEffect } from "react";

interface Props {
  value: string[];
  /** Pool of tags that already exist on other nodes — drives autocomplete suggestions. */
  existingTags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, existingTags, onChange, placeholder = "Add tag..." }: Props) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Suggestions: existing tags not already on this node, filtered by the draft
  const suggestions = useMemo(() => {
    const already = new Set(value);
    const draftLower = draft.trim().toLowerCase();
    return existingTags
      .filter((t) => !already.has(t))
      .filter((t) => !draftLower || t.toLowerCase().includes(draftLower))
      .slice(0, 8);
  }, [value, existingTags, draft]);

  // Close suggestions on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keep highlighted item within range as suggestions shrink — derived state
  // pattern (per React docs) avoids setState-in-effect.
  if (highlight >= suggestions.length && highlight !== 0) {
    setHighlight(0);
  }

  const commit = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft("");
    setHighlight(0);
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(suggestions.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (open && suggestions[highlight]) {
        commit(suggestions[highlight]);
      } else {
        commit(draft);
      }
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      remove(value.length - 1);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="tag-input-wrapper" ref={wrapperRef}>
      <div className="tag-pills">
        {value.map((tag, i) => (
          <span key={`${tag}-${i}`} className="tag-pill">
            {tag}
            <button type="button" className="tag-remove" onClick={() => remove(i)}>&times;</button>
          </span>
        ))}
        <input
          className="tag-input"
          type="text"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="tag-suggestions" role="listbox">
          {suggestions.map((sugg, i) => (
            <li
              key={sugg}
              role="option"
              aria-selected={i === highlight}
              className={`tag-suggestion ${i === highlight ? "tag-suggestion-active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); commit(sugg); }}
              onMouseEnter={() => setHighlight(i)}
            >
              {sugg}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// collectAllTags lives in ../utils/tags so this file stays component-only
// (react-refresh/only-export-components).
