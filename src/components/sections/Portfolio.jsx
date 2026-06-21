import { T, mono } from "../../styles/tokens";
import { PERF } from "../../data/dashboardData";
import { Card, CardHeader } from "../atoms";

/* ─────────────────────────── SECTION: PORTFOLIO ────────────────────── */
export const Portfolio = () => (
  <Card>
    <CardHeader title="Danh mục của bạn" action="Xem danh mục →" />
    <div style={{ padding: "13px 15px" }}>
      {/* totals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
        {[
          { label: "TỔNG GIÁ TRỊ", val: "512.3M", sub: "VNĐ", color: T.text },
          { label: "LÃI / LỖ", val: "+23.4M", sub: "+4.79%", color: T.buy },
        ].map((p, i) => (
          <div key={i} style={{ background: T.surface2, borderRadius: 8, padding: "9px 12px" }}>
            <div style={{ fontSize: 9, color: T.text3, letterSpacing: ".05em", marginBottom: 3 }}>{p.label}</div>
            <div style={{ ...mono, fontSize: 18, fontWeight: 500, color: p.color }}>{p.val}</div>
            <div style={{ fontSize: 11, color: i === 1 ? T.buy : T.text3, marginTop: 2 }}>{p.sub}</div>
          </div>
        ))}
      </div>

      {/* allocation */}
      <div
        style={{
          fontSize: 10,
          color: T.text3,
          marginBottom: 5,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: T.info }}>Cổ phiếu 62%</span>
        <span>Tiền mặt 38%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, overflow: "hidden", display: "flex", marginBottom: 13 }}>
        <div style={{ width: "62%", background: T.info }} />
        <div style={{ width: "38%", background: T.surface3 }} />
      </div>

      {/* performance */}
      {PERF.map((p, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "7px 0",
            borderBottom: i < PERF.length - 1 ? `1px solid ${T.border}` : "none",
          }}
        >
          <span style={{ fontSize: 12, color: T.text3 }}>{p.period}</span>
          <span style={{ ...mono, fontSize: 12, color: T.buy }}>{p.val}</span>
        </div>
      ))}
    </div>
  </Card>
);
