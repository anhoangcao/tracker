import { useCallback, useMemo, useState } from "react";
import { useCashFlowTicker, useRealtimeCashFlowTickerFeed, tickerContentToSig } from "../../data/useCashFlowTicker";
import { useBranchPath } from "../../data/useBranchPath";
import { fmtFull, fmtNum } from "../../app/formatters";
import { Card, Pagination, Banner, LiveFooter } from "../../components/ui";
import { SMDTToolbarPill, SMDTSearchPill, InlineFilterChips, linkBtn } from "../../components/ui/ModuleControls";
import { CashFlowMatrixTable } from "./CashFlowMatrixTable";
import { CfBadge } from "./CfBadge";
import { IndustryPicker } from "./IndustryPicker";
import { CF_SIG, CF_SIG_ORDER, dominantSig } from "./cashFlowUtils";

export function ModDongTienCP() {
  const { latest, buckets, status, error, updatedAt, refresh, applyTick } = useCashFlowTicker();
  const { connected: live } = useRealtimeCashFlowTickerFeed(applyTick);
  const { tickerToBranch } = useBranchPath();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sessions, setSessions] = useState(12);
  const [hiddenInd, setHiddenInd] = useState(() => new Set());
  const [collapsedInd, setCollapsedInd] = useState(() => new Set());

  const rows = latest?.rows || [];

  /* Mã + ngành thật (từ getBranchPath), gom nhóm cột theo tên ngành thay cho sàn. */
  const { tickerPool, industries } = useMemo(() => {
    const seen = new Map();
    const indSeen = new Set();
    for (const bucket of buckets) {
      for (const row of bucket.rows || []) {
        const ind = tickerToBranch[row.ticker] || "Khác";
        if (!seen.has(row.ticker)) seen.set(row.ticker, { ticker: row.ticker, type: ind });
        indSeen.add(ind);
      }
    }
    const pool = [...seen.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
    // Ngành xếp theo alphabet (vi); "Khác" luôn ở cuối.
    const indList = [...indSeen].sort((a, b) => {
      if (a === "Khác") return 1;
      if (b === "Khác") return -1;
      return a.localeCompare(b, "vi");
    });
    return { tickerPool: pool, industries: indList };
  }, [buckets, tickerToBranch]);

  const latestByTicker = useMemo(() => {
    const map = new Map();
    for (const row of rows) map.set(row.ticker, row);
    return map;
  }, [rows]);

  const sigOfTicker = useCallback(
    (ticker) => tickerContentToSig(latestByTicker.get(ticker)?.content || ""),
    [latestByTicker]
  );

  /* Tín hiệu đại diện của từng ngành = tín hiệu áp đảo ở phiên mới nhất. */
  const industrySig = useMemo(() => {
    const map = {};
    for (const ind of industries) {
      map[ind] = dominantSig(tickerPool.filter((tk) => tk.type === ind).map((tk) => sigOfTicker(tk.ticker)));
    }
    return map;
  }, [industries, tickerPool, sigOfTicker]);

  /* Lọc theo ngành đang chọn + trạng thái + tìm kiếm. */
  const filteredTickers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickerPool.filter((tk) => {
      if (hiddenInd.has(tk.type)) return false;
      if (filter !== "all" && sigOfTicker(tk.ticker) !== filter) return false;
      if (q && !tk.ticker.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tickerPool, hiddenInd, filter, query, sigOfTicker]);

  /* Gom cột theo ngành để dựng header nhóm. */
  const groups = useMemo(() => {
    const byInd = new Map();
    for (const tk of filteredTickers) {
      if (!byInd.has(tk.type)) byInd.set(tk.type, []);
      byInd.get(tk.type).push(tk.ticker);
    }
    return industries.filter((i) => byInd.has(i)).map((i) => ({ industry: i, tickers: byInd.get(i) }));
  }, [filteredTickers, industries]);

  const visibleTickers = useMemo(() => groups.flatMap((g) => g.tickers), [groups]);
  const groupStarts = useMemo(() => new Set(groups.map((g) => g.tickers[0])), [groups]);
  const colCount = useMemo(
    () => groups.reduce((a, g) => a + (collapsedInd.has(g.industry) ? 1 : g.tickers.length), 0),
    [groups, collapsedInd]
  );
  const toggleCollapse = useCallback((ind) => {
    setCollapsedInd((prev) => {
      const next = new Set(prev);
      if (next.has(ind)) next.delete(ind); else next.add(ind);
      return next;
    });
  }, []);

  const datesDesc = useMemo(() => [...buckets].reverse(), [buckets]);
  const totalPages = Math.max(1, Math.ceil(datesDesc.length / sessions));
  const safePage = Math.min(page, totalPages);
  const pageDates = datesDesc.slice((safePage - 1) * sessions, safePage * sessions);
  const matrix = useMemo(() => {
    const map = {};
    for (const bucket of buckets) {
      map[bucket.date] = {};
      for (const row of bucket.rows) map[bucket.date][row.ticker] = row.content;
    }
    return map;
  }, [buckets]);
  const latestDate = latest?.date || datesDesc[0]?.date || null;
  const activeTickers = filteredTickers.length;

  const toggleInd = useCallback((ind) => {
    setHiddenInd((prev) => {
      const next = new Set(prev);
      if (next.has(ind)) next.delete(ind); else next.add(ind);
      return next;
    });
  }, []);
  const showIndustries = useCallback((items) => {
    setHiddenInd((prev) => {
      const next = new Set(prev);
      for (const ind of items) next.delete(ind);
      return next;
    });
  }, []);
  const hideIndustries = useCallback((items) => {
    setHiddenInd((prev) => {
      const next = new Set(prev);
      for (const ind of items) next.add(ind);
      return next;
    });
  }, []);
  const selectAllInd = useCallback(() => setHiddenInd(new Set()), []);
  const clearAllInd = useCallback(() => setHiddenInd(new Set(industries)), [industries]);

  const exportExcel = useCallback(() => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Ngày", ...visibleTickers].map(esc).join(",");
    const lines = [header];
    for (const bucket of datesDesc) {
      const cells = visibleTickers.map((tk) => {
        const sig = tickerContentToSig(matrix[bucket.date]?.[tk]);
        return esc(sig ? CF_SIG[sig].label : "");
      });
      lines.push([esc(fmtFull(bucket.date)), ...cells].join(","));
    }
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dong-tien-co-phieu-${(latestDate || "").replace(/[/]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [visibleTickers, datesDesc, matrix, latestDate]);

  if (status === "loading" && !rows.length) return <Banner>Đang tải dữ liệu dòng tiền cổ phiếu…</Banner>;
  if (status === "error" && !rows.length)
    return <Banner tone="error">Lỗi tải dữ liệu: {error} <button onClick={refresh} style={linkBtn}>Thử lại</button></Banner>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Thanh công cụ + bộ lọc */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <IndustryPicker
          industries={industries}
          hidden={hiddenInd}
          industrySig={industrySig}
          onToggle={toggleInd}
          onAll={selectAllInd}
          onNone={clearAllInd}
          onShowIndustries={showIndustries}
          onHideIndustries={hideIndustries}
        />
        <SMDTToolbarPill>
          <i className="ti ti-calendar" style={{ fontSize: 13, color: "var(--t4)" }} />
          {latestDate ? fmtFull(latestDate) : "—"}
        </SMDTToolbarPill>
        <SMDTToolbarPill as="label" style={{ cursor: "pointer" }}>
          <select
            value={sessions}
            onChange={(e) => { setSessions(Number(e.target.value)); setPage(1); }}
            style={{ border: "none", outline: "none", background: "transparent", color: "var(--t2)", font: "inherit", fontWeight: 700, cursor: "pointer", appearance: "none", padding: 0 }}
          >
            {[12, 25, 50].map((n) => (
              <option key={n} value={n} style={{ background: "var(--surf)", color: "var(--t1)" }}>{n} phiên</option>
            ))}
          </select>
          <i className="ti ti-chevron-down" style={{ fontSize: 12, color: "var(--t4)" }} />
        </SMDTToolbarPill>
        <SMDTSearchPill placeholder="Tìm mã..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 170, flexShrink: 0 }} />
        <InlineFilterChips
          options={[
            { id: "all", label: "Tất cả" },
            { id: "si", label: "Đổ vào" },
            { id: "sn", label: "Nhen nhóm" },
            { id: "so", label: "Đang thoát" },
            { id: "st", label: "Thoát ra" },
          ]}
          active={filter}
          onChange={setFilter}
        />
        <button
          onClick={exportExcel}
          style={{ marginLeft: "auto", height: 34, padding: "0 16px", borderRadius: 9, background: "var(--B)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", fontFamily: "inherit" }}
        >
          <i className="ti ti-file-spreadsheet" style={{ fontSize: 15 }} />Xuất Excel
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 11, color: "var(--t4)", fontWeight: 600 }}>{fmtNum(activeTickers)} mã</span>
      </div>

      <Card noPad>
        <CashFlowMatrixTable
          collapsedInd={collapsedInd}
          colCount={colCount}
          groupStarts={groupStarts}
          groups={groups}
          matrix={matrix}
          pageDates={pageDates}
          safePage={safePage}
          toggleCollapse={toggleCollapse}
          visibleTickers={visibleTickers}
        />
      </Card>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <CashFlowLegend />
        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>
      <LiveFooter live={live} updatedAt={updatedAt} extra={`${fmtNum(activeTickers)} / ${fmtNum(tickerPool.length)} mã · ${datesDesc.length} phiên`} />
    </div>
  );
}

/* Chú giải màu tín hiệu (góc dưới bảng). */
function CashFlowLegend() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
      {CF_SIG_ORDER.map((k) => <CfBadge key={k} sig={k} small />)}
    </div>
  );
}
