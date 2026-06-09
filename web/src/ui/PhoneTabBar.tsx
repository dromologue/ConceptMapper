import type { PhoneTab } from "../stores/useUIStore";
import { IconNetwork, IconSidebar, IconProperties, IconAnalysis, IconNotes } from "./Icons";

interface PhoneTabBarProps {
  active: PhoneTab;
  onChange: (tab: PhoneTab) => void;
}

const TABS: { id: PhoneTab; label: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
  { id: "map", label: "Map", Icon: IconNetwork },
  { id: "explorer", label: "Explore", Icon: IconSidebar },
  { id: "properties", label: "Details", Icon: IconProperties },
  { id: "analysis", label: "Analysis", Icon: IconAnalysis },
  { id: "notes", label: "Notes", Icon: IconNotes },
];

/**
 * Bottom tab bar shown only on a phone-class viewport (REQ-119). Each tab
 * swaps the full-screen workbench surface — there is no room on a phone for the
 * inline panels the desktop shows side by side.
 */
export function PhoneTabBar({ active, onChange }: PhoneTabBarProps) {
  return (
    <nav className="phone-tab-bar" role="tablist" aria-label="Views">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          className={`phone-tab-btn ${active === id ? "active" : ""}`}
          onClick={() => onChange(id)}
        >
          <Icon size={20} />
          <span className="phone-tab-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
