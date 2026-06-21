import { T, mono, tagStyle } from "../../styles/tokens";
import { SECTOR_FLOW, SECTOR_STRENGTH, STOCK_FLOW, STOCK_STRENGTH } from "../../data/dashboardData";
import { Card, CardHeader, StrengthBar, StockTag } from "../atoms";

/* ─────────────────────────── SECTION: TOP LISTS ────────────────────── */
export const SectorFlowList = () => (
  <Card>
    <CardHeader title="Top ngành hút tiền" sub="Dòng tiền đang đổ vào ngành nào?" action="Xem tất cả →" />
    {SECTOR_FLOW.map((item, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "9px 14px",
          borderBottom: i < SECTOR_FLOW.length - 1 ? `1px solid ${T.border}` : "none",
        }}
      >
        <span style={{ ...mono, fontSize: 11, color: T.text3, width: 14 }}>{item.rank}</span>
        <span style={{ fontSize: 15 }}>{item.icon}</span>
        <span style={{ fontSize: 13, flex: 1 }}>{item.name}</span>
        <span style={tagStyle(item.type)}>{item.tag}</span>
      </div>
    ))}
  </Card>
);

export const SectorStrengthList = () => (
  <Card>
    <CardHeader title="Top ngành mạnh nhất" sub="Ngành nào mạnh nhất?" action="Xem tất cả →" />
    {SECTOR_STRENGTH.map((item, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 14px",
          borderBottom: i < SECTOR_STRENGTH.length - 1 ? `1px solid ${T.border}` : "none",
        }}
      >
        <span style={{ ...mono, fontSize: 11, color: T.text3, width: 14 }}>{item.rank}</span>
        <span style={{ fontSize: 13, flex: 1 }}>{item.name}</span>
        <StrengthBar score={item.score} color={item.color} />
      </div>
    ))}
  </Card>
);

export const StockFlowList = () => (
  <Card>
    <CardHeader title="Top mã hút tiền" sub="Dòng tiền đang đổ vào mã nào?" action="Xem tất cả →" />
    {STOCK_FLOW.map((item, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "9px 14px",
          borderBottom: i < STOCK_FLOW.length - 1 ? `1px solid ${T.border}` : "none",
        }}
      >
        <span style={{ ...mono, fontSize: 11, color: T.text3, width: 14 }}>{item.rank}</span>
        <StockTag code={item.code} cls={item.cls} />
        <span style={{ fontSize: 13, flex: 1 }}>{item.name}</span>
        <span style={tagStyle(item.type)}>{item.tag}</span>
      </div>
    ))}
  </Card>
);

export const StockStrengthList = () => (
  <Card>
    <CardHeader title="Top mã mạnh nhất" sub="Mã nào mạnh nhất?" action="Xem tất cả →" />
    {STOCK_STRENGTH.map((item, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "9px 14px",
          borderBottom: i < STOCK_STRENGTH.length - 1 ? `1px solid ${T.border}` : "none",
        }}
      >
        <span style={{ ...mono, fontSize: 11, color: T.text3, width: 14 }}>{item.rank}</span>
        <StockTag code={item.code} cls={item.cls} />
        <span style={{ fontSize: 13, flex: 1 }}>{item.name}</span>
        <StrengthBar score={item.score} color={item.color} />
      </div>
    ))}
  </Card>
);
