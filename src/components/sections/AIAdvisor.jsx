import { T } from "../../styles/tokens";
import { ADVISOR_ROWS } from "../../data/dashboardData";
import { Card, CardHeader } from "../atoms";
import { Icon } from "../Icon";

/* ─────────────────────────── SECTION: AI ADVISOR ───────────────────── */
export const AIAdvisor = () => (
  <Card>
    <CardHeader title="🤖 AI Advisor" sub="Khuyến nghị cá nhân hóa từ AI" />
    <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "190px 1fr", gap: 20 }}>
      <div>
        {ADVISOR_ROWS.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: i < ADVISOR_ROWS.length - 1 ? `1px solid ${T.border}` : "none",
            }}
          >
            <span style={{ fontSize: 12, color: T.text3 }}>{r.label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: r.color }}>{r.val}</span>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.7, marginBottom: 14 }}>
          Thị trường đang trong giai đoạn <strong style={{ color: T.text }}>CHỜ MUA</strong> với dòng tiền{" "}
          <strong style={{ color: T.text }}>TIẾP TỤC ĐỔ VÀO</strong>. Nhóm ngành dẫn sóng là{" "}
          <strong style={{ color: T.text }}>Chứng khoán</strong> với sức mạnh cao (82). Mã{" "}
          <strong style={{ color: T.text }}>SSI</strong> đang hút tiền và có sức mạnh vượt trội (88).
          <br />
          <br />
          ⇒ Ưu tiên theo dõi và giải ngân từng phần vào nhóm <strong style={{ color: T.text }}>Chứng khoán</strong>.
          Đặc biệt chú ý quản trị vốn — đây là điểm yếu cần cải thiện.
        </div>
        <button
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            background: "linear-gradient(135deg,#7C3AED,#A78BFA)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "Inter,sans-serif",
          }}
        >
          Xem chi tiết phân tích <Icon name="arrow" size={14} color="#fff" strokeWidth={2} />
        </button>
      </div>
    </div>
  </Card>
);
