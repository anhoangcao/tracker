import { T, mono, stockColors } from "../styles/tokens";

/* ─────────────────────────── ATOMIC COMPONENTS ─────────────────────── */

export const Card = ({ children, style }) => (
  <div
    style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

export const CardHeader = ({ title, sub, action }) => (
  <div
    style={{
      padding: "13px 16px",
      borderBottom: `1px solid ${T.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: T.text3, marginTop: 1 }}>{sub}</div>}
    </div>
    {action && <span style={{ fontSize: 12, color: T.accent, cursor: "pointer" }}>{action}</span>}
  </div>
);

export const Pulse = () => (
  <span
    style={{
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: T.accent,
      display: "inline-block",
      animation: "pulse 2s infinite",
      flexShrink: 0,
    }}
  />
);

export const StrengthBar = ({ score, color, width = 60 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width, height: 4, background: T.surface3, borderRadius: 2 }}>
      <div style={{ width: `${score}%`, height: 4, background: color, borderRadius: 2 }} />
    </div>
    <span style={{ ...mono, fontSize: 12, color, minWidth: 22, textAlign: "right" }}>{score}</span>
  </div>
);

export const StockTag = ({ code, cls }) => {
  const sc = stockColors[cls] || { bg: T.surface3, color: T.text2 };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 22,
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        background: sc.bg,
        color: sc.color,
        flexShrink: 0,
      }}
    >
      {code}
    </span>
  );
};
