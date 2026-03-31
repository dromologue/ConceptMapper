/** Inline SVG icon components (16×16) for the activity bar and UI chrome. */

interface IconProps {
  size?: number;
  className?: string;
}

const defaults = { size: 16, className: "" };

export function IconNetwork({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="4" cy="4" r="2" fill="currentColor" />
      <circle cx="12" cy="4" r="2" fill="currentColor" />
      <circle cx="8" cy="12" r="2" fill="currentColor" />
      <line x1="4" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1.2" />
      <line x1="4" y1="4" x2="8" y2="12" stroke="currentColor" strokeWidth="1.2" />
      <line x1="12" y1="4" x2="8" y2="12" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function IconPeople({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="6" cy="5" r="2.5" fill="currentColor" />
      <path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" fill="currentColor" />
      <circle cx="11" cy="4" r="1.8" fill="currentColor" opacity="0.6" />
      <path d="M9 13c0-1.5.8-2.8 2-3.5.5-.3 1-.5 1.5-.5 1.7 0 3 1.3 3 3" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export function IconConcepts({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="5.5" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

export function IconEdge({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="3" cy="13" r="2" fill="currentColor" />
      <circle cx="13" cy="3" r="2" fill="currentColor" />
      <line x1="4.5" y1="11.5" x2="11.5" y2="4.5" stroke="currentColor" strokeWidth="1.5" />
      <polyline points="9,3 13,3 13,7" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function IconSidebar({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="2" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function IconSettings({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function IconSearch({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.3" />
      <line x1="9.5" y1="9.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function IconPlus({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconTaxonomy({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="1" y="1" width="6" height="3" rx="0.5" fill="currentColor" />
      <rect x="1" y="6.5" width="6" height="3" rx="0.5" fill="currentColor" opacity="0.7" />
      <rect x="1" y="12" width="6" height="3" rx="0.5" fill="currentColor" opacity="0.4" />
      <line x1="9" y1="2.5" x2="15" y2="2.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.2" />
      <line x1="9" y1="13.5" x2="15" y2="13.5" stroke="currentColor" strokeWidth="1.2" />
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
      <rect x="1" y="1" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <polyline points="1,5 1,1 5,1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <polyline points="11,1 15,1 15,5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <polyline points="15,11 15,15 11,15" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <polyline points="5,15 1,15 1,11" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

export function IconHelp({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 6.5a2 2 0 113.5 1.5c-.5.4-1 .8-1 1.5V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="8.5" cy="12" r="0.7" fill="currentColor" />
    </svg>
  );
}

export function IconAnalysis({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="11" r="2" stroke="currentColor" strokeWidth="1.2" />
      <line x1="6.5" y1="5.5" x2="7" y2="9.5" stroke="currentColor" strokeWidth="1" />
      <line x1="9.5" y1="5.5" x2="9" y2="9.5" stroke="currentColor" strokeWidth="1" />
      <line x1="7" y1="4" x2="9" y2="4" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function IconExport({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconExplode({ size = defaults.size, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 8L3 3M8 8l5-5M8 8l-5 5M8 8l5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="3" cy="3" r="1.2" fill="currentColor" />
      <circle cx="13" cy="3" r="1.2" fill="currentColor" />
      <circle cx="3" cy="13" r="1.2" fill="currentColor" />
      <circle cx="13" cy="13" r="1.2" fill="currentColor" />
    </svg>
  );
}
