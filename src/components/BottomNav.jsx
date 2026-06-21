import { T } from "../styles/tokens";
import { BOTTOM_TABS } from "../data/dashboardData";
import { Icon } from "./Icon";

/* ─────────────────────────── MOBILE BOTTOM TAB ─────────────────────── */
export const BottomNav = ({ active, onChange }) => (
  <nav
    style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: T.surface,
      borderTop: `1px solid ${T.border}`,
      display: "flex",
      zIndex: 50,
      paddingBottom: "env(safe-area-inset-bottom,8px)",
    }}
  >
    {BOTTOM_TABS.map((t) => (
      <button
        key={t.label}
        onClick={() => onChange(t.label)}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          padding: "10px 0 8px",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <Icon name={t.icon} size={22} color={active === t.label ? T.accent : T.text3} strokeWidth={active === t.label ? 2 : 1.6} />
        <span style={{ fontSize: 10, color: active === t.label ? T.accent : T.text3 }}>{t.label}</span>
      </button>
    ))}
  </nav>
);
