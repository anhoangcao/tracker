import { T, mono } from "../../styles/tokens";
import { MARKET_STATS, DONUT_SEGMENTS } from "../../data/dashboardData";
import { Card, Pulse } from "../atoms";
import { DonutChart } from "../DonutChart";

/* ─────────────────────────── SECTION: MARKET ───────────────────────── */
export const MarketBanner = () => (
  <Card>
    <div
      style={{
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 13px",
          borderRadius: 20,
          background: "rgba(124,58,237,.13)",
          border: `1px solid rgba(167,139,250,.25)`,
          flexShrink: 0,
        }}
      >
        <Pulse />
        <span style={{ fontSize: 13, fontWeight: 600, color: T.accent }}>CHỜ MUA</span>
      </div>
      <span style={{ fontSize: 13, color: T.text2 }}>
        Thị trường đang trong giai đoạn <strong style={{ color: T.text }}>chờ mua</strong> — dòng tiền bắt đầu quay
        trở lại.
      </span>
      <div style={{ display: "flex", gap: 24, marginLeft: "auto", flexWrap: "wrap" }}>
        {MARKET_STATS.map((s, i) => (
          <div key={i} style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: T.text3, letterSpacing: ".05em" }}>{s.label}</div>
            <div style={{ ...mono, fontSize: 15, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: T.text3 }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Donut + legend */}
    <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 20 }}>
      <DonutChart />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", flex: 1 }}>
        {DONUT_SEGMENTS.map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.text2, flex: 1 }}>{seg.label}</span>
            <span style={{ ...mono, fontSize: 13, color: seg.color }}>{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  </Card>
);
