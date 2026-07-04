import { useMemo, useState } from "react";
import { useTheme } from "../../theme";
import { mono, sigStyle } from "../../styles/tokens";
import { useNarrow } from "../../app/useNarrow";
import { fmtFull, fmtNum } from "../../app/formatters";
import { CORE_BRANCHES, useSMDT, useRealtimeFeed as useRealtimeSMDTBranchFeed } from "../../data/useSMDT";
import { useCashFlowBranch, useRealtimeCashFlowFeed, contentToSig } from "../../data/useCashFlowBranch";
import { useSMDTTicker, useRealtimeSMDTTickerFeed } from "../../data/useSMDTTicker";
import { useCashFlowTicker, useRealtimeCashFlowTickerFeed, tickerContentToSig } from "../../data/useCashFlowTicker";
import { useBranchPath } from "../../data/useBranchPath";
import { useSMDTBranchCross } from "../../data/useSMDTCross";
import { useStockSignal } from "../../data/useStockSignal";
import { useStockWave, useRealtimeStockWaveFeed } from "../../data/useStockWave";
import { useTotalTrade } from "../../data/useTotalTrade";
import { Card, Clink, LiveFooter, Pagination } from "../../components/ui";
import { PORTFOLIO_MAX_CODES, loadSavedPortfolio, parsePortfolioCodes, savePortfolioState } from "../portfolio-analysis/portfolioState";
import { isCashFlowCoreIndustry } from "../cash-flow-ticker/cashFlowUtils";

const SIG_ORDER = ["sn", "si", "so", "st"];
const CORE_KEYS = new Set(CORE_BRANCHES.map((b) => b.key));
const CORE_LABELS = new Set(CORE_BRANCHES.flatMap((b) => [b.key, b.label]));
const TOP_LIMIT = 40;
const PAGE_SIZE = 8;
const INDUSTRY_ALIAS_GROUPS = [
  ["Môi giới chứng khoán", "Chứng khoán"],
  ["Ngân hàng thương mại truyền thống", "Ngân hàng"],
  ["Bất động sản dân cư", "BĐS Dân cư", "BĐS dân cư", "Bất động sản Dân cư", "Bất động sản"],
  ["Sản xuất, chế biến thép", "Thép"],
  ["Sóng ngành Vin", "Sóng Vin", "Vin", "Vingroup"],
  ["Xây dựng"],
  ["Sản xuất và Khai thác dầu khí", "Dầu khí"],
];
const DONUT_COLORS = {
  si: "#0ca30c",
  sn: "#1baf7a",
  so: "#eda100",
  st: "#e34948",
  waitBuy: "#1baf7a",
  buy: "#0ca30c",
  waitSell: "#eda100",
  sell: "#e34948",
};

function nav(id) {
  window.dispatchEvent(new CustomEvent("st-nav", { detail: id }));
}

function topDate(datesAsc) {
  return datesAsc[datesAsc.length - 1] || "";
}

function toDateInputValue(date) {
  if (!date || typeof date !== "string") return "";
  if (date.includes("/")) {
    const [d, m, y] = date.split("/");
    return d && m && y ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
  }
  return date.slice(0, 10);
}

function sortDatesDesc(dates) {
  return [...dates].sort((a, b) => toDateInputValue(b).localeCompare(toDateInputValue(a)));
}

function findDateIndex(datesDesc, dateValue) {
  if (!dateValue || datesDesc.length === 0) return -1;
  const exactIndex = datesDesc.findIndex((date) => toDateInputValue(date) === dateValue);
  if (exactIndex >= 0) return exactIndex;
  const previousIndex = datesDesc.findIndex((date) => toDateInputValue(date) <= dateValue);
  return previousIndex === -1 ? datesDesc.length - 1 : previousIndex;
}

function findBucketByDate(buckets, date) {
  const value = toDateInputValue(date);
  if (!value) return null;
  return buckets.find((bucket) => toDateInputValue(bucket.date) === value) || null;
}

function findLatestValueAtOrBefore(row, datesDesc, dateValue) {
  if (!row || !dateValue) return null;
  const startIndex = findDateIndex(datesDesc, dateValue);
  if (startIndex < 0) return null;
  for (let index = startIndex; index < datesDesc.length; index += 1) {
    const value = row[datesDesc[index]];
    if (value != null) return value;
  }
  return null;
}

function latestUpdatedAt(...items) {
  return items.filter(Boolean).sort((a, b) => b.getTime() - a.getTime())[0] || null;
}

function toNumber(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeIndustryName(name) {
  return String(name || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function aliasesOfIndustry(name) {
  const normalized = normalizeIndustryName(name);
  const group = INDUSTRY_ALIAS_GROUPS.find((items) => items.some((item) => normalizeIndustryName(item) === normalized));
  return group || [name];
}

function setIndustryLookup(map, name, value) {
  for (const alias of aliasesOfIndustry(name)) map.set(normalizeIndustryName(alias), value);
}

function lookupIndustryValue(map, name) {
  for (const alias of aliasesOfIndustry(name)) {
    const value = map.get(normalizeIndustryName(alias));
    if (value != null) return value;
  }
  return map.get(normalizeIndustryName(name));
}

function sigWeight(sig) {
  return { si: 3, sn: 1.6, so: -1.1, st: -2.4 }[sig] || 0;
}

function isPositiveSig(sig) {
  return sig === "si" || sig === "sn";
}

function classifyStrongTicker(smdt, prevSmdt, prev2Smdt, tickerSig, branchSmdt, branchSig) {
  const hasPrev = Number.isFinite(prevSmdt);
  const momentum = Number.isFinite(prevSmdt) ? smdt - prevSmdt : 0;
  const prevMomentum = Number.isFinite(prevSmdt) && Number.isFinite(prev2Smdt) ? prevSmdt - prev2Smdt : 0;
  const crossedStrong = hasPrev && prevSmdt < 70 && smdt > 70;

  if (crossedStrong) return "vm";
  if (smdt >= 70) return "dt";

  const rising = momentum > 0;
  const risingTwoSessions = momentum > 0 && prevMomentum > 0;
  const tickerFlowSupported = isPositiveSig(tickerSig) && (smdt >= 45 || rising);
  const branchFlowSupported = Number.isFinite(branchSmdt) && branchSmdt >= 70 && isPositiveSig(branchSig) && smdt >= 45;
  if ((smdt >= 50 && rising) || risingTwoSessions || tickerFlowSupported || branchFlowSupported) return "tn";

  return null;
}

function smdtColor(value) {
  if (value >= 100) return "#0ca30c";
  if (value >= 70) return "#1baf7a";
  if (value >= 30) return "#eda100";
  return "var(--t4)";
}

function sigLabel(sig) {
  return { si: "Đổ vào", sn: "Nhen nhóm", so: "Đang thoát", st: "Thoát ra" }[sig] || "—";
}

function strongStatusLabel(status) {
  return { vm: "Vừa mạnh", dt: "Duy trì", tn: "Tiềm năng" }[status] || "—";
}

function signalToSig(signal) {
  if (signal === "MUA") return "si";
  if (signal === "BAN") return "st";
  return null;
}

function isCoreBranchName(name) {
  return CORE_LABELS.has(name);
}

function getLatestTrade(totalTrade, ticker) {
  const row = totalTrade.matrix[ticker] || {};
  const date = Object.keys(row).sort().at(-1);
  return date ? row[date] : null;
}

function EmptyHint({ children = "Đang tải dữ liệu..." }) {
  return <div style={{ padding: 18, textAlign: "center", color: "var(--t3)", fontSize: 11 }}>{children}</div>;
}

function DashHeader({ title, meta, action, onClick }) {
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 750, color: "var(--t1)" }}>{title}</div>
        {meta && <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</div>}
      </div>
      {action && <Clink onClick={onClick}>{action}</Clink>}
    </div>
  );
}

function DotLegend({ items, square }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      {items.map((item) => (
        <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--t2)", whiteSpace: "nowrap" }}>
          <span style={{ width: 7, height: 7, borderRadius: square ? 2 : 999, background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function Donut({ items, size = 180, badges = true }) {
  const cx = 110;
  const cy = 110;
  const r = 95;
  const gap = 5;
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const totalDeg = 360 - items.length * gap;
  let cur = 0;

  const xy = (deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const arc = (start, end) => {
    const p = xy(start);
    const q = xy(end);
    return `M${p.x.toFixed(2)} ${p.y.toFixed(2)}A${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
  };

  const segs = items.map((item) => {
    if (!total || !item.value) {
      cur += gap;
      return null;
    }
    const span = (item.value / total) * totalDeg;
    const start = cur + gap / 2;
    const end = start + span;
    cur += span + gap;
    return { ...item, start, end, mid: (start + end) / 2, span };
  });

  return (
    <svg viewBox="0 0 220 220" width="100%" style={{ maxWidth: size, display: "block" }}>
      <circle cx={cx} cy={cy} r={r} fill="var(--elev)" stroke="var(--bdr)" strokeWidth="0.5" />
      {segs.map((seg, index) => seg && <path key={index} d={arc(seg.start, seg.end)} stroke={seg.color} strokeWidth="22" fill="none" strokeLinecap="round" />)}
      <circle cx={cx} cy={cy} r="57" fill="var(--surf)" stroke="var(--bdr)" strokeWidth="0.5" />
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize="26" fontWeight="750" fill="var(--t1)" style={mono}>{fmtNum(total)}</text>
      {badges && segs.map((seg, index) => {
        if (!seg || seg.span <= 15) return null;
        const p = xy(seg.mid);
        const bx = Math.max(17, Math.min(203, p.x));
        const by = Math.max(17, Math.min(203, p.y));
        const fs = seg.value >= 100 ? 10 : seg.value >= 10 ? 13 : 15;
        return (
          <g key={`badge-${index}`}>
            <circle cx={bx.toFixed(1)} cy={by.toFixed(1)} r="15" fill={seg.color} />
            <text x={bx.toFixed(1)} y={(by + 5).toFixed(1)} textAnchor="middle" fontSize={fs} fontWeight="600" fill="#fff" style={mono}>{seg.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SplitDonuts({ leftTitle, rightTitle, leftItems, rightItems }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", width: "100%", gap: 8 }}>
      <MiniDonut title={leftTitle} items={leftItems} />
      <div style={{ width: 1, background: "var(--bdr)", height: 100 }} />
      <MiniDonut title={rightTitle} items={rightItems} />
    </div>
  );
}

function MiniDonut({ title, items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "var(--t3)" }}>{title}</div>
      <Donut items={items} size={130} />
    </div>
  );
}

function DashboardCard({ children, onClick, style }) {
  return (
    <Card
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        cursor: onClick ? "pointer" : undefined,
        minWidth: 0,
        ...style,
      }}
    >
      <div onClick={onClick} style={{ width: "100%", display: "contents" }}>{children}</div>
    </Card>
  );
}

function SmdtBarRow({ name, value, max, ticker }) {
  const color = smdtColor(value);
  const pct = max ? Math.max(2, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 9, fontWeight: ticker ? 750 : 500, color: ticker ? "var(--t2)" : "var(--t3)", width: ticker ? 34 : 72, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </span>
      <div style={{ flex: 1, height: 5, background: "var(--elev)", borderRadius: 2, overflow: "hidden", minWidth: 16 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 9, fontWeight: 750, color, minWidth: 32, textAlign: "right", ...mono }}>{Math.round(value)}%</span>
    </div>
  );
}

function SmdtPreview({ title, meta, leftTitle, rightTitle, leftRows, rightRows, ticker, navId }) {
  const max = Math.max(1, ...leftRows.map((r) => r.value), ...rightRows.map((r) => r.value));
  return (
    <Card style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }} onClick={() => nav(navId)}>
      <DashHeader title={title} meta={meta} action="Chi tiết ›" onClick={() => nav(navId)} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <SectionLabel>{leftTitle}</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {leftRows.length ? leftRows.map((row) => <SmdtBarRow key={row.key} name={row.name} value={row.value} max={max} ticker={ticker} />) : <EmptyHint />}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <SectionLabel>{rightTitle}</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {rightRows.length ? rightRows.map((row) => <SmdtBarRow key={row.key} name={row.name} value={row.value} max={max} ticker={ticker} />) : <EmptyHint />}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 6, borderTop: "0.5px solid var(--bdr)" }}>
        <LegendText color="#0ca30c" label=">=100%" />
        <LegendText color="#1baf7a" label=">=70%" />
        <LegendText color="#eda100" label=">=30%" />
        <LegendText color="var(--t4)" label="<30%" />
      </div>
    </Card>
  );
}

function LegendText({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--t2)" }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 9, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>{children}</div>;
}

function ChipButton({ children, active, tone = "B", onClick }) {
  const color = tone === "G" ? "#0ca30c" : tone === "R" ? "#e34948" : "var(--B)";
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 10,
        padding: "2px 9px",
        borderRadius: 12,
        border: `0.5px solid ${active ? color : "var(--bdr)"}`,
        background: active ? "rgba(124,58,237,.12)" : "var(--elev)",
        color: active ? color : "var(--t2)",
        cursor: "pointer",
        fontWeight: active ? 750 : 600,
      }}
    >
      {children}
    </button>
  );
}

function SignalPill({ sig, compact = false }) {
  const { t } = useTheme();
  const s = sigStyle(sig, t);
  if (!s) return <span style={{ color: "var(--t4)" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", fontSize: compact ? 9 : 10, fontWeight: 650, padding: compact ? "2px 5px" : "2px 6px", borderRadius: 3, whiteSpace: "nowrap", background: s.bg, color: s.color, border: `0.5px solid ${s.color}33` }}>
      {sigLabel(sig)}
    </span>
  );
}

function TopStrongTable({ rows, date, narrow }) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    if (filter === "si") return rows.filter((row) => row.tickerSig === "si");
    if (filter === "sn") return rows.filter((row) => row.tickerSig === "sn");
    return rows;
  }, [filter, rows]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const displayCount = filter === "all" ? rows.length : filtered.length;

  const setNextFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  return (
    <Card noPad style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 750, color: "var(--t1)" }}>Top mã mạnh</span>
          <span style={{ fontSize: 10, color: "var(--t3)", marginLeft: 6 }}>{fmtNum(displayCount)} mã{date ? ` · ${fmtFull(date)}` : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <ChipButton active={filter === "all"} onClick={() => setNextFilter("all")}>Tất cả</ChipButton>
          <ChipButton active={filter === "sn"} tone="G" onClick={() => setNextFilter("sn")}>Nhen nhóm</ChipButton>
          <ChipButton active={filter === "si"} tone="G" onClick={() => setNextFilter("si")}>Đổ vào</ChipButton>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: narrow ? 520 : 0 }}>
          <thead>
            <tr style={{ background: "var(--elev)" }}>
              {["Mã", "Giá", "TH cổ phiếu", "TH ngành", "T.thái"].map((h, i) => (
                <th key={h} style={{ padding: i === 0 ? "5px 10px" : "5px 8px", textAlign: i === 1 ? "right" : "left", fontSize: 9, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", borderBottom: "0.5px solid var(--bdr)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.ticker} onClick={() => nav("top-ma-manh")} style={{ borderBottom: "0.5px solid var(--bdrs)", cursor: "pointer" }}>
                <td style={{ padding: "6px 10px", fontSize: 12, fontWeight: 800, color: "var(--t1)" }}>{row.ticker}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 650, color: "var(--t1)", ...mono }}>{row.price ? fmtNum(row.price) : "—"}</td>
                <td style={{ padding: "6px 8px" }}><SignalPill sig={row.tickerSig} /></td>
                <td style={{ padding: "6px 8px" }}><SignalPill sig={row.branchSig} /></td>
                <td style={{ padding: "6px 8px", fontSize: 10, color: row.status === "vm" ? "#9b7cf7" : row.status === "tn" ? "#eda100" : "var(--t3)" }}>{strongStatusLabel(row.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <EmptyHint />}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 14px", borderTop: "0.5px solid var(--bdr)", marginTop: "auto", gap: 8 }}>
        <span style={{ fontSize: 10, color: "var(--t3)" }}>{filtered.length ? `${(safePage - 1) * PAGE_SIZE + 1}-${Math.min(safePage * PAGE_SIZE, filtered.length)} / ${filtered.length}` : "0 / 0"}</span>
        <Pagination compact page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>
    </Card>
  );
}

function PortfolioBox({ rows }) {
  const saved = useMemo(() => loadSavedPortfolio("STB, BVS, SSI"), []);
  const initialInput = saved.input || saved.analyzedCodes.join(", ") || "STB, BVS, SSI";
  const [input, setInput] = useState(initialInput);
  const picks = useMemo(() => parsePortfolioCodes(input), [input]);
  const rowMap = useMemo(() => new Map(rows.map((row) => [row.ticker, row])), [rows]);
  const analyzed = picks.map((ticker) => {
    const row = rowMap.get(ticker);
    const strongStock = (row?.smdt || 0) >= 70;
    const goodFlow = row?.sig === "si" || row?.sig === "sn";
    const strongBranch = (row?.branchSmdt || 0) >= 70 || row?.branchSig === "si" || row?.branchSig === "sn";
    const cat = strongStock && strongBranch ? "dd" : strongStock ? "ds" : strongBranch || goodFlow ? "sd" : "ss";
    return { ticker, cat };
  });
  const counts = analyzed.reduce((acc, row) => ({ ...acc, [row.cat]: (acc[row.cat] || 0) + 1 }), { dd: 0, ds: 0, sd: 0, ss: 0 });
  const total = Math.max(1, analyzed.length);
  const score = analyzed.length ? Math.round((counts.dd * 100 + counts.ds * 50 + counts.sd * 30) / total) : 0;
  const level = score >= 70 ? "Tốt" : score >= 50 ? "Trung bình" : "Cần cơ cấu lại";
  const aiMessage = counts.ss / total >= 0.5
    ? "Nhiều mã sai sóng sai ngành. Cân nhắc cơ cấu lại, tập trung mã đúng ngành dẫn dắt."
    : counts.dd / total >= 0.6
      ? "Danh mục mạnh — đa số đúng sóng đúng ngành. Duy trì và theo dõi tín hiệu bán."
      : counts.ds / total >= 0.3
        ? "Đúng sóng nhưng sai ngành — xem xét chuyển sang mã trong ngành đang dẫn."
        : "Danh mục trung bình. Tăng tỷ trọng mã đúng ngành dẫn, cắt giảm mã sai sóng.";
  const cats = [
    { key: "dd", color: "#0ca30c", label: "Đúng sóng - đúng ngành" },
    { key: "ds", color: "#eda100", label: "Đúng sóng - sai ngành" },
    { key: "sd", color: "#9b7cf7", label: "Đúng ngành - sai sóng" },
    { key: "ss", color: "#e34948", label: "Sai sóng - sai ngành" },
  ];
  const updateInput = (value) => {
    const nextCodes = parsePortfolioCodes(value);
    setInput(value);
    savePortfolioState(value, nextCodes);
  };
  const analyzePortfolio = () => {
    if (!picks.length) return;
    savePortfolioState(input, picks);
    nav("portfolio-analysis");
  };

  return (
    <Card style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 750, color: "var(--t1)" }}>Phân tích danh mục</span>
        <span style={{ fontSize: 10, color: "var(--t3)" }}>tối đa {PORTFOLIO_MAX_CODES} mã</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => updateInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyzePortfolio()}
          style={{ flex: 1, minWidth: 0, padding: "7px 11px", borderRadius: 7, border: "0.5px solid var(--bdr)", background: "var(--elev)", color: "var(--t1)", fontSize: 11, outline: "none" }}
          placeholder="VCG, HHV, BVS, TCB..."
        />
        <button
          type="button"
          onClick={analyzePortfolio}
          disabled={!picks.length}
          style={{ padding: "7px 12px", borderRadius: 7, background: "var(--B)", color: "white", border: "none", fontSize: 11, fontWeight: 700, cursor: picks.length ? "pointer" : "not-allowed", whiteSpace: "nowrap", opacity: picks.length ? 1 : 0.5 }}
        >
          <i className="ti ti-sparkles" style={{ marginRight: 5 }} />
          Phân tích
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Donut items={cats.map((cat) => ({ value: counts[cat.key] || 0, color: cat.color }))} size={72} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {cats.map((cat) => (
            <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: cat.color }} />
              <span style={{ flex: 1, minWidth: 0, color: "var(--t2)", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cat.label}</span>
              <span style={{ color: cat.color, fontSize: 11, fontWeight: 750, whiteSpace: "nowrap", ...mono }}>{counts[cat.key] || 0} ({Math.round(((counts[cat.key] || 0) / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", background: "var(--elev)", borderRadius: 8, padding: "8px 12px" }}>
        <div>
          <div style={{ fontSize: 9, color: "var(--t3)", marginBottom: 2 }}>Điểm phù hợp</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: score >= 70 ? "#0ca30c" : score >= 50 ? "#eda100" : "#e34948", ...mono }}>{score}/100</div>
          <div style={{ fontSize: 9, color: "var(--t3)" }}>{level}</div>
        </div>
        <div style={{ width: 1, height: 38, background: "var(--bdr)" }} />
        <div style={{ fontSize: 11, color: "var(--t2)", lineHeight: 1.55, flex: 1 }}>
          <span style={{ fontSize: 9, fontWeight: 750, color: "#9b7cf7" }}>✦ AI </span>
          {aiMessage}
        </div>
      </div>
    </Card>
  );
}

const WAVE_PALETTE = ["#7C3AED", "#06B6D4", "#FF9F0A", "#FF2D55", "#14B8A6", "#F59E0B", "#EC4899", "#8B5CF6", "#3DD68C", "#84CC16", "#F97316", "#A78BFA", "#6366F1", "#0EA5E9", "#22C55E", "#64748B", "#0891B2", "#DC2626"];
const WAVE_PAGE_SIZE = 6;
const WAVE_AXIS_HEIGHT = 24;
const WAVE_ROW_HEIGHT = 30;
const WAVE_PLOT_RIGHT = 90;

function monthTicks(startMs, endMs) {
  const span = Math.max(1, endMs - startMs);
  const ticks = [];
  const cursor = new Date(startMs);
  cursor.setDate(1);
  const multiYear = new Date(startMs).getFullYear() !== new Date(endMs).getFullYear();
  while (cursor.getTime() <= endMs) {
    const ms = cursor.getTime();
    if (ms >= startMs) {
      ticks.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        left: ((ms - startMs) / span) * WAVE_PLOT_RIGHT,
        label: `T${cursor.getMonth() + 1}${multiYear ? `/${String(cursor.getFullYear()).slice(2)}` : ""}`,
      });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

function WaveTimeline({ events, recentDates, narrow }) {
  const [mode, setMode] = useState("core");
  const [page, setPage] = useState(1);
  const colorByKey = useMemo(() => {
    const map = new Map();
    events.forEach((event, index) => map.set(event.key, WAVE_PALETTE[index % WAVE_PALETTE.length]));
    return map;
  }, [events]);

  const filtered = useMemo(() => {
    return events
      .filter((event) => (mode === "core" ? event.isCore : !event.isCore))
      .sort((a, b) => (b.points.at(-1)?.date || "").localeCompare(a.points.at(-1)?.date || ""));
  }, [events, mode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / WAVE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * WAVE_PAGE_SIZE, safePage * WAVE_PAGE_SIZE);

  const start = recentDates[0] ? new Date(recentDates[0]).getTime() : Date.now();
  const end = recentDates.at(-1) ? new Date(recentDates.at(-1)).getTime() : start + 1;
  const span = Math.max(1, end - start);
  const ticks = useMemo(() => monthTicks(start, end), [start, end]);
  const recentCut = recentDates.length ? new Date(end - 14 * 86400000).toISOString().slice(0, 10) : "";
  const nameWidth = narrow ? 82 : 110;

  const switchMode = (value) => {
    setMode(value);
    setPage(1);
  };

  return (
    <Card noPad style={{ overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 750, color: "var(--t1)" }}>Lộ trình dẫn sóng</span>
          <span style={{ fontSize: 10, color: "var(--t3)", marginLeft: 8 }}>{recentDates.length ? `${fmtFull(recentDates[0])} → ${fmtFull(recentDates.at(-1))}` : "30 phiên gần nhất"} · data thật</span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <ChipButton active={mode === "core"} onClick={() => switchMode("core")}>⭐ Chủ lực</ChipButton>
          <ChipButton active={mode === "other"} onClick={() => switchMode("other")}>Ngành phụ</ChipButton>
          <Clink onClick={() => nav("lo-trinh-dan-song")}>Chi tiết ›</Clink>
        </div>
      </div>
      <div style={{ display: "flex", borderBottom: "0.5px solid var(--bdr)", background: "var(--elev)" }}>
        <div style={{ width: nameWidth, flexShrink: 0, borderRight: "0.5px solid var(--bdr)" }} />
        <div style={{ flex: 1, position: "relative", height: WAVE_AXIS_HEIGHT }}>
          {ticks.map((tick, index) => (
            <span key={tick.key} style={{ position: "absolute", left: `${tick.left}%`, top: "50%", transform: "translateY(-50%)", paddingLeft: 4, fontSize: 9, fontWeight: index === ticks.length - 1 ? 750 : 600, color: index === ticks.length - 1 ? "#9b7cf7" : "var(--t4)", whiteSpace: "nowrap" }}>
              {tick.label}{index === ticks.length - 1 ? " ●" : ""}
            </span>
          ))}
        </div>
      </div>
      <div>
        {visible.map((event) => {
          const color = colorByKey.get(event.key) || "#7C3AED";
          const lastPoint = event.points.at(-1);
          const isActive = Boolean(recentCut && lastPoint && lastPoint.date >= recentCut);
          return (
            <div key={event.key} style={{ display: "flex", alignItems: "center", minHeight: WAVE_ROW_HEIGHT, borderBottom: "0.5px solid var(--bdrs)", cursor: "pointer", background: isActive ? "rgba(124,58,237,.04)" : undefined }} onClick={() => nav("lo-trinh-dan-song")}>
              <div style={{ width: nameWidth, flexShrink: 0, fontSize: 10, fontWeight: event.isCore ? 750 : 550, padding: "0 8px", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", borderRight: "0.5px solid var(--bdr)", color: event.isCore ? "#F59E0B" : "var(--t2)" }} title={event.name}>{event.name}</div>
              <div style={{ flex: 1, position: "relative", height: WAVE_ROW_HEIGHT, minWidth: 0 }}>
                {ticks.map((tick) => <span key={tick.key} style={{ position: "absolute", top: 0, bottom: 0, left: `${tick.left}%`, width: 1, background: "var(--bdr)", opacity: 0.4 }} />)}
                {event.points.map((point) => {
                  const left = ((new Date(point.date).getTime() - start) / span) * WAVE_PLOT_RIGHT;
                  const isPeak = point.value >= 100;
                  const isLast = point === lastPoint;
                  const size = isPeak ? 13 : isLast && isActive ? 10 : 8;
                  return (
                    <span
                      key={point.date}
                      title={`${event.name} · ${fmtFull(point.date)} · ${point.value.toFixed(1)}%${isPeak ? " ★" : ""}`}
                      style={{ position: "absolute", left: `${Math.max(2, Math.min(WAVE_PLOT_RIGHT, left))}%`, top: "50%", transform: "translate(-50%,-50%)", width: size, height: size, borderRadius: 999, background: color, border: "1.5px solid rgba(0,0,0,.2)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isLast && isActive ? `0 0 0 2px ${color}35` : undefined, zIndex: isPeak ? 2 : 1 }}
                    >
                      {isPeak && <span style={{ fontSize: 6, color: "#fff", lineHeight: 1 }}>★</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
        {!visible.length && <EmptyHint />}
      </div>
      <div style={{ padding: "6px 14px", borderTop: "0.5px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <LegendText color="#0ca30c" label=">=100%" />
          <LegendText color="#1baf7a" label="70-99%" />
          <span style={{ fontSize: 9, color: "var(--t3)" }}>★ đỉnh sóng · hover = SMDT</span>
        </div>
        <Pagination compact page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>
    </Card>
  );
}

function SmdtBarCell({ value, max }) {
  if (!Number.isFinite(value)) return <span style={{ color: "var(--t4)" }}>—</span>;
  const color = smdtColor(value);
  const pct = max ? Math.round(Math.max(2, Math.min(100, (value / max) * 100))) : 0;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 36, height: 4, background: "var(--elev)", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
        <span style={{ display: "block", width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </span>
      <span style={{ fontSize: 10, fontWeight: 750, color, minWidth: 32, ...mono }}>{value.toFixed(1)}</span>
    </span>
  );
}

function PnlCell({ price, ave }) {
  if (!Number.isFinite(price) || !Number.isFinite(ave) || !ave) return <span style={{ color: "var(--t3)", fontSize: 10 }}>—</span>;
  const pct = ((price - ave) / ave) * 100;
  const color = pct >= 0 ? "#0ca30c" : "#e34948";
  return <span style={{ fontSize: 11, fontWeight: 650, color, ...mono }}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</span>;
}

function SignalPortfolio({ rows, date, live }) {
  const [tab, setTab] = useState("MUA");
  const [page, setPage] = useState(1);
  const buyRows = useMemo(() => rows.filter((row) => row.signal === "MUA" && toNumber(row.weight ?? row.hold) > 0), [rows]);
  const sellRows = useMemo(() => rows.filter((row) => row.signal === "BAN"), [rows]);
  const tabRows = tab === "MUA" ? buyRows : sellRows;
  const totalPages = Math.max(1, Math.ceil(tabRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = tabRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const smdtMax = Math.max(1, ...tabRows.map((row) => (Number.isFinite(row.smdt) ? row.smdt : 0)));

  const switchTab = (value) => {
    setTab(value);
    setPage(1);
  };

  return (
    <Card noPad style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 750, color: "var(--t1)" }}>Danh mục đầu tư giả lập</span>
          <span style={{ fontSize: 10, color: "var(--t3)", marginLeft: 8 }}>{date ? fmtFull(date) : "—"} · <span style={{ color: live ? "#0ca30c" : "var(--t4)" }}>● {live ? "Live" : "Cached"}</span></span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <ChipButton active={tab === "MUA"} tone="G" onClick={() => switchTab("MUA")}>Mua <span style={{ marginLeft: 3, ...mono }}>{buyRows.length}</span></ChipButton>
          <ChipButton active={tab === "BAN"} tone="R" onClick={() => switchTab("BAN")}>Bán <span style={{ marginLeft: 3, ...mono }}>{sellRows.length}</span></ChipButton>
          <Clink onClick={() => nav("top-ma-manh")}>Xem tất cả ›</Clink>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 440 }}>
          <thead>
            <tr style={{ background: "var(--elev)" }}>
              {["Mã", "DT cổ phiếu", "SMDT mã", "Giá", "Giá vốn", "Lãi / Lỗ"].map((h, i) => (
                <th key={h} style={{ padding: i === 0 ? "5px 10px" : i === 1 ? "5px 4px" : "5px 8px", width: i === 1 ? 78 : undefined, fontSize: 9, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", borderBottom: "0.5px solid var(--bdr)", textAlign: i >= 3 ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={`${row.ticker}-${row.date}`} style={{ borderBottom: "0.5px solid var(--bdrs)" }}>
                <td style={{ padding: "6px 10px", fontWeight: 800, color: "var(--t1)" }}>{row.ticker}</td>
                <td style={{ padding: "6px 4px" }}><SignalPill compact sig={row.cashSig || signalToSig(row.signal)} /></td>
                <td style={{ padding: "6px 8px" }}><SmdtBarCell value={row.smdt} max={smdtMax} /></td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 650, color: "var(--t1)", ...mono }}>{Number.isFinite(row.price) ? fmtNum(row.price) : "—"}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--t2)", ...mono }}>{Number.isFinite(row.ave) ? fmtNum(row.ave) : "—"}</td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}><PnlCell price={row.price} ave={row.ave} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <EmptyHint>Chưa có tín hiệu {tab === "MUA" ? "mua" : "bán"}.</EmptyHint>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 14px", borderTop: "0.5px solid var(--bdr)", marginTop: "auto", gap: 8 }}>
        <span style={{ fontSize: 10, color: "var(--t3)" }}>{tabRows.length ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, tabRows.length)} / ${tabRows.length} mã` : "0 mã"}</span>
        <Pagination compact page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>
    </Card>
  );
}

const LOG_TONES = {
  mua: { color: "#0ca30c", bg: "rgba(12,163,12,.12)", icon: "ti-trending-up" },
  ban: { color: "#e34948", bg: "rgba(227,73,72,.12)", icon: "ti-trending-down" },
  smdt: { color: "#9b7cf7", bg: "rgba(124,58,237,.12)", icon: "ti-bolt" },
  dv: { color: "#0ca30c", bg: "rgba(12,163,12,.12)", icon: "ti-trending-up" },
  nn: { color: "#1baf7a", bg: "rgba(27,175,122,.12)", icon: "ti-trending-up" },
  dt: { color: "#eda100", bg: "rgba(237,161,0,.12)", icon: "ti-trending-down" },
  tr: { color: "#e34948", bg: "rgba(227,73,72,.12)", icon: "ti-trending-down" },
  song: { color: "#06B6D4", bg: "rgba(6,182,212,.12)", icon: "ti-wave-sine" },
};

function logToneForSig(sig) {
  return { si: "dv", sn: "nn", so: "dt", st: "tr" }[sig] || "tr";
}

function SignalLog({ topRows, branchRows, stockSignalRows, waveRows }) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const logs = useMemo(() => {
    const items = [];
    for (const row of stockSignalRows.slice(0, 14)) {
      items.push({ kind: "ma", type: row.signal === "MUA" ? "mua" : "ban", time: row.date ? fmtFull(row.date) : "Live", title: row.ticker, tag: row.signal === "MUA" ? "MUA" : "BÁN", sub: `${row.signal === "MUA" ? "Tín hiệu mua" : "Tín hiệu bán"}${row.percent != null ? ` ${row.percent}%` : ""}${Number.isFinite(row.price) ? ` · Giá ${fmtNum(row.price)}` : ""}` });
    }
    for (const row of topRows.slice(0, 8)) {
      items.push({ kind: "ma", type: "smdt", time: "SMDT", title: row.ticker, tag: "SMDT", sub: `${row.industry} · SMDT đạt ${row.smdt.toFixed(1)}% · ${sigLabel(row.sig)}` });
    }
    for (const row of branchRows.slice(0, 8)) {
      items.push({ kind: "ng", type: logToneForSig(row.sig), time: "Ngành", title: row.label, tag: sigLabel(row.sig), sub: `Dòng tiền ngành đang ở trạng thái ${sigLabel(row.sig).toLowerCase()}` });
    }
    for (const row of [...waveRows].slice(-2).reverse()) {
      items.push({
        kind: "tt",
        type: "song",
        time: row.date ? fmtFull(row.date) : "—",
        title: "Thị trường",
        tag: "Dò sóng",
        sub: `${fmtNum(row.total ?? (row.waitbuy || 0) + (row.buy || 0) + (row.waitsell || 0) + (row.sell || 0))} mã · Chờ mua ${fmtNum(row.waitbuy || 0)} · Mua ${fmtNum(row.buy || 0)} · Chờ bán ${fmtNum(row.waitsell || 0)} · Bán ${fmtNum(row.sell || 0)}${Number.isFinite(row.reliability) ? ` · Tin cậy ${fmtNum(row.reliability)}%` : ""}`,
      });
    }
    return items.filter((item) => filter === "all" || item.kind === filter);
  }, [branchRows, filter, stockSignalRows, topRows, waveRows]);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = logs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const switchFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  return (
    <Card noPad style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--bdr)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 750, color: "var(--t1)" }}>Nhật ký tín hiệu</span>
          <span style={{ fontSize: 10, color: "var(--t3)", marginLeft: 8 }}>Sóng thị trường · Ngành · Mã</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <ChipButton active={filter === "all"} onClick={() => switchFilter("all")}>Tất cả</ChipButton>
          <ChipButton active={filter === "ma"} onClick={() => switchFilter("ma")}>Mã</ChipButton>
          <ChipButton active={filter === "ng"} onClick={() => switchFilter("ng")}>Ngành</ChipButton>
          <ChipButton active={filter === "tt"} onClick={() => switchFilter("tt")}>Thị trường</ChipButton>
        </div>
      </div>
      <div>
        {visible.map((item, index) => {
          const tone = LOG_TONES[item.type] || LOG_TONES.tr;
          return (
            <div key={`${item.title}-${item.tag}-${index}`} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 14px", borderBottom: "0.5px solid var(--bdrs)" }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, background: tone.bg, color: tone.color }}>
                <i className={`ti ${item.kind === "ng" ? "ti-building-community" : tone.icon}`} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 650, color: "var(--t1)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {item.title}
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 3, whiteSpace: "nowrap", color: tone.color, background: tone.bg, border: `0.5px solid ${tone.color}33` }}>{item.tag}</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2, lineHeight: 1.5 }}>{item.sub}</div>
              </div>
              <div style={{ fontSize: 10, color: "var(--t4)", whiteSpace: "nowrap" }}>{item.time}</div>
            </div>
          );
        })}
        {!visible.length && <EmptyHint />}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 14px", borderTop: "0.5px solid var(--bdr)", marginTop: "auto", gap: 8 }}>
        <span style={{ fontSize: 10, color: "var(--t3)" }}>{logs.length ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, logs.length)} / ${logs.length} tín hiệu` : "0 tín hiệu"}</span>
        <Pagination compact page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>
    </Card>
  );
}

export function ModDashboard() {
  const narrow = useNarrow();
  const smdt = useSMDT();
  const cashBranch = useCashFlowBranch();
  const smdtTicker = useSMDTTicker();
  const cashTicker = useCashFlowTicker();
  const branchPath = useBranchPath();
  const branchCross = useSMDTBranchCross();
  const stockSignal = useStockSignal();
  const stockWave = useStockWave();
  const totalTrade = useTotalTrade();

  const liveSmdtBranch = useRealtimeSMDTBranchFeed(smdt.applyTick);
  const liveCashBranch = useRealtimeCashFlowFeed(cashBranch.applyTick);
  const liveSmdtTicker = useRealtimeSMDTTickerFeed(smdtTicker.applyTick);
  const liveCashTicker = useRealtimeCashFlowTickerFeed(cashTicker.applyTick);
  const liveStockWave = useRealtimeStockWaveFeed(stockWave.applyTick);

  const smdtBranchDate = topDate(smdt.datesAsc);
  const cashBranchDate = topDate(cashBranch.datesAsc);
  const cashBranchDatesDesc = useMemo(() => sortDatesDesc(cashBranch.datesAsc), [cashBranch.datesAsc]);
  const smdtTickerDate = topDate(smdtTicker.datesAsc);
  const updatedAt = latestUpdatedAt(smdt.updatedAt, cashBranch.updatedAt, smdtTicker.updatedAt, cashTicker.updatedAt, stockSignal.updatedAt, stockWave.updatedAt, branchCross.updatedAt, totalTrade.updatedAt);
  const live = liveSmdtBranch.connected || liveCashBranch.connected || liveSmdtTicker.connected || liveCashTicker.connected || liveStockWave.connected;
  const waveLatest = stockWave.rows[stockWave.rows.length - 1] || null;

  const branchSmdtRows = useMemo(() => {
    return smdt.branches
      .map((branch) => ({ key: branch.key, name: branch.label, label: branch.label, isCore: branch.isCore || CORE_KEYS.has(branch.key), value: smdt.matrix[branch.key]?.[smdtBranchDate] }))
      .filter((row) => Number.isFinite(row.value))
      .sort((a, b) => b.value - a.value);
  }, [smdt.branches, smdt.matrix, smdtBranchDate]);

  const branchCashRows = useMemo(() => {
    return cashBranch.branches
      .map((branch) => ({
        key: branch.key,
        label: branch.label,
        isCore: Boolean(branch.isCore),
        sig: contentToSig(findLatestValueAtOrBefore(cashBranch.matrix[branch.key], cashBranchDatesDesc, toDateInputValue(cashBranchDate))),
      }))
      .sort((a, b) => {
        const ai = a.sig ? SIG_ORDER.indexOf(a.sig) : SIG_ORDER.length;
        const bi = b.sig ? SIG_ORDER.indexOf(b.sig) : SIG_ORDER.length;
        return ai - bi || a.label.localeCompare(b.label, "vi");
      });
  }, [cashBranch.branches, cashBranch.matrix, cashBranchDate, cashBranchDatesDesc]);

  const branchCashByLabel = useMemo(() => {
    const map = new Map();
    for (const row of branchCashRows) {
      if (!row.sig) continue;
      setIndustryLookup(map, row.key, row.sig);
      setIndustryLookup(map, row.label, row.sig);
    }
    return map;
  }, [branchCashRows]);

  const branchSmdtByLabel = useMemo(() => {
    const map = new Map();
    for (const row of branchSmdtRows) {
      setIndustryLookup(map, row.key, row.value);
      setIndustryLookup(map, row.label, row.value);
    }
    return map;
  }, [branchSmdtRows]);

  const activeCashTickerDate = useMemo(() => {
    const datesDesc = sortDatesDesc(cashTicker.buckets.map((bucket) => bucket.date));
    const index = findDateIndex(datesDesc, toDateInputValue(smdtTickerDate));
    return index >= 0 ? datesDesc[index] : cashTicker.latest?.date || "";
  }, [cashTicker.buckets, cashTicker.latest?.date, smdtTickerDate]);

  const activeCashBucket = useMemo(
    () => findBucketByDate(cashTicker.buckets, activeCashTickerDate) || cashTicker.latest,
    [activeCashTickerDate, cashTicker.buckets, cashTicker.latest]
  );

  const cashTickerRows = activeCashBucket?.rows || [];
  const cashByTicker = useMemo(() => new Map(cashTickerRows.map((row) => [row.ticker, row])), [cashTickerRows]);
  const cashTickerPool = useMemo(() => {
    const seen = new Map();
    for (const ticker of cashTicker.allowedTickers || []) {
      const industry = branchPath.tickerToBranch[ticker];
      if (!industry || seen.has(ticker)) continue;
      seen.set(ticker, { ticker, industry });
    }
    return [...seen.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [branchPath.tickerToBranch, cashTicker.allowedTickers]);
  const smdtTickerPool = useMemo(() => {
    return smdtTicker.tickers
      .flatMap((tk) => {
        const industry = branchPath.tickerToBranch[tk.key];
        return industry ? [{ ...tk, industry }] : [];
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [branchPath.tickerToBranch, smdtTicker.tickers]);

  const cashTickerCounts = useMemo(() => {
    const byGroup = {
      core: { si: 0, sn: 0, so: 0, st: 0 },
      other: { si: 0, sn: 0, so: 0, st: 0 },
      all: { si: 0, sn: 0, so: 0, st: 0 },
    };
    for (const item of cashTickerPool) {
      const sig = tickerContentToSig(cashByTicker.get(item.ticker)?.content || "");
      if (!sig) continue;
      const group = isCashFlowCoreIndustry(item.industry) ? "core" : "other";
      byGroup[group][sig] += 1;
      byGroup.all[sig] += 1;
    }
    return byGroup;
  }, [cashByTicker, cashTickerPool]);

  const branchCashCounts = useMemo(() => {
    const counts = {
      core: { si: 0, sn: 0, so: 0, st: 0 },
      other: { si: 0, sn: 0, so: 0, st: 0 },
      all: { si: 0, sn: 0, so: 0, st: 0 },
    };
    for (const row of branchCashRows) {
      if (!row.sig) continue;
      const group = row.isCore ? "core" : "other";
      counts[group][row.sig] += 1;
      counts.all[row.sig] += 1;
    }
    return counts;
  }, [branchCashRows]);

  const stockSignalByTicker = useMemo(() => new Map(stockSignal.rows.map((row) => [row.ticker, row])), [stockSignal.rows]);
  const smdtTickerDatesDesc = useMemo(() => sortDatesDesc(smdtTicker.datesAsc), [smdtTicker.datesAsc]);
  const smdtTickerDateIndex = useMemo(() => findDateIndex(smdtTickerDatesDesc, toDateInputValue(smdtTickerDate)), [smdtTickerDate, smdtTickerDatesDesc]);
  const prevSmdtTickerDate = smdtTickerDateIndex >= 0 ? smdtTickerDatesDesc[smdtTickerDateIndex + 1] || "" : "";
  const prev2SmdtTickerDate = smdtTickerDateIndex >= 0 ? smdtTickerDatesDesc[smdtTickerDateIndex + 2] || "" : "";

  const allTopTickers = useMemo(() => {
    const rows = smdtTickerPool.flatMap((tk) => {
      const smdtValue = smdtTicker.matrix[tk.key]?.[smdtTickerDate];
      if (!Number.isFinite(smdtValue)) return [];
      const cash = cashByTicker.get(tk.key);
      const industry = tk.industry;
      const branchSmdt = lookupIndustryValue(branchSmdtByLabel, industry);
      const tickerSig = tickerContentToSig(cash?.content || "");
      const branchSig = lookupIndustryValue(branchCashByLabel, industry);
      const signal = stockSignalByTicker.get(tk.key);
      const trade = getLatestTrade(totalTrade, tk.key);
      const prevSmdt = smdtTicker.matrix[tk.key]?.[prevSmdtTickerDate];
      const prev2Smdt = smdtTicker.matrix[tk.key]?.[prev2SmdtTickerDate];
      const momentum = Number.isFinite(prevSmdt) ? smdtValue - prevSmdt : 0;
      const status = classifyStrongTicker(smdtValue, prevSmdt, prev2Smdt, tickerSig, branchSmdt, branchSig);
      return [{
        ticker: tk.key,
        name: tk.name || tk.key,
        industry,
        smdt: smdtValue,
        prevSmdt,
        prev2Smdt,
        momentum,
        branchSmdt,
        sig: tickerSig,
        tickerSig,
        branchSig,
        status,
        price: cash?.price || trade?.price || signal?.price,
        score: smdtValue + (Number.isFinite(branchSmdt) ? branchSmdt * 0.22 : 0) + sigWeight(tickerSig) * 8 + sigWeight(branchSig) * 4 + Math.max(-12, Math.min(18, momentum * 0.7)),
      }];
    });
    return rows.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [branchCashByLabel, branchSmdtByLabel, cashByTicker, prev2SmdtTickerDate, prevSmdtTickerDate, smdtTicker.matrix, smdtTickerDate, smdtTickerPool, stockSignalByTicker, totalTrade]);

  const rankedTopTickers = useMemo(() => {
    return [...allTopTickers].sort((a, b) => b.score - a.score || b.smdt - a.smdt);
  }, [allTopTickers]);

  const rankedStrongTickers = useMemo(() => {
    return rankedTopTickers.filter((row) => row.status);
  }, [rankedTopTickers]);

  const stockSignalRows = useMemo(() => {
    return stockSignal.rows.map((row) => {
      const smdtValue = smdtTicker.matrix[row.ticker]?.[smdtTickerDate];
      const cash = cashByTicker.get(row.ticker);
      return {
        ...row,
        smdt: Number.isFinite(smdtValue) ? smdtValue : row.smdt,
        cashSig: tickerContentToSig(cash?.content || ""),
      };
    }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [cashByTicker, smdtTicker.matrix, smdtTickerDate, stockSignal.rows]);

  const waveWindowDates = useMemo(() => {
    const lastDate = branchCross.datesAsc.at(-1);
    if (!lastDate) return [];
    const yearStart = `${lastDate.slice(0, 4)}-01-01`;
    return branchCross.datesAsc.filter((date) => date >= yearStart);
  }, [branchCross.datesAsc]);

  const waveEvents = useMemo(() => {
    const windowStart = waveWindowDates[0] || "";
    return branchCross.branches.map((branch) => {
      const row = branchCross.matrix[branch.key] || {};
      const points = Object.keys(row)
        .filter((date) => date >= windowStart)
        .sort()
        .map((date) => ({ date, value: toNumber(row[date]) }))
        .filter((point) => Number.isFinite(point.value));
      return { key: branch.key, name: branch.label, isCore: branch.isCore || CORE_KEYS.has(branch.key), points, peak: Math.max(0, ...points.map((p) => p.value)) };
    }).sort((a, b) => b.peak - a.peak);
  }, [branchCross.branches, branchCross.matrix, waveWindowDates]);

  const marketWaveItems = useMemo(() => {
    if (!waveLatest) return [];
    return [
      { value: waveLatest.waitbuy || 0, color: DONUT_COLORS.waitBuy },
      { value: waveLatest.buy || 0, color: DONUT_COLORS.buy },
      { value: waveLatest.waitsell || 0, color: DONUT_COLORS.waitSell },
      { value: waveLatest.sell || 0, color: DONUT_COLORS.sell },
    ];
  }, [waveLatest]);
  const waveTotal = waveLatest?.total ?? marketWaveItems.reduce((sum, item) => sum + item.value, 0);

  const smdtBranchCore = branchSmdtRows.filter((row) => row.isCore).slice(0, 7);
  const smdtBranchOther = branchSmdtRows.filter((row) => !row.isCore).slice(0, 7);
  const tickerRows = rankedTopTickers.slice(0, TOP_LIMIT).map((row) => ({ key: row.ticker, name: row.ticker, value: row.smdt, isCore: isCoreBranchName(row.industry) }));
  const tickerCoreRows = tickerRows.filter((row) => row.isCore).slice(0, 10);
  const tickerOtherRows = tickerRows.filter((row) => !row.isCore).slice(0, 10);
  const signalLatestDate = stockSignalRows.find((row) => row.date)?.date || activeCashTickerDate;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 14 }}>
        <DashboardCard onClick={() => nav("do-song")}>
          <DashHeader title="Dò sóng" meta={waveLatest ? `${fmtNum(waveTotal)} mã · ${Number.isFinite(waveLatest.reliability) ? `${fmtNum(waveLatest.reliability)}%` : "—"}` : "Đang tải..."} action="Chi tiết ›" onClick={() => nav("do-song")} />
          <Donut items={marketWaveItems} />
          <DotLegend items={[
            { label: "Chờ mua", color: DONUT_COLORS.waitBuy },
            { label: "Mua", color: DONUT_COLORS.buy },
            { label: "Chờ bán", color: DONUT_COLORS.waitSell },
            { label: "Bán", color: DONUT_COLORS.sell },
          ]} />
        </DashboardCard>

        <DashboardCard onClick={() => nav("dong-tien-nganh")}>
          <DashHeader title="Dòng tiền ngành" meta={`${fmtNum(branchCashRows.length)} ngành${cashBranchDate ? ` · ${fmtFull(cashBranchDate)}` : ""}`} action="Chi tiết ›" onClick={() => nav("dong-tien-nganh")} />
          <SplitDonuts
            leftTitle="Chủ lực"
            rightTitle="Ngành phụ"
            leftItems={SIG_ORDER.map((sig) => ({ value: branchCashCounts.core[sig], color: DONUT_COLORS[sig] }))}
            rightItems={SIG_ORDER.map((sig) => ({ value: branchCashCounts.other[sig], color: DONUT_COLORS[sig] }))}
          />
          <DotLegend square items={[
            { label: "Nhen nhóm", color: DONUT_COLORS.sn },
            { label: "Đổ vào", color: DONUT_COLORS.si },
            { label: "Đang thoát", color: DONUT_COLORS.so },
            { label: "Thoát ra", color: DONUT_COLORS.st },
          ]} />
        </DashboardCard>

        <DashboardCard onClick={() => nav("dong-tien-cp")}>
          <DashHeader title="Dòng tiền cổ phiếu" meta={`${fmtNum(cashTickerPool.length)} mã${activeCashTickerDate ? ` · ${fmtFull(activeCashTickerDate)}` : ""}`} action="Chi tiết ›" onClick={() => nav("dong-tien-cp")} />
          <SplitDonuts
            leftTitle="Chủ lực"
            rightTitle="Phụ"
            leftItems={SIG_ORDER.map((sig) => ({ value: cashTickerCounts.core[sig], color: DONUT_COLORS[sig] }))}
            rightItems={SIG_ORDER.map((sig) => ({ value: cashTickerCounts.other[sig], color: DONUT_COLORS[sig] }))}
          />
          <DotLegend square items={[
            { label: "Nhen nhóm", color: DONUT_COLORS.sn },
            { label: "Đổ vào", color: DONUT_COLORS.si },
            { label: "Đang thoát", color: DONUT_COLORS.so },
            { label: "Thoát ra", color: DONUT_COLORS.st },
          ]} />
        </DashboardCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 14 }}>
        <SmdtPreview
          title="SMDT ngành"
          meta={`${fmtNum(branchSmdtRows.length)} ngành${smdtBranchDate ? ` · ${fmtFull(smdtBranchDate)}` : ""}`}
          leftTitle="Chủ lực · top"
          rightTitle="Ngành phụ · top"
          leftRows={smdtBranchCore}
          rightRows={smdtBranchOther}
          navId="smdt-nganh"
        />
        <SmdtPreview
          title="SMDT cổ phiếu"
          meta={`${fmtNum(smdtTickerPool.length)} mã${smdtTickerDate ? ` · ${fmtFull(smdtTickerDate)}` : ""}`}
          leftTitle="Chủ lực · top"
          rightTitle="Ngành phụ · top"
          leftRows={tickerCoreRows}
          rightRows={tickerOtherRows}
          ticker
          navId="smdt-ma"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 14 }}>
        <TopStrongTable rows={rankedStrongTickers} date={smdtTickerDate} narrow={narrow} />
        <PortfolioBox rows={rankedTopTickers} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "55fr 45fr", gap: 14 }}>
        <WaveTimeline events={waveEvents} recentDates={waveWindowDates} narrow={narrow} />
        <SignalPortfolio rows={stockSignalRows} date={signalLatestDate} live={live} />
      </div>

      <SignalLog topRows={rankedTopTickers} branchRows={branchCashRows} stockSignalRows={stockSignalRows} waveRows={stockWave.rows} />

      <LiveFooter live={live} updatedAt={updatedAt} extra="Dashboard tổng hợp" />
    </div>
  );
}
