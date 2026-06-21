import { T } from "../styles/tokens";
import { NAV_ITEMS } from "../data/dashboardData";
import { Icon } from "./Icon";

/* ─────────────────────────── SIDEBAR ───────────────────────────────── */
export const Sidebar = ({ active, onNav }) => {
  const sections = [...new Set(NAV_ITEMS.map((n) => n.section))];
  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        background: T.surface,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: "linear-gradient(135deg,#7C3AED,#A78BFA)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1,12 5,8 9,10 15,4" />
              <polyline points="11,4 15,4 15,8" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>StockTraders AI</span>
        </div>
        <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>AI đồng hành – Dòng tiền dẫn lối</div>
      </div>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "10px 8px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {sections.map((sec) => (
          <div key={sec}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: ".08em",
                color: T.text3,
                padding: "8px 10px 4px",
                textTransform: "uppercase",
              }}
            >
              {sec}
            </div>
            {NAV_ITEMS.filter((n) => n.section === sec).map((n) => (
              <div
                key={n.label}
                onClick={() => onNav(n.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "8px 10px",
                  borderRadius: 6,
                  color: active === n.label ? T.accent : T.text2,
                  background: active === n.label ? "rgba(167,139,250,.14)" : "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  transition: "background .15s",
                }}
              >
                <Icon name={n.icon} size={15} color={active === n.label ? T.accent : T.text2} strokeWidth={1.6} />
                {n.label}
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Upgrade */}
      <div style={{ padding: 12, borderTop: `1px solid ${T.border}` }}>
        <div
          style={{
            background: "linear-gradient(135deg,rgba(124,58,237,.2),rgba(167,139,250,.1))",
            border: "1px solid rgba(167,139,250,.25)",
            borderRadius: 10,
            padding: "12px 13px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>👑 Nâng cấp Premium</div>
          <div style={{ fontSize: 11, color: T.text2, marginBottom: 10, lineHeight: 1.4 }}>
            Tín hiệu real-time, AI phân tích sâu và hơn thế
          </div>
          <button
            style={{
              display: "block",
              width: "100%",
              background: "linear-gradient(135deg,#7C3AED,#A78BFA)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "7px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Inter,sans-serif",
            }}
          >
            Nâng cấp ngay
          </button>
        </div>
      </div>
    </aside>
  );
};
