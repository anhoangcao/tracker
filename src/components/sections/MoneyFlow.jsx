import { T, mono } from "../../styles/tokens";
import { Card, CardHeader } from "../atoms";

/* ─────────────────────────── SECTION: MONEY FLOW ───────────────────── */
export const MoneyFlow = () => (
  <Card>
    <CardHeader title="Dòng tiền thị trường" sub="Xu hướng dòng tiền toàn thị trường" />
    <div style={{ padding: "14px 16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: 12,
          background: "rgba(124,58,237,.07)",
          border: `1px solid rgba(167,139,250,.14)`,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 24 }}>💧</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.accent, marginBottom: 2 }}>TIẾP TỤC ĐỔ VÀO</div>
          <div style={{ fontSize: 12, color: T.text2 }}>Dòng tiền đang tiếp tục gia tăng vào thị trường</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "KHỚP LỆNH", val: "23,842", sub: "+18.6% tỷ", vc: T.buy },
          { label: "DÒNG TIỀN", val: "+2,341", sub: "Ròng tỷ", vc: T.buy },
          { label: "ĐỘ RỘNG", val: "267/93", sub: "Tăng/Giảm", vc: T.text },
        ].map((m, i) => (
          <div key={i} style={{ background: T.surface2, borderRadius: 8, padding: "9px 11px" }}>
            <div style={{ fontSize: 9, color: T.text3, letterSpacing: ".05em", marginBottom: 3 }}>{m.label}</div>
            <div style={{ ...mono, fontSize: 15, color: m.vc }}>{m.val}</div>
            <div style={{ fontSize: 11, color: T.text3, marginTop: 1 }}>{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  </Card>
);
