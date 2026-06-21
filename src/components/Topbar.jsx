import { T, mono } from "../styles/tokens";
import { INDICES } from "../data/dashboardData";
import { Icon } from "./Icon";

/* ─────────────────────────── TOPBAR ────────────────────────────────── */
export const Topbar = ({ isMobile, onMenuToggle }) => (
  <header
    style={{
      height: 54,
      flexShrink: 0,
      background: T.surface,
      borderBottom: `1px solid ${T.border}`,
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      gap: 14,
      position: "sticky",
      top: 0,
      zIndex: 20,
    }}
  >
    {isMobile && (
      <button
        onClick={onMenuToggle}
        style={{ background: "none", border: "none", color: T.text2, cursor: "pointer", padding: 4 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    )}
    {isMobile && (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "linear-gradient(135deg,#7C3AED,#A78BFA)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,12 5,8 9,10 15,4" />
            <polyline points="11,4 15,4 15,8" />
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600 }}>StockTraders AI</span>
      </div>
    )}
    {!isMobile && (
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Dashboard</div>
        <div style={{ fontSize: 11, color: T.text3 }}>Tổng quan thị trường</div>
      </div>
    )}

    {/* Indices */}
    <div style={{ display: "flex", gap: isMobile ? 12 : 22, marginLeft: "auto", overflowX: "auto" }}>
      {INDICES.map((idx, i) => (
        <div key={i} style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: T.text3, letterSpacing: ".05em" }}>{idx.name}</div>
          <div style={{ ...mono, fontSize: 13 }}>{idx.val}</div>
          <div style={{ fontSize: 11, color: T.buy }}>{idx.pct}</div>
        </div>
      ))}
    </div>

    {/* User */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        paddingLeft: 18,
        borderLeft: `1px solid ${T.border}`,
        flexShrink: 0,
      }}
    >
      <div style={{ position: "relative" }}>
        <Icon name="bell" size={18} color={T.text2} />
        <span
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: T.sell,
            border: `1.5px solid ${T.surface}`,
          }}
        />
      </div>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "rgba(124,58,237,.2)",
          border: "1.5px solid rgba(167,139,250,.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          color: T.accent,
        }}
      >
        NA
      </div>
      {!isMobile && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Nguyễn Văn A</div>
          <div
            style={{
              fontSize: 10,
              padding: "1px 7px",
              background: "rgba(240,160,69,.15)",
              color: T.warn,
              borderRadius: 10,
              fontWeight: 500,
            }}
          >
            Premium
          </div>
        </div>
      )}
    </div>
  </header>
);
