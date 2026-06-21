import { T, mono } from "../../styles/tokens";
import { PROFILE_SCORES } from "../../data/dashboardData";
import { Card, CardHeader } from "../atoms";

/* ─────────────────────────── SECTION: PROFILE ──────────────────────── */
export const InvestorProfile = () => (
  <Card>
    <CardHeader
      title={
        <>
          Hồ sơ nhà đầu tư <span style={{ color: T.warn, fontSize: 11 }}>Premium</span>
        </>
      }
      sub="Điểm số năng lực đầu tư"
      action="Xem chi tiết →"
    />
    <div style={{ padding: "14px 16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {PROFILE_SCORES.map((s, i) => (
          <div key={i} style={{ background: T.surface2, borderRadius: 8, padding: "11px 13px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 7,
              }}
            >
              <span style={{ fontSize: 11, color: T.text2 }}>{s.label}</span>
              <span style={{ ...mono, fontSize: 20, color: s.color, lineHeight: 1 }}>
                {s.score}
                <sub style={{ fontSize: 10, opacity: 0.5 }}>/100</sub>
              </span>
            </div>
            <div style={{ height: 4, background: T.surface3, borderRadius: 2, marginBottom: 5 }}>
              <div style={{ width: `${s.score}%`, height: 4, background: s.color, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 11, color: s.color }}>{s.grade}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          borderLeft: `3px solid ${T.accent}`,
          background: "rgba(167,139,250,.04)",
          padding: "10px 13px",
          borderRadius: "0 8px 8px 0",
        }}
      >
        <div style={{ fontSize: 10, color: T.accent, fontWeight: 600, marginBottom: 3 }}>🤖 AI nhận xét</div>
        <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.6 }}>
          Bạn đọc thị trường khá tốt và chọn đúng ngành tiềm năng. Tuy nhiên, bạn thường chọn mã chưa mạnh trong
          ngành và quản trị vốn chưa tốt.
        </div>
      </div>
    </div>
  </Card>
);
