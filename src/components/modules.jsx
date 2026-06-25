import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../theme";
import { mono, valToHmCls } from "../styles/tokens";
import { useSMDT, useRealtimeFeed } from "../data/useSMDT";
import { useCashFlowBranch, useRealtimeCashFlowFeed, contentToSig } from "../data/useCashFlowBranch";
import { useStockWave, useRealtimeStockWaveFeed } from "../data/useStockWave";
import {
  Card, CardHeader, Clink, FilterChips, SearchBox, TableWrap, THead, Pagination,
  StatCard, DistRow, HM, Sig, Tag, arcPath, AIPanel, Banner, LiveFooter,
} from "./ui";

/* ─────────────────────────── MODULE REGISTRY ───────────────────────────
 * Mỗi module: tiêu đề + phụ đề cho topbar, render qua <ModuleView>.
 * Dữ liệu thật: "smdt-nganh" (useSMDT) và "stock-wave"/Sóng cổ phiếu (useStockWave).
 * Các module còn lại dùng dữ liệu mẫu theo bản thiết kế tham khảo.
 * ─────────────────────────────────────────────────────────────────────── */
export const MODULES = {
  "dashboard":       { title: "Dashboard",          sub: "Tổng quan thị trường hôm nay" },
  "dong-tien-tt":    { title: "Thị trường",          sub: "Tổng hợp GTGD · Khối ngoại · Tự doanh" },
  "dong-tien-nganh": { title: "Dòng tiền ngành",     sub: "Chủ lực 6 ngành — theo dõi vào/ra theo ngày" },
  "smdt-nganh":      { title: "SMDT ngành",          sub: "Sức mạnh dòng tiền theo ngành · Heatmap" },
  "dong-tien-cp":    { title: "Dòng tiền cổ phiếu",  sub: "Tín hiệu từng mã — theo dõi nhiều phiên" },
  "smdt-ma":         { title: "SMDT mã",             sub: "Ngân hàng — SMDT từng mã theo ngày" },
  "top-manh":        { title: "Top cổ phiếu mạnh",   sub: "SMDT mã ≥ 70%" },
  "stock-wave":      { title: "Sóng cổ phiếu",       sub: "Dữ liệu thật từ getStockWave · realtime" },
  "do-song":         { title: "Sóng cổ phiếu",       sub: "Dữ liệu thật từ getStockWave · realtime" },
};

export function ModuleView({ id }) {
  switch (id) {
    case "dashboard":       return <ModDashboard />;
    case "stock-wave":
    case "do-song":         return <ModDoSong />;
    case "smdt-nganh":      return <ModSMDTNganh />;
    case "dong-tien-nganh": return <ModDongTienNganh />;
    case "dong-tien-cp":    return <ModDongTienCP />;
    case "smdt-ma":         return <ModSMDTMa />;
    case "top-manh":        return <ModTopManh />;
    case "dong-tien-tt":    return <ModDongTienTT />;
    default:                return <ModDashboard />;
  }
}

/* ─────────────────────────── HELPERS ─────────────────────────────────── */
const fmtDay = (iso) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
const fmtFull = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const fmtNum = (v) => new Intl.NumberFormat("vi-VN").format(v || 0);
const pct = (part, total) => (total ? (part / total) * 100 : 0);
const SESSION_OPTIONS = [10, 25, 50];

const signed = (value, suffix = "") => {
  const n = Number(value) || 0;
  if (n === 0) return `0${suffix}`;
  return `${n > 0 ? "+" : ""}${fmtNum(n)}${suffix}`;
};

/* Thu hẹp lưới khi màn hình nhỏ (mobile/tablet). */
function useNarrow() {
  const [narrow, setNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 980 : false));
  useEffect(() => {
    const h = () => setNarrow(window.innerWidth < 980);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return narrow;
}

/* ─────────────────────────── DÒ SÓNG DONUT ─────────────────────────────── */
function WaveDonut({ row, size = 140, sw = 20, fontSize = 28 }) {
  const { t } = useTheme();
  const r = size / 2 - sw / 2 - 2;
  const c = size / 2;
  const segs = [
    [row.waitbuy, t.G],
    [row.buy, t.MU],
    [row.waitsell, t.A],
    [row.sell, t.R],
  ];
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bdr)" strokeWidth={sw} />
      {segs.map(([v, color], i) => {
        const p = pct(v, row.total);
        const node = arcPath(c, c, r, sw, p, color, off, `seg-${i}`);
        off += p;
        return node;
      })}
      <text x={c} y={c + fontSize * 0.18} textAnchor="middle" fill={t.t1} fontSize={fontSize} fontWeight="800" fontFamily="system-ui">
        {fmtNum(row.total)}
      </text>
    </svg>
  );
}

/* ─────────────────────────── HIST NAVIGATOR (dò sóng) ───────────────────── */
function HistDonut({ row, active }) {
  const { t } = useTheme();
  const tc = row.reliability;
  const tcColor = tc >= 70 ? t.G : tc >= 55 ? t.MU : t.t4;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        background: active ? t.Bs : "var(--elev)",
        border: `0.5px solid ${active ? t.Bb : "var(--bdr)"}`,
        borderRadius: 10,
        padding: "12px 8px",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t3)", textAlign: "center", lineHeight: 1.4 }}>
        {fmtDay(row.date)}
        {active && <span style={{ fontSize: 8, background: t.Bs, color: t.B, borderRadius: 3, padding: "1px 5px", marginLeft: 4 }}>Mới nhất</span>}
      </div>
      <WaveDonut row={row} size={90} sw={13} fontSize={16} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 8px", width: "100%" }}>
        {[[row.waitbuy, t.G, "C.MUA"], [row.buy, t.MU, "MUA"], [row.waitsell, t.A, "C.BÁN"], [row.sell, t.R, "BÁN"]].map(([v, c, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: c, lineHeight: 1.3, ...mono }}>{fmtNum(v)}</div>
            <div style={{ fontSize: 9, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".03em" }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", marginTop: 4 }}>
        <span style={{ fontSize: 9, color: "var(--t4)" }}>TC</span>
        <div style={{ flex: 1, height: 3, background: "var(--bdr)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${tc}%`, background: tcColor, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: tcColor, ...mono }}>{tc.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function HistNavigator({ rowsDesc }) {
  const [off, setOff] = useState(0);
  const PER = 3;
  const slice = rowsDesc.slice(off, off + PER);
  return (
    <Card>
      <CardHeader
        icon="ti-clock"
        title="Lịch sử dò sóng"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <NavBtn icon="ti-chevron-left" disabled={off === 0} onClick={() => setOff((o) => Math.max(0, o - PER))} />
            <span style={{ fontSize: 11, color: "var(--t4)" }}>{off + 1}–{off + slice.length}/{rowsDesc.length}</span>
            <NavBtn icon="ti-chevron-right" disabled={off + PER >= rowsDesc.length} onClick={() => setOff((o) => Math.min(Math.max(0, rowsDesc.length - PER), o + PER))} />
          </div>
        }
      />
      <div style={{ display: "flex", gap: 10 }}>
        {slice.map((row, i) => <HistDonut key={row.date} row={row} active={off === 0 && i === 0} />)}
      </div>
    </Card>
  );
}

function NavBtn({ icon, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 30, height: 30, borderRadius: 7, background: "var(--elev)", border: "0.5px solid var(--bdr)",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer",
        color: "var(--t2)", opacity: disabled ? 0.3 : 1, fontSize: 14, fontFamily: "inherit",
      }}
    >
      <i className={`ti ${icon}`} />
    </button>
  );
}

function WaveMetric({ label, value, sub, color }) {
  return (
    <div style={{ background: "var(--elev)", border: "0.5px solid var(--bdr)", borderRadius: 10, padding: "11px 13px" }}>
      <div style={{ fontSize: 10, color: "var(--t4)", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 800, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color, ...mono }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6, ...mono }}>{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════ AI ADVISOR / DÒ SÓNG (REAL) ═════════════════ */
function ModDoSong() {
  const { t } = useTheme();
  const { name, rows, status, error, updatedAt, refresh, applyTick } = useStockWave();
  const { connected: live } = useRealtimeStockWaveFeed(applyTick);

  const rowsDesc = useMemo(() => [...rows].reverse(), [rows]);
  const latest = rowsDesc[0] || null;
  const prev = rowsDesc[1] || null;

  const [page, setPage] = useState(1);
  const PER = 12;
  const totalPages = Math.max(1, Math.ceil(rowsDesc.length / PER));
  const safePage = Math.min(page, totalPages);
  const pageRows = rowsDesc.slice((safePage - 1) * PER, safePage * PER);

  if (status === "loading" && !latest) return <Banner>Đang tải dữ liệu dò sóng…</Banner>;
  if (status === "error" && !latest)
    return <Banner tone="error">Lỗi tải dữ liệu: {error} <button onClick={refresh} style={linkBtn}>Thử lại</button></Banner>;
  if (!latest) return <Banner>Chưa có dữ liệu dò sóng.</Banner>;

  const segs = [
    { key: "waitbuy", lbl: "Chờ mua", val: latest.waitbuy, prev: prev?.waitbuy, c: t.G, bg: t.Gs, bdr: t.Gb },
    { key: "buy", lbl: "Mua", val: latest.buy, prev: prev?.buy, c: t.MU, bg: t.MUs, bdr: t.MUb },
    { key: "waitsell", lbl: "Chờ bán", val: latest.waitsell, prev: prev?.waitsell, c: t.A, bg: t.As, bdr: t.Ab },
    { key: "sell", lbl: "Bán", val: latest.sell, prev: prev?.sell, c: t.R, bg: t.Rs, bdr: t.Rb },
  ];
  const dominant = segs.reduce((best, cur) => (cur.val > best.val ? cur : best), segs[0]);
  const buySide = latest.waitbuy + latest.buy;
  const sellSide = latest.waitsell + latest.sell;
  const buyPressure = pct(buySide - sellSide, latest.total);
  const totalDelta = prev ? latest.total - prev.total : 0;
  const reliabilityDelta = prev ? latest.reliability - prev.reliability : 0;
  const signalTone = buyPressure >= 15 ? t.G : buyPressure <= -15 ? t.R : t.A;
  const signalText = buyPressure >= 15 ? "Thiên mua" : buyPressure <= -15 ? "Thiên bán" : "Cân bằng";
  const tcColor = latest.reliability >= 70 ? t.G : latest.reliability >= 55 ? t.A : t.t3;

  const td = { padding: "9px 10px", borderBottom: "0.5px solid var(--bdrs)", whiteSpace: "nowrap" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        <Card>
          <CardHeader
            icon="ti-chart-donut"
            title="Sóng cổ phiếu hôm nay"
            meta={`· ${fmtFull(latest.date)} · ${name}`}
            right={
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: live ? t.Gs : "var(--elev)", border: `0.5px solid ${live ? t.Gb : "var(--bdr)"}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: live ? t.G : "var(--t3)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />{live ? "Realtime" : "Định kỳ"}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: latest.reliability >= 70 ? t.Gs : t.As, border: `0.5px solid ${latest.reliability >= 70 ? t.Gb : t.Ab}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 800, color: tcColor }}>
                  <i className="ti ti-shield-check" style={{ fontSize: 14 }} />{latest.reliability.toFixed(0)}%
                </span>
              </div>
            }
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, alignItems: "stretch" }}>
            <div style={{ background: "var(--elev)", border: "0.5px solid var(--bdr)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 240 }}>
              <WaveDonut row={latest} size={156} sw={20} fontSize={30} />
              <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 7, background: `${signalTone}20`, border: `0.5px solid ${signalTone}55`, color: signalTone, borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 800 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
                {signalText}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--t3)", textAlign: "center" }}>
                Nhóm lớn nhất: <span style={{ color: dominant.c, fontWeight: 700 }}>{dominant.lbl}</span> · {pct(dominant.val, latest.total).toFixed(1)}%
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
                <WaveMetric label="Tổng mã" value={fmtNum(latest.total)} sub={prev ? signed(totalDelta) : "Phiên mới nhất"} color="var(--t1)" />
                <WaveMetric label="Tin cậy" value={`${latest.reliability.toFixed(0)}%`} sub={prev ? signed(reliabilityDelta.toFixed(0), "%") : "Theo API"} color={tcColor} />
                <WaveMetric label="Áp lực mua" value={`${buyPressure.toFixed(1)}%`} sub={`${fmtNum(buySide)} / ${fmtNum(sellSide)}`} color={signalTone} />
                <WaveMetric label="Số phiên" value={fmtNum(rowsDesc.length)} sub={updatedAt ? updatedAt.toLocaleTimeString("vi-VN") : "Đang cập nhật"} color={t.P} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
                {segs.map((s) => {
                  const segmentPct = pct(s.val, latest.total);
                  const delta = s.prev == null ? 0 : s.val - s.prev;
                  return (
                    <div key={s.key} style={{ background: s.bg, border: `0.5px solid ${s.bdr}`, borderRadius: 10, padding: "11px 13px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: s.c }}>{s.lbl}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: delta >= 0 ? t.G : t.R, ...mono }}>{s.prev == null ? "—" : signed(delta)}</div>
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: s.c, ...mono }}>{fmtNum(s.val)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 999, background: "rgba(255,255,255,.10)", overflow: "hidden" }}>
                          <div style={{ width: `${Math.max(0, Math.min(100, segmentPct))}%`, height: "100%", background: s.c, borderRadius: 999 }} />
                        </div>
                        <span style={{ fontSize: 11, color: s.c, fontWeight: 800, ...mono }}>{segmentPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <HistNavigator rowsDesc={rowsDesc} />

        {/* Bảng lịch sử dò sóng (REAL) */}
        <Card noPad>
          <div style={{ padding: "15px 16px 0" }}>
            <CardHeader icon="ti-history" title="Lịch sử phiên" meta={`· ${rowsDesc.length} phiên`} mb={0} />
          </div>
          <TableWrap minWidth={620}>
            <THead cols={[{ label: "Ngày", pl: 16 }, { label: "Chờ mua", right: true }, { label: "Mua", right: true }, { label: "Chờ bán", right: true }, { label: "Bán", right: true }, { label: "Tổng", right: true }, { label: "Tin cậy", right: true }]} />
            <tbody>
              {pageRows.map((row) => {
                const rc = row.reliability >= 70 ? t.G : row.reliability >= 55 ? t.A : t.t3;
                return (
                  <tr key={row.date}>
                    <td style={{ ...td, paddingLeft: 16, color: "var(--t3)", fontWeight: 600 }}>{fmtDay(row.date)}</td>
                    <td style={{ ...td, textAlign: "right", color: t.G, fontWeight: 700, ...mono }}>{fmtNum(row.waitbuy)}</td>
                    <td style={{ ...td, textAlign: "right", color: t.MU, fontWeight: 700, ...mono }}>{fmtNum(row.buy)}</td>
                    <td style={{ ...td, textAlign: "right", color: t.A, fontWeight: 700, ...mono }}>{fmtNum(row.waitsell)}</td>
                    <td style={{ ...td, textAlign: "right", color: t.R, fontWeight: 700, ...mono }}>{fmtNum(row.sell)}</td>
                    <td style={{ ...td, textAlign: "right", color: "var(--t2)", ...mono }}>{fmtNum(row.total)}</td>
                    <td style={{ ...td, textAlign: "right", color: rc, fontWeight: 700, ...mono }}>{row.reliability.toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
          {totalPages > 1 && (
            <div style={{ padding: "12px 16px" }}>
              <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </Card>
        <LiveFooter live={live} updatedAt={updatedAt} extra={`${rowsDesc.length} phiên`} />
      </div>
    </div>
  );
}

/* ═══════════════════════════ SMDT NGÀNH (REAL) ═══════════════════════════ */
function ModSMDTNganh() {
  const { branches, datesAsc, matrix, status, error, updatedAt, refresh, applyTick } = useSMDT();
  const { connected: live } = useRealtimeFeed(applyTick);

  const [tab, setTab] = useState("core");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sessions, setSessions] = useState(25);

  const coreCount = branches.filter((b) => b.isCore).length;
  const subCount = branches.length - coreCount;

  const visibleBranches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return branches
      .filter((b) => (tab === "core" ? b.isCore : !b.isCore))
      .filter((b) => (q ? b.label.toLowerCase().includes(q) : true));
  }, [branches, tab, query]);

  const datesDesc = useMemo(() => [...datesAsc].reverse(), [datesAsc]);
  const totalPages = Math.max(1, Math.ceil(datesDesc.length / sessions));
  const safePage = Math.min(page, totalPages);
  const pageDates = datesDesc.slice((safePage - 1) * sessions, safePage * sessions);
  const rangeLabel = pageDates.length ? `${fmtFull(pageDates[pageDates.length - 1])} → ${fmtFull(pageDates[0])}` : "—";

  const td = { textAlign: "center", padding: "6px 8px", borderBottom: "0.5px solid var(--bdrs)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap", marginBottom: 16 }}>
        <SMDTFilterChips
          options={[{ id: "core", label: `Chủ lực ${coreCount || ""}`.trim() }, { id: "sub", label: `Ngành phụ ${subCount || ""}`.trim() }]}
          active={tab}
          onChange={(v) => { setTab(v); setPage(1); }}
        />
        <SMDTToolbarPill>{rangeLabel}</SMDTToolbarPill>
        <SMDTToolbarPill as="label" style={{ cursor: "pointer" }}>
          <span>Hiển thị:</span>
          <select
            value={sessions}
            onChange={(e) => {
              setSessions(Number(e.target.value));
              setPage(1);
            }}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--t2)",
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer",
              appearance: "none",
              padding: 0,
            }}
          >
            {SESSION_OPTIONS.map((n) => (
              <option key={n} value={n} style={{ background: "var(--surf)", color: "var(--t1)" }}>
                {n} phiên
              </option>
            ))}
          </select>
        </SMDTToolbarPill>
        <SMDTSearchPill placeholder="Tìm ngành..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {status === "loading" && !datesDesc.length && <Banner>Đang tải dữ liệu…</Banner>}
      {status === "error" && !datesDesc.length && (
        <Banner tone="error">Lỗi tải dữ liệu: {error} <button onClick={refresh} style={linkBtn}>Thử lại</button></Banner>
      )}

      <Card noPad>
        <TableWrap minWidth={700}>
          <thead>
            <tr>
              <th style={{ fontSize: 10, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".07em", padding: "8px 14px", borderBottom: "0.5px solid var(--bdr)", background: "var(--elev)", whiteSpace: "nowrap", position: "sticky", left: 0, zIndex: 1 }}>NGÀY ↓</th>
              {visibleBranches.map((b) => (
                <th key={b.key} style={{ fontSize: 10, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".07em", padding: "8px 10px", borderBottom: "0.5px solid var(--bdr)", textAlign: "center", background: "var(--elev)", whiteSpace: "nowrap" }}>{b.label.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageDates.map((date) => (
              <tr key={date}>
                <td style={{ padding: "7px 14px", fontSize: 13, color: "var(--t3)", borderBottom: "0.5px solid var(--bdrs)", whiteSpace: "nowrap", position: "sticky", left: 0, background: "var(--surf)" }}>{fmtDay(date)}</td>
                {visibleBranches.map((b) => {
                  const v = matrix[b.key]?.[date];
                  const cls = valToHmCls(v);
                  return (
                    <td key={b.key} style={td}>
                      {cls ? <HM cls={cls} val={v.toFixed(2)} /> : <span style={{ color: "var(--t4)" }}>—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            {visibleBranches.length === 0 && (
              <tr><td colSpan={2} style={{ padding: 28, textAlign: "center", color: "var(--t3)" }}>Không tìm thấy ngành phù hợp.</td></tr>
            )}
          </tbody>
        </TableWrap>
      </Card>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11, gap: 12, flexWrap: "wrap" }}>
        <HeatLegend />
        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>
      <LiveFooter live={live} updatedAt={updatedAt} extra={`${visibleBranches.length} ngành · ${datesDesc.length} phiên`} />
    </div>
  );
}

function HeatLegend() {
  const { t } = useTheme();
  const items = [["100", "≥100"], ["70", "70–99"], ["50", "20–69"], ["20", "<20"]];
  const map = {
    "100": [t.Gs, t.Gb], "70": ["rgba(61,214,140,.07)", "rgba(61,214,140,.18)"], "50": [t.As, t.Ab], "20": [t.Rs, t.Rb],
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      {items.map(([cls, lbl]) => (
        <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--t3)" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: map[cls][0], border: `1px solid ${map[cls][1]}` }} />{lbl}
        </div>
      ))}
    </div>
  );
}

function SMDTToolbarPill({ children, as: Tag = "div", style }) {
  return (
    <Tag
      style={{
        minHeight: 30,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "0 14px",
        borderRadius: 15,
        background: "#111827",
        border: "1px solid #26324A",
        color: "var(--t2)",
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

function SMDTFilterChips({ options, active, onChange }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 13, flexWrap: "wrap" }}>
      {options.map((option) => {
        const on = active === option.id;
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            style={{
              minHeight: 30,
              display: "inline-flex",
              alignItems: "center",
              padding: "0 14px",
              borderRadius: 15,
              background: on ? "var(--Bs)" : "#111827",
              border: `1px solid ${on ? "var(--Bb)" : "#26324A"}`,
              color: on ? "var(--B)" : "var(--t2)",
              fontSize: 11,
              fontWeight: on ? 700 : 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SMDTSearchPill({ value, onChange, placeholder }) {
  return (
    <div
      style={{
        minHeight: 30,
        width: "min(350px, 100%)",
        display: "inline-flex",
        alignItems: "center",
        padding: "0 14px",
        borderRadius: 9,
        background: "#111827",
        border: "1px solid #26324A",
      }}
    >
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--t1)",
          fontSize: 11,
          fontWeight: 500,
        }}
      />
    </div>
  );
}

/* ═══════════════════════════ DASHBOARD ═══════════════════════════════════ */
function ModDashboard() {
  const { t } = useTheme();
  const narrow = useNarrow();
  const sw = useStockWave();
  const smdt = useSMDT();
  useRealtimeStockWaveFeed(sw.applyTick);
  useRealtimeFeed(smdt.applyTick);

  const latest = useMemo(() => [...sw.rows].reverse()[0] || null, [sw.rows]);

  // Tín hiệu ngành chủ lực: suy ra từ SMDT phiên gần nhất.
  const latestDate = smdt.datesAsc[smdt.datesAsc.length - 1];
  const sectorSignals = smdt.branches
    .filter((b) => b.isCore)
    .map((b) => {
      const v = smdt.matrix[b.key]?.[latestDate];
      let sig = "so";
      if (v != null) sig = v >= 90 ? "si" : v >= 60 ? "sn" : v >= 30 ? "so" : "st";
      return { name: b.label, sig };
    });

  const wb = latest ? pct(latest.waitbuy, latest.total) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
        <StatCard label="VN-Index" val="1,237" sub="+12.45đ (+1.02%)" colorKey="G" />
        <StatCard label="GTGD toàn TT" val={<span style={{ fontSize: 22 }}>18,250 tỷ</span>} sub="+2.3% so hôm qua" colorKey="B" />
        <StatCard label="Mã Chờ mua" val={latest ? fmtNum(latest.waitbuy) : "—"} sub={latest ? `${wb.toFixed(1)}% tổng số mã` : ""} colorKey="A" />
        <StatCard label="Độ tin cậy dò sóng" val={latest ? `${latest.reliability.toFixed(0)}%` : "—"} sub="phiên mới nhất" colorKey="P" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
        <Card>
          <CardHeader icon="ti-wave-sine" title="Sóng cổ phiếu hôm nay" right={<Clink onClick={() => window.dispatchEvent(new CustomEvent("st-nav", { detail: "stock-wave" }))}>Chi tiết →</Clink>} />
          {latest ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", padding: "10px 0" }}>
                {[[latest.waitbuy, t.G, "Chờ mua"], [latest.buy, t.MU, "Mua"], [latest.waitsell, t.A, "Chờ bán"], [latest.sell, t.R, "Bán"]].map(([v, c, l]) => (
                  <div key={l}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: c, ...mono }}>{fmtNum(v)}</div>
                    <div style={{ fontSize: 10, color: "var(--t4)", textTransform: "uppercase", letterSpacing: ".05em", marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: t.Gs, border: `0.5px solid ${t.Gb}`, borderRadius: 8, padding: "8px 11px", marginTop: 8, fontSize: 12, color: t.G, fontWeight: 600 }}>
                ↑ {wb >= 35 ? "Khả năng tạo đáy cao" : "Theo dõi dòng tiền"} — Tin cậy {latest.reliability.toFixed(0)}%
              </div>
            </>
          ) : <div style={{ padding: 20, textAlign: "center", color: "var(--t3)" }}>Đang tải…</div>}
        </Card>
        <Card>
          <CardHeader icon="ti-building-community" title="Dòng tiền ngành" right={<Clink onClick={() => window.dispatchEvent(new CustomEvent("st-nav", { detail: "smdt-nganh" }))}>Chi tiết →</Clink>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 2 }}>
            {sectorSignals.length ? sectorSignals.map(({ name, sig }) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>{name}</span>
                <Sig type={sig} />
              </div>
            )) : <div style={{ padding: 20, textAlign: "center", color: "var(--t3)" }}>Đang tải…</div>}
          </div>
        </Card>
        <Card>
          <CardHeader icon="ti-star" title="Top cổ phiếu mạnh" right={<Clink onClick={() => window.dispatchEvent(new CustomEvent("st-nav", { detail: "top-manh" }))}>Chi tiết →</Clink>} />
          <TableWrap minWidth={280}>
            <THead cols={[{ label: "Mã" }, { label: "Dòng" }, { label: "SMDT ng.", right: true }, { label: "SMDT mã", right: true }]} />
            <tbody>
              {[["SSI", "CK", "100", "117.93", "100", "100.57"], ["FPT", "CN", "100", "107.91", "100", "123.98"], ["ACB", "NH", "100", "113.39", "100", "119.26"], ["CSV", "XD", "100", "134.48", "100", "128.74"]].map((r) => (
                <tr key={r[0]}>
                  <td style={{ padding: "9px 10px", borderBottom: "0.5px solid var(--bdrs)", fontWeight: 700, color: t.B, fontSize: 13 }}>{r[0]}</td>
                  <td style={{ padding: "9px 10px", borderBottom: "0.5px solid var(--bdrs)", fontSize: 11, color: "var(--t3)" }}>{r[1]}</td>
                  <td style={{ padding: "6px 10px", borderBottom: "0.5px solid var(--bdrs)", textAlign: "right" }}><HM cls={r[2]} val={r[3]} /></td>
                  <td style={{ padding: "6px 10px", borderBottom: "0.5px solid var(--bdrs)", textAlign: "right" }}><HM cls={r[4]} val={r[5]} /></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════ MOCK MODULES (theo bản tham khảo) ═══════════ */
/* ═══════════════════════════ DÒNG TIỀN NGÀNH (REAL) ═══════════════════════ */
function ModDongTienNganh() {
  const { branches, datesAsc, matrix, status, error, updatedAt, refresh, applyTick } = useCashFlowBranch();
  const { connected: live } = useRealtimeCashFlowFeed(applyTick);

  const [tab, setTab] = useState("core");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sessions, setSessions] = useState(25);

  const coreCount = branches.filter((b) => b.isCore).length;
  const subCount = branches.length - coreCount;

  const visibleBranches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return branches
      .filter((b) => (tab === "core" ? b.isCore : !b.isCore))
      .filter((b) => (q ? b.label.toLowerCase().includes(q) : true));
  }, [branches, tab, query]);

  const datesDesc = useMemo(() => [...datesAsc].reverse(), [datesAsc]);
  const totalPages = Math.max(1, Math.ceil(datesDesc.length / sessions));
  const safePage = Math.min(page, totalPages);
  const pageDates = datesDesc.slice((safePage - 1) * sessions, safePage * sessions);
  const rangeLabel = pageDates.length ? `${fmtFull(pageDates[pageDates.length - 1])} → ${fmtFull(pageDates[0])}` : "—";

  const td = { textAlign: "center", padding: "6px 8px", borderBottom: "0.5px solid var(--bdrs)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap", marginBottom: 16 }}>
        <SMDTFilterChips
          options={[{ id: "core", label: `Chủ lực ${coreCount || ""}`.trim() }, { id: "sub", label: `Ngành phụ ${subCount || ""}`.trim() }]}
          active={tab}
          onChange={(v) => { setTab(v); setPage(1); }}
        />
        <SMDTToolbarPill>{rangeLabel}</SMDTToolbarPill>
        <SMDTToolbarPill as="label" style={{ cursor: "pointer" }}>
          <span>Hiển thị:</span>
          <select
            value={sessions}
            onChange={(e) => {
              setSessions(Number(e.target.value));
              setPage(1);
            }}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--t2)",
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer",
              appearance: "none",
              padding: 0,
            }}
          >
            {SESSION_OPTIONS.map((n) => (
              <option key={n} value={n} style={{ background: "var(--surf)", color: "var(--t1)" }}>
                {n} phiên
              </option>
            ))}
          </select>
        </SMDTToolbarPill>
        <SMDTSearchPill placeholder="Tìm ngành..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {status === "loading" && !datesDesc.length && <Banner>Đang tải dữ liệu…</Banner>}
      {status === "error" && !datesDesc.length && (
        <Banner tone="error">Lỗi tải dữ liệu: {error} <button onClick={refresh} style={linkBtn}>Thử lại</button></Banner>
      )}

      <Card noPad>
        <TableWrap minWidth={820}>
          <thead>
            <tr>
              <th style={{ fontSize: 10, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".07em", padding: "8px 14px", borderBottom: "0.5px solid var(--bdr)", background: "var(--elev)", whiteSpace: "nowrap", position: "sticky", left: 0, zIndex: 1 }}>NGÀY ↓</th>
              {visibleBranches.map((b) => (
                <th key={b.key} style={{ fontSize: 10, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".07em", padding: "8px 10px", borderBottom: "0.5px solid var(--bdr)", textAlign: "center", background: "var(--elev)", whiteSpace: "nowrap" }}>{b.label.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageDates.map((date) => (
              <tr key={date}>
                <td style={{ padding: "7px 14px", fontSize: 13, color: "var(--t3)", borderBottom: "0.5px solid var(--bdrs)", whiteSpace: "nowrap", position: "sticky", left: 0, background: "var(--surf)" }}>{fmtDay(date)}</td>
                {visibleBranches.map((b) => {
                  const content = matrix[b.key]?.[date];
                  const sig = contentToSig(content);
                  return (
                    <td key={b.key} style={td}>
                      {sig ? <Sig type={sig} /> : <span style={{ color: "var(--t4)" }}>—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            {visibleBranches.length === 0 && (
              <tr><td colSpan={2} style={{ padding: 28, textAlign: "center", color: "var(--t3)" }}>Không tìm thấy ngành phù hợp.</td></tr>
            )}
          </tbody>
        </TableWrap>
      </Card>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {["si", "sn", "so", "st"].map((s) => <Sig key={s} type={s} />)}
        </div>
        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>
      <LiveFooter live={live} updatedAt={updatedAt} extra={`${visibleBranches.length} ngành · ${datesDesc.length} phiên`} />
    </div>
  );
}

const DT_CP_ROWS = [
  { ma: "ACB", ng: "NH", smdt: ["100", "113.39"], sigs: ["si", "si", "sn", "sn"], trend: ["tg", "↑ Tăng"] },
  { ma: "SSI", ng: "CK", smdt: ["100", "117.93"], sigs: ["si", "si", "si", "sn"], trend: ["tg", "↑ Mạnh"] },
  { ma: "FPT", ng: "CN", smdt: ["100", "107.91"], sigs: ["si", "si", "si", "si"], trend: ["tg", "↑ Mạnh"] },
  { ma: "CSV", ng: "XD", smdt: ["100", "128.74"], sigs: ["si", "si", "si", "sn"], trend: ["tg", "↑ Mạnh"] },
  { ma: "MBB", ng: "NH", smdt: ["100", "103.56"], sigs: ["sn", "sn", "so", "so"], trend: ["tb", "→ Phục hồi"] },
  { ma: "VCB", ng: "NH", smdt: ["70", "98.42"], sigs: ["so", "so", "st", "st"], trend: ["tr", "↓ Giảm"] },
  { ma: "PDR", ng: "BĐS", smdt: ["neg", "-11.88"], sigs: ["st", "st", "st", "st"], trend: ["tr", "↓ Yếu"] },
];

function ModDongTienCP() {
  const { t } = useTheme();
  const narrow = useNarrow();
  const td = { padding: "9px 10px", borderBottom: "0.5px solid var(--bdrs)", whiteSpace: "nowrap" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
        <StatCard label="Tiếp tục đổ vào" val="47" sub="Dòng tiền mạnh liên tục" colorKey="G" />
        <StatCard label="Nhen nhóm đổ vào" val="23" sub="Mới bắt đầu nhận tiền" colorKey="B" />
        <StatCard label="Đang thoát ra" val="31" sub="Dòng tiền bắt đầu rút" colorKey="A" />
        <StatCard label="Tiếp tục thoát ra" val="25" sub="Dòng tiền rút liên tục" colorKey="R" />
      </div>
      <MockNote>Bảng mẫu — chờ kết nối API dòng tiền cổ phiếu.</MockNote>
      <Card noPad>
        <TableWrap minWidth={760}>
          <THead cols={[{ label: "Mã", pl: 14 }, { label: "Ngành" }, { label: "SMDT (%)", right: true }, { label: "07/05" }, { label: "06/05" }, { label: "05/05" }, { label: "02/05" }, { label: "Xu hướng" }]} />
          <tbody>
            {DT_CP_ROWS.map((r) => (
              <tr key={r.ma}>
                <td style={{ ...td, fontWeight: 700, color: t.B, fontSize: 13, paddingLeft: 14 }}>{r.ma}</td>
                <td style={{ ...td, fontSize: 11, color: "var(--t3)" }}>{r.ng}</td>
                <td style={{ ...td, textAlign: "right", padding: "6px 10px" }}><HM cls={r.smdt[0]} val={r.smdt[1]} /></td>
                {r.sigs.map((s, i) => <td key={i} style={{ ...td, textAlign: "center", padding: "6px 8px" }}><Sig type={s} compact /></td>)}
                <td style={td}><Tag cls={r.trend[0]}>{r.trend[1]}</Tag></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

const SMDT_MA_ROWS = [
  ["31/12/24", "100", "70", "70", "neg", "70", "70", "70", "70", "50", "◑"],
  ["02/01/25", "70", "70", "70", "neg", "70", "70", "70", "70", "70", "◑"],
  ["29/04/25", "100", "70", "70", "70", "70", "70", "70", "70", "70", "●"],
  ["05/05/25", "100", "100", "100", "70", "70", "100", "100", "70", "70", "●"],
  ["06/05/25", "100", "100", "100", "70", "70", "100", "100", "70", "70", "●"],
  ["07/05/25", "100", "100", "100", "70", "70", "100", "100", "70", "70", "●"],
];

function ModSMDTMa() {
  const { t } = useTheme();
  const thMa = ["ACB", "TCB", "MBB", "VCB", "CTG", "BID", "VPB", "HDB", "STB"];
  const td = { textAlign: "center", padding: "5px 6px", borderBottom: "0.5px solid var(--bdrs)" };
  return (
    <div>
      <FilterChips options={[{ id: "nh", label: "Ngân hàng" }, { id: "ck", label: "Chứng khoán" }, { id: "bds", label: "BĐS" }, { id: "thep", label: "Thép" }]} active="nh" onChange={() => {}} />
      <MockNote>Bảng mẫu — chờ kết nối API SMDT mã.</MockNote>
      <Card noPad>
        <TableWrap minWidth={820}>
          <thead>
            <tr>
              <th style={thStyle}>Ngày ↓</th>
              {thMa.map((h) => <th key={h} style={{ ...thStyle, textAlign: "center" }}>{h}</th>)}
              <th style={{ ...thStyle, textAlign: "center" }}>Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>
            {SMDT_MA_ROWS.map((r) => (
              <tr key={r[0]}>
                <td style={{ padding: "8px 14px", fontSize: 12, color: "var(--t3)", borderBottom: "0.5px solid var(--bdrs)", whiteSpace: "nowrap" }}>{r[0]}</td>
                {r.slice(1, 10).map((c, i) => <td key={i} style={td}><HM cls={c} val={c === "neg" ? "neg" : c} /></td>)}
                <td style={{ ...td, fontSize: 18, color: t.G }}>{r[10]}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

const TOP_MANH_ROWS = [
  [1, "SSI", "CK", "26,350", "100", "117.93", "100", "100.57", "si", "si", "tb", "⭐ Nhen nhóm"],
  [2, "HCM", "CK", "28,900", "70", "85.08", "100", "111.04", "si", "si", "tg", "● Duy trì"],
  [3, "CTS", "CK", "38,700", "70", "71.68", "100", "122.69", "si", "si", "tg", "● Duy trì"],
  [4, "VND", "CK", "22,850", "100", "114.76", "70", "98.45", "si", "si", "tg", "● Duy trì"],
  [5, "ACB", "NH", "24,650", "100", "113.39", "100", "119.26", "si", "si", "tg", "● Duy trì"],
  [6, "FPT", "CN", "127,800", "100", "107.91", "100", "123.98", "si", "si", "tg", "● Duy trì"],
  [7, "DIG", "BĐS", "23,650", "20", "24.01", "20", "19.28", "sn", "sn", "ta", "◎ Tiềm năng"],
  [8, "CSV", "XD", "48,900", "100", "134.48", "100", "128.74", "si", "si", "tg", "● Duy trì"],
];

function ModTopManh() {
  const { t } = useTheme();
  const td = { padding: "9px 9px", borderBottom: "0.5px solid var(--bdrs)", whiteSpace: "nowrap" };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 13, flexWrap: "wrap" }}>
        <FilterChips options={[{ id: "all", label: "Tất cả dòng" }, { id: "70", label: "SMDT ≥ 70%" }]} active="all" onChange={() => {}} />
        <SearchBox placeholder="Tìm mã..." />
      </div>
      <MockNote>Bảng mẫu — chờ kết nối API top cổ phiếu mạnh.</MockNote>
      <Card noPad>
        <TableWrap minWidth={900}>
          <THead cols={[{ label: "#", pl: 14 }, { label: "Mã" }, { label: "Dòng" }, { label: "Giá (VND)", right: true }, { label: "SMDT ngành", right: true }, { label: "SMDT mã", right: true }, { label: "T/H ngành" }, { label: "T/H mã" }, { label: "Trạng thái" }]} />
          <tbody>
            {TOP_MANH_ROWS.map((r) => (
              <tr key={r[1]}>
                <td style={{ ...td, color: "var(--t3)", paddingLeft: 14 }}>{r[0]}</td>
                <td style={{ ...td, fontWeight: 700, color: t.B, fontSize: 13 }}>{r[1]}</td>
                <td style={{ ...td, fontSize: 11, color: "var(--t3)" }}>{r[2]}</td>
                <td style={{ ...td, textAlign: "right", ...mono }}>{r[3]}</td>
                <td style={{ ...td, textAlign: "right", padding: "6px 8px" }}><HM cls={r[4]} val={r[5]} /></td>
                <td style={{ ...td, textAlign: "right", padding: "6px 8px" }}><HM cls={r[6]} val={r[7]} /></td>
                <td style={{ ...td, padding: "6px 8px" }}><Sig type={r[8]} compact /></td>
                <td style={{ ...td, padding: "6px 8px" }}><Sig type={r[9]} compact /></td>
                <td style={td}><Tag cls={r[10]}>{r[11]}</Tag></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </div>
  );
}

function ModDongTienTT() {
  const { t } = useTheme();
  const narrow = useNarrow();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
        <StatCard label="Tổng GTGD" val={<span style={{ fontSize: 22 }}>18,250 tỷ</span>} sub="+2.3% so hôm qua" colorKey="G" />
        <StatCard label="Khối ngoại mua ròng" val={<span style={{ fontSize: 22 }}>+342 tỷ</span>} sub="3 phiên mua liên tiếp" colorKey="B" />
        <StatCard label="Tự doanh" val={<span style={{ fontSize: 22 }}>-128 tỷ</span>} sub="Bán ròng nhẹ" colorKey="A" />
        <StatCard label="Margin toàn TT" val={<span style={{ fontSize: 22 }}>~95K tỷ</span>} sub="Ổn định" colorKey="R" />
      </div>
      <Card style={{ padding: 60, textAlign: "center" }}>
        <i className="ti ti-trending-up" style={{ fontSize: 52, color: t.t4 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--t2)", marginTop: 12 }}>Biểu đồ dòng tiền thị trường</div>
        <div style={{ fontSize: 12, color: "var(--t4)", marginTop: 6 }}>Kết nối API để hiển thị chart GTGD, khối ngoại, tự doanh realtime</div>
      </Card>
    </div>
  );
}

const thStyle = {
  fontSize: 10, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".07em",
  padding: "8px 14px", borderBottom: "0.5px solid var(--bdr)", background: "var(--elev)", whiteSpace: "nowrap",
};

function MockNote({ children }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--t4)", marginBottom: 10 }}>
      <i className="ti ti-flask" style={{ fontSize: 13 }} />{children}
    </div>
  );
}

const linkBtn = { border: "none", background: "none", color: "var(--B)", font: "inherit", fontWeight: 600, cursor: "pointer", textDecoration: "underline" };
