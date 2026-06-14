/** Inline SVG icon components (16×16) for the activity bar and UI chrome.
 *
 * Design language: every icon is a small concept map — coloured filled nodes
 * connected by thin currentColor lines. The fills use saturated colours that
 * read on both dark (#111) and light (#fff) backgrounds. currentColor elements
 * (strokes, outlines) adapt to the parent's text colour automatically.
 */

interface IconProps {
  size?: number;
  className?: string;
}

const defaults = { size: 16, className: "" };

// Accent node colours — saturated enough to read on dark or light surfaces.
const C1 = "#4A90D9"; // blue
const C2 = "#F07840"; // orange
const C3 = "#5CC4A0"; // teal
const C4 = "#B87AE8"; // purple

export function IconOutline({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="3" cy="3.5" r="1.5" fill={C1} />
      <line x1="6" y1="3.5" x2="14" y2="3.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5" cy="8" r="1.3" fill={C2} />
      <line x1="7.5" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5" cy="12.5" r="1.3" fill={C3} />
      <line x1="7.5" y1="12.5" x2="14" y2="12.5" stroke="currentColor" strokeWidth="1.2" />
      {/* indent guide */}
      <line x1="3" y1="5" x2="3" y2="11" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

export function IconNetwork({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <line x1="4" y1="5" x2="12" y2="5" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="4" y1="5" x2="8" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="12" y1="5" x2="8" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <circle cx="4" cy="5" r="2.2" fill={C1} />
      <circle cx="12" cy="5" r="2.2" fill={C2} />
      <circle cx="8" cy="12" r="2.2" fill={C3} />
    </svg>
  );
}

export function IconSidebar({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="1.2" />
      {/* accent line in the sidebar column */}
      <line x1="3" y1="5.5" x2="4.5" y2="5.5" stroke={C1} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="8" x2="4.5" y2="8" stroke={C1} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="10.5" x2="4.5" y2="10.5" stroke={C1} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconSettings({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4"
        stroke="currentColor" strokeWidth="1.2"
      />
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="1.4" fill={C1} />
    </svg>
  );
}

export function IconSearch({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="6.5" cy="6.5" r="1.5" fill={C1} />
      <line x1="9.5" y1="9.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconTaxonomy({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="1.5" width="5.5" height="3" rx="1" fill={C1} />
      <rect x="1" y="6.5" width="5.5" height="3" rx="1" fill={C2} />
      <rect x="1" y="11.5" width="5.5" height="3" rx="1" fill={C3} />
      <line x1="8.5" y1="3" x2="15" y2="3" stroke="currentColor" strokeWidth="1.1" />
      <line x1="8.5" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.1" />
      <line x1="8.5" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function IconChevronDown({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <polyline points="4,6 8,10 12,6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function IconFitView({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      {/* corner brackets */}
      <polyline points="1,5 1,1 5,1" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <polyline points="11,1 15,1 15,5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <polyline points="15,11 15,15 11,15" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <polyline points="5,15 1,15 1,11" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* mini network at centre */}
      <line x1="6.5" y1="7" x2="9.5" y2="7" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
      <line x1="6.5" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
      <line x1="9.5" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="0.9" opacity="0.5" />
      <circle cx="6.5" cy="7" r="1.3" fill={C1} />
      <circle cx="9.5" cy="7" r="1.3" fill={C2} />
      <circle cx="8" cy="10" r="1.3" fill={C3} />
    </svg>
  );
}

export function IconHelp({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M6 6.5a2 2 0 113.5 1.5c-.5.4-1 .8-1 1.5V10"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
      />
      <circle cx="8.5" cy="12" r="0.85" fill={C1} />
    </svg>
  );
}

export function IconAnalysis({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      {/* connections */}
      <line x1="5" y1="4.5" x2="11" y2="4.5" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="5.5" y1="5.7" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="10.5" y1="5.7" x2="8.5" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      {/* hub node (largest = highest centrality) */}
      <circle cx="8" cy="11" r="2.5" fill={C1} />
      {/* smaller nodes */}
      <circle cx="5" cy="4.5" r="1.7" fill={C2} />
      <circle cx="11" cy="4.5" r="1.7" fill={C3} />
    </svg>
  );
}

export function IconExport({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="3" width="12" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      {/* small coloured "image" within the canvas */}
      <circle cx="5.5" cy="7" r="1.3" fill={C3} />
      <line x1="7.5" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="0.9" opacity="0.4" />
      <line x1="7.5" y1="7.5" x2="11" y2="7.5" stroke="currentColor" strokeWidth="0.9" opacity="0.4" />
      {/* export arrow */}
      <line x1="8" y1="10" x2="8" y2="15.5" stroke={C1} strokeWidth="1.4" strokeLinecap="round" />
      <polyline points="5.5,13 8,15.5 10.5,13" stroke={C1} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function IconExplode({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      {/* radiating spokes */}
      <line x1="8" y1="8" x2="3" y2="3" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="8" y1="8" x2="13" y2="3" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="8" y1="8" x2="3" y2="13" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="8" y1="8" x2="13" y2="13" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      {/* outer nodes */}
      <circle cx="3" cy="3" r="1.7" fill={C1} />
      <circle cx="13" cy="3" r="1.7" fill={C2} />
      <circle cx="3" cy="13" r="1.7" fill={C3} />
      <circle cx="13" cy="13" r="1.7" fill={C4} />
      {/* centre hub */}
      <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function IconNotes({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      {/* document */}
      <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.2" />
      {/* coloured left accent bar */}
      <rect x="2" y="6" width="2.5" height="7" rx="0" fill={C1} opacity="0.6" />
      {/* text lines */}
      <line x1="6" y1="7.5" x2="11.5" y2="7.5" stroke="currentColor" strokeWidth="0.9" />
      <line x1="6" y1="10" x2="11.5" y2="10" stroke="currentColor" strokeWidth="0.9" />
      <line x1="6" y1="12.5" x2="9.5" y2="12.5" stroke="currentColor" strokeWidth="0.9" />
    </svg>
  );
}

export function IconProperties({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1.5" y="2" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      {/* rows: coloured key dot + value line */}
      <circle cx="4.5" cy="5.5" r="1.2" fill={C1} />
      <line x1="6.5" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1" />
      <circle cx="4.5" cy="8" r="1.2" fill={C2} />
      <line x1="6.5" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1" />
      <circle cx="4.5" cy="10.5" r="1.2" fill={C3} />
      <line x1="6.5" y1="10.5" x2="11" y2="10.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function IconBrain({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      {/* connections forming a neural cluster */}
      <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      <line x1="5" y1="5" x2="7" y2="10" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      <line x1="11" y1="5" x2="9" y2="10" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      <line x1="7" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      <line x1="5" y1="5" x2="3" y2="9" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      <line x1="11" y1="5" x2="13" y2="9" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      <line x1="3" y1="9" x2="7" y2="10" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      <line x1="13" y1="9" x2="9" y2="10" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      {/* nodes */}
      <circle cx="5" cy="5" r="1.8" fill={C1} />
      <circle cx="11" cy="5" r="1.8" fill={C2} />
      <circle cx="7" cy="10" r="1.8" fill={C3} />
      <circle cx="9" cy="10" r="1.8" fill={C4} />
      <circle cx="3" cy="9" r="1.4" fill={C1} opacity="0.7" />
      <circle cx="13" cy="9" r="1.4" fill={C2} opacity="0.7" />
    </svg>
  );
}

export function IconLayout({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      {/* hierarchical layout: 1 root → 2 children */}
      <line x1="8" y1="4.5" x2="4.5" y2="11" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="8" y1="4.5" x2="11.5" y2="11" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <circle cx="8" cy="4" r="2.2" fill={C1} />
      <circle cx="4.5" cy="11.5" r="1.8" fill={C2} />
      <circle cx="11.5" cy="11.5" r="1.8" fill={C3} />
    </svg>
  );
}

export function IconAdvanced({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      {/* three sliders — track in currentColor, thumb dot in accent colour */}
      <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5" cy="4" r="2" fill={C1} />
      <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10" cy="8" r="2" fill={C2} />
      <line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6.5" cy="12" r="2" fill={C3} />
    </svg>
  );
}
