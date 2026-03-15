import React, { useState, useMemo, useCallback, useEffect } from "react";
import { HELP_SECTIONS } from "../help/content";
import type { HelpSection } from "../help/content";

interface Props {
  onClose: () => void;
}

function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(
    new RegExp(`(${escaped})`, "gi"),
    '<mark class="help-highlight">$1</mark>'
  );
}

function renderContent(content: string, query: string): React.JSX.Element[] {
  return content.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="help-line help-blank" />;

    const html = query.trim()
      ? highlightMatch(escapeHtml(trimmed), query)
      : escapeHtml(trimmed);

    // Bold lines starting with **...**
    if (trimmed.startsWith("**Q:")) {
      return (
        <div
          key={i}
          className="help-line help-faq-q"
          dangerouslySetInnerHTML={{ __html: styleLine(html) }}
        />
      );
    }
    if (trimmed.startsWith("A:")) {
      return (
        <div
          key={i}
          className="help-line help-faq-a"
          dangerouslySetInnerHTML={{ __html: styleLine(html) }}
        />
      );
    }
    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      return (
        <div
          key={i}
          className="help-line help-subheading"
          dangerouslySetInnerHTML={{ __html: styleLine(html) }}
        />
      );
    }
    if (/^\d+\.\s/.test(trimmed)) {
      return (
        <div
          key={i}
          className="help-line help-numbered"
          dangerouslySetInnerHTML={{ __html: styleLine(html) }}
        />
      );
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return (
        <div
          key={i}
          className="help-line help-bullet"
          dangerouslySetInnerHTML={{ __html: styleLine(html) }}
        />
      );
    }

    return (
      <div
        key={i}
        className="help-line"
        dangerouslySetInnerHTML={{ __html: styleLine(html) }}
      />
    );
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function styleLine(html: string): string {
  // Bold
  let result = html.replace(
    /\*\*(.+?)\*\*/g,
    "<strong>$1</strong>"
  );
  // Italic
  result = result.replace(
    /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
    "<em>$1</em>"
  );
  // Inline code
  result = result.replace(
    /`(.+?)`/g,
    '<code class="help-code">$1</code>'
  );
  // -- to em dash
  result = result.replace(/ -- /g, " \u2014 ");
  return result;
}

function AccordionSection({
  section,
  isOpen,
  onToggle,
  query,
}: {
  section: HelpSection;
  isOpen: boolean;
  onToggle: () => void;
  query: string;
}) {
  return (
    <div className={`help-section ${isOpen ? "open" : ""}`}>
      <button className="help-section-header" onClick={onToggle}>
        <span className="help-section-title">{section.title}</span>
        <span className="help-section-chevron">{isOpen ? "\u25B2" : "\u25BC"}</span>
      </button>
      {isOpen && (
        <div className="help-section-body">
          {renderContent(section.content, query)}
        </div>
      )}
    </div>
  );
}

export function HelpPanel({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(["getting-started"])
  );

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filteredSections = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return HELP_SECTIONS;
    return HELP_SECTIONS.filter((s) => {
      const inTitle = s.title.toLowerCase().includes(q);
      const inContent = s.content.toLowerCase().includes(q);
      const inTags = s.tags?.some((t) => t.includes(q));
      return inTitle || inContent || inTags;
    });
  }, [query]);

  // Auto-expand all sections when searching, collapse back when cleared
  const effectiveOpen = useMemo(() => {
    if (query.trim()) {
      return new Set(filteredSections.map((s) => s.id));
    }
    return openSections;
  }, [query, filteredSections, openSections]);

  const toggleSection = useCallback(
    (id: string) => {
      setOpenSections((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    []
  );

  const expandAll = useCallback(() => {
    setOpenSections(new Set(HELP_SECTIONS.map((s) => s.id)));
  }, []);

  const collapseAll = useCallback(() => {
    setOpenSections(new Set());
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal help-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="help-header">
          <h3>Help</h3>
          <div className="help-header-actions">
            <button
              className="help-expand-btn"
              onClick={expandAll}
              title="Expand all"
            >
              Expand
            </button>
            <button
              className="help-expand-btn"
              onClick={collapseAll}
              title="Collapse all"
            >
              Collapse
            </button>
            <button className="close-btn" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="help-search">
          <input
            className="help-search-input"
            type="text"
            placeholder="Search help topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              className="help-search-clear"
              onClick={() => setQuery("")}
            >
              &times;
            </button>
          )}
        </div>

        {/* Sections */}
        <div className="help-scroll">
          {filteredSections.length === 0 ? (
            <div className="help-no-results">
              No results for "{query}". Try a different search term.
            </div>
          ) : (
            filteredSections.map((section) => (
              <AccordionSection
                key={section.id}
                section={section}
                isOpen={effectiveOpen.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                query={query}
              />
            ))
          )}
        </div>
      </div>

      <style>{helpPanelStyles}</style>
    </div>
  );
}

const helpPanelStyles = `
  .help-modal {
    width: 640px;
    max-width: 90vw;
    height: 80vh;
    max-height: 700px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px;
    flex-shrink: 0;
  }

  .help-header h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #fff);
  }

  .help-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .help-expand-btn {
    background: none;
    border: 1px solid var(--bg-hover, #333);
    color: var(--text-muted, #999);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
  }

  .help-expand-btn:hover {
    color: var(--text-primary, #fff);
    border-color: var(--text-muted, #999);
  }

  .help-search {
    padding: 0 20px 12px;
    position: relative;
    flex-shrink: 0;
  }

  .help-search-input {
    width: 100%;
    padding: 8px 32px 8px 12px;
    background: var(--bg-hover, #2a2a4a);
    border: 1px solid var(--bg-hover, #333);
    border-radius: 4px;
    color: var(--text-primary, #fff);
    font-size: 13px;
    outline: none;
  }

  .help-search-input:focus {
    border-color: var(--accent, #4A90D9);
  }

  .help-search-input::placeholder {
    color: var(--text-dim, #666);
  }

  .help-search-clear {
    position: absolute;
    right: 28px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-muted, #999);
    font-size: 16px;
    cursor: pointer;
    padding: 2px 4px;
    line-height: 1;
  }

  .help-search-clear:hover {
    color: var(--text-primary, #fff);
  }

  .help-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0 20px 20px;
  }

  .help-no-results {
    padding: 24px 0;
    text-align: center;
    color: var(--text-muted, #999);
    font-size: 13px;
  }

  /* Accordion sections */
  .help-section {
    border-bottom: 1px solid var(--bg-hover, #2a2a4a);
  }

  .help-section:last-child {
    border-bottom: none;
  }

  .help-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 10px 4px;
    background: none;
    border: none;
    color: var(--text-primary, #fff);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }

  .help-section-header:hover {
    color: var(--accent, #4A90D9);
  }

  .help-section-chevron {
    font-size: 10px;
    color: var(--text-dim, #666);
    flex-shrink: 0;
  }

  .help-section-body {
    padding: 4px 4px 16px 8px;
  }

  /* Content lines */
  .help-line {
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-secondary, #ccc);
  }

  .help-blank {
    height: 8px;
  }

  .help-subheading {
    font-weight: 600;
    color: var(--text-primary, #fff);
    margin-top: 8px;
  }

  .help-bullet {
    padding-left: 16px;
    position: relative;
  }

  .help-bullet::before {
    content: "";
    position: absolute;
    left: 4px;
    top: 9px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--text-dim, #666);
  }

  .help-numbered {
    padding-left: 8px;
  }

  .help-faq-q {
    font-weight: 600;
    color: var(--text-primary, #fff);
    margin-top: 10px;
  }

  .help-faq-a {
    padding-left: 8px;
    margin-bottom: 4px;
  }

  .help-code {
    font-family: "SF Mono", "Fira Code", monospace;
    font-size: 11px;
    background: var(--bg-hover, #2a2a4a);
    padding: 1px 5px;
    border-radius: 3px;
    color: var(--accent, #4A90D9);
  }

  .help-highlight {
    background: rgba(74, 144, 217, 0.3);
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }
`;
