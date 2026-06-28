import { useCallback, useEffect, useMemo, useState } from "react";
import { useCashFlowTicker, useRealtimeCashFlowTickerFeed, tickerContentToSig } from "../../data/useCashFlowTicker";
import { useCashFlowBranch, useRealtimeCashFlowFeed, contentToSig } from "../../data/useCashFlowBranch";
import { useBranchPath } from "../../data/useBranchPath";
import { fmtDay, fmtFull, fmtNum } from "../../app/formatters";
import { useNarrow } from "../../app/useNarrow";
import { Card, Pagination, Banner, LiveFooter } from "../../components/ui";
import { MatrixCards } from "../../components/ui/MatrixCards";
import { SMDTToolbarPill, SMDTSearchPill, InlineFilterChips, linkBtn } from "../../components/ui/ModuleControls";
import { CashFlowMatrixTable } from "./CashFlowMatrixTable";
import { CfBadge } from "./CfBadge";
import { IndustryPicker } from "./IndustryPicker";
import { CF_SIG, CF_SIG_ORDER } from "./cashFlowUtils";

const HIDDEN_INDUSTRIES_KEY = "cashflow_ticker_hidden_industries_v1";
const COLLAPSED_INDUSTRIES_KEY = "cashflow_ticker_collapsed_industries_v1";
const INDUSTRY_ALIAS_GROUPS = [
  ["Môi giới chứng khoán", "Chứng khoán"],
  ["Ngân hàng thương mại truyền thống", "Ngân hàng"],
  ["Bất động sản dân cư", "BĐS Dân cư", "BĐS dân cư", "Bất động sản Dân cư", "Bất động sản"],
  ["Sản xuất, chế biến thép", "Thép"],
  ["Sóng ngành Vin", "Sóng Vin", "Vin", "Vingroup"],
  ["Xây dựng"],
];

function normalizeIndustryName(name) {
  return String(name || "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function industryAliases(name) {
  const normalized = normalizeIndustryName(name);
  const group = INDUSTRY_ALIAS_GROUPS.find((items) => items.some((item) => normalizeIndustryName(item) === normalized));
  return group || [name];
}

function loadSet(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify([...value]));
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage.
  }
}

function toDateInputValue(date) {
  if (!date || typeof date !== "string") return "";
  if (date.includes("/")) {
    const [d, m, y] = date.split("/");
    return d && m && y ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : "";
  }
  return date.slice(0, 10);
}

function findDateIndex(datesDesc, dateValue) {
  if (!dateValue || datesDesc.length === 0) return -1;
  const exactIndex = datesDesc.findIndex((bucket) => toDateInputValue(bucket.date) === dateValue);
  if (exactIndex >= 0) return exactIndex;
  const previousIndex = datesDesc.findIndex((bucket) => toDateInputValue(bucket.date) <= dateValue);
  return previousIndex === -1 ? datesDesc.length - 1 : previousIndex;
}

export function ModDongTienCP() {
  const narrow = useNarrow();
  const { latest, buckets, allowedTickers, status, error, updatedAt, refresh, applyTick } = useCashFlowTicker();
  const { connected: live } = useRealtimeCashFlowTickerFeed(applyTick);
  const {
    branches: signalBranches,
    datesAsc: signalDatesAsc,
    matrix: signalMatrix,
    applyTick: applySignalTick,
  } = useCashFlowBranch();
  useRealtimeCashFlowFeed(applySignalTick);
  const { tickerToBranch, status: branchPathStatus, error: branchPathError, refresh: refreshBranchPath } = useBranchPath();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [sessions, setSessions] = useState(12);
  const [hiddenInd, setHiddenInd] = useState(() => loadSet(HIDDEN_INDUSTRIES_KEY));
  const [collapsedInd, setCollapsedInd] = useState(() => loadSet(COLLAPSED_INDUSTRIES_KEY));

  const rows = latest?.rows || [];

  /* Vũ trụ mã = danh sách mã đang giao dịch (allowedTickers) ∩ mã có ngành thật từ getBranchPath.
   * Lấy thẳng từ allowedTickers nên ổn định ngay từ lần paint đầu (không phụ thuộc số phiên đã tải),
   * tránh nhá 162→168 và phản ánh đúng tổng (vd 173) kể cả mã chưa có tín hiệu dòng tiền nào. */
  const { tickerPool, industries } = useMemo(() => {
    const seen = new Map();
    const indSeen = new Set();
    for (const ticker of allowedTickers || []) {
      const ind = tickerToBranch[ticker];
      if (!ind) continue;
      if (!seen.has(ticker)) seen.set(ticker, { ticker, type: ind });
      indSeen.add(ind);
    }
    const pool = [...seen.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
    const indList = [...indSeen].sort((a, b) => a.localeCompare(b, "vi"));
    return { tickerPool: pool, industries: indList };
  }, [allowedTickers, tickerToBranch]);

  const datesDesc = useMemo(() => [...buckets].reverse(), [buckets]);
  const latestDate = latest?.date || datesDesc[0]?.date || null;
  const activeDateValue = selectedDate || toDateInputValue(latestDate);
  const activeDateIndex = useMemo(() => findDateIndex(datesDesc, activeDateValue), [datesDesc, activeDateValue]);
  const activeBucket = activeDateIndex >= 0 ? datesDesc[activeDateIndex] : latest;
  const activeRows = activeBucket?.rows || rows;
  const minDate = toDateInputValue(datesDesc[datesDesc.length - 1]?.date);
  const maxDate = toDateInputValue(datesDesc[0]?.date || latestDate);
  const dateInputValue = toDateInputValue(activeBucket?.date || latestDate);
  const canGoNewer = activeDateIndex > 0;
  const canGoOlder = activeDateIndex >= 0 && activeDateIndex < datesDesc.length - 1;

  const activeByTicker = useMemo(() => {
    const map = new Map();
    for (const row of activeRows) map.set(row.ticker, row);
    return map;
  }, [activeRows]);

  const sigOfTicker = useCallback(
    (ticker) => tickerContentToSig(activeByTicker.get(ticker)?.content || ""),
    [activeByTicker]
  );

  const branchIndustrySigByDate = useMemo(() => {
    const signalByIndustry = new Map();
    for (const branch of signalBranches) {
      for (const name of [branch.key, branch.label, ...industryAliases(branch.key), ...industryAliases(branch.label)]) {
        signalByIndustry.set(normalizeIndustryName(name), signalMatrix[branch.key] || {});
      }
    }

    const map = {};
    for (const ind of industries) {
      const names = industryAliases(ind);
      const row = names.map((name) => signalByIndustry.get(normalizeIndustryName(name))).find(Boolean);
      map[ind] = {};
      for (const date of signalDatesAsc) {
        map[ind][toDateInputValue(date)] = contentToSig(row?.[date]);
      }
    }
    return map;
  }, [industries, signalBranches, signalDatesAsc, signalMatrix]);

  /* Tín hiệu ngành lấy trực tiếp từ API Dòng tiền ngành để đồng bộ tuyệt đối. */
  const industrySig = useMemo(() => {
    const activeValue = toDateInputValue(activeBucket?.date || latestDate);
    const map = {};
    for (const ind of industries) map[ind] = branchIndustrySigByDate[ind]?.[activeValue] || null;
    return map;
  }, [activeBucket?.date, branchIndustrySigByDate, industries, latestDate]);

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
  const activeTickers = filteredTickers.length;

  useEffect(() => {
    if (!industries.length) return;
    const valid = new Set(industries);
    setHiddenInd((prev) => {
      const next = new Set([...prev].filter((ind) => valid.has(ind)));
      return next.size === prev.size ? prev : next;
    });
    setCollapsedInd((prev) => {
      const next = new Set([...prev].filter((ind) => valid.has(ind)));
      return next.size === prev.size ? prev : next;
    });
  }, [industries]);

  useEffect(() => {
    saveSet(HIDDEN_INDUSTRIES_KEY, hiddenInd);
  }, [hiddenInd]);

  useEffect(() => {
    saveSet(COLLAPSED_INDUSTRIES_KEY, collapsedInd);
  }, [collapsedInd]);

  const goToDate = useCallback((dateValue) => {
    const targetIndex = findDateIndex(datesDesc, dateValue);
    if (targetIndex >= 0) {
      setSelectedDate(toDateInputValue(datesDesc[targetIndex].date));
      setPage(Math.floor(targetIndex / sessions) + 1);
    }
  }, [datesDesc, sessions]);

  const stepDate = useCallback((delta) => {
    if (datesDesc.length === 0) return;
    const currentIndex = activeDateIndex >= 0 ? activeDateIndex : 0;
    const targetIndex = Math.min(Math.max(currentIndex + delta, 0), datesDesc.length - 1);
    setSelectedDate(toDateInputValue(datesDesc[targetIndex].date));
    setPage(Math.floor(targetIndex / sessions) + 1);
  }, [activeDateIndex, datesDesc, sessions]);

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
  if (branchPathStatus === "loading" && !Object.keys(tickerToBranch).length)
    return <Banner>Đang tải danh sách ngành cổ phiếu…</Banner>;
  if (branchPathStatus === "error" && !Object.keys(tickerToBranch).length)
    return <Banner tone="error">Lỗi tải danh sách ngành: {branchPathError} <button onClick={refreshBranchPath} style={linkBtn}>Thử lại</button></Banner>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Thanh công cụ + bộ lọc */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "nowrap", overflow: "visible", paddingBottom: 2 }}>
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
        <SMDTToolbarPill style={{ gap: 3, padding: "0 6px", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => stepDate(1)}
            disabled={!canGoOlder}
            title="Lùi 1 phiên"
            style={{ width: 18, height: 22, border: "none", borderRadius: 6, background: "transparent", color: canGoOlder ? "var(--t2)" : "var(--t4)", cursor: canGoOlder ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}
          >
            <i className="ti ti-chevron-left" style={{ fontSize: 14 }} />
          </button>
          <label style={{ cursor: "pointer", position: "relative", display: "inline-flex", alignItems: "center", gap: 5, minWidth: 96, justifyContent: "center" }}>
            <i className="ti ti-calendar" style={{ fontSize: 13, color: "var(--t4)" }} />
            {dateInputValue ? fmtFull(dateInputValue) : "—"}
            <input
              type="date"
              value={dateInputValue}
              min={minDate}
              max={maxDate}
              onChange={(e) => goToDate(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
            />
          </label>
          <button
            type="button"
            onClick={() => stepDate(-1)}
            disabled={!canGoNewer}
            title="Tiến 1 phiên"
            style={{ width: 18, height: 22, border: "none", borderRadius: 6, background: "transparent", color: canGoNewer ? "var(--t2)" : "var(--t4)", cursor: canGoNewer ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}
          >
            <i className="ti ti-chevron-right" style={{ fontSize: 14 }} />
          </button>
        </SMDTToolbarPill>
        <SMDTToolbarPill as="label" style={{ cursor: "pointer", padding: "0 10px", flexShrink: 0 }}>
          <select
            value={sessions}
            onChange={(e) => { setSessions(Number(e.target.value)); setPage(1); setSelectedDate(""); }}
            style={{ border: "none", outline: "none", background: "transparent", color: "var(--t2)", font: "inherit", fontWeight: 700, cursor: "pointer", appearance: "none", padding: 0 }}
          >
            {[12, 25, 50].map((n) => (
              <option key={n} value={n} style={{ background: "var(--surf)", color: "var(--t1)" }}>{n} phiên</option>
            ))}
          </select>
          <i className="ti ti-chevron-down" style={{ fontSize: 12, color: "var(--t4)" }} />
        </SMDTToolbarPill>
        <SMDTSearchPill placeholder="Tìm mã..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 118, padding: "0 10px", flexShrink: 0 }} />
        <InlineFilterChips
          options={[
            { id: "all", label: "Tất cả" },
            { id: "sn", label: "Nhen nhóm" },
            { id: "si", label: "Đổ vào" },
            { id: "so", label: "Đang thoát" },
            { id: "st", label: "Thoát ra" },
          ]}
          active={filter}
          onChange={setFilter}
        />
        <button
          onClick={exportExcel}
          style={{ marginLeft: "auto", height: 32, padding: "0 12px", borderRadius: 9, background: "var(--B)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0 }}
        >
          <i className="ti ti-file-spreadsheet" style={{ fontSize: 15 }} />Xuất Excel
        </button>
      </div>

      {narrow ? (
        <MatrixCards
          activeDate={activeBucket?.date || latestDate}
          activeLabel={(activeBucket?.date || latestDate) ? fmtDay(activeBucket?.date || latestDate) : null}
          sessions={pageDates.map((bucket, di) => ({
            date: bucket.date,
            label: fmtDay(bucket.date),
            isActive: dateInputValue === toDateInputValue(bucket.date),
            isLatest: di === 0 && safePage === 1,
          }))}
          groups={groups.map((g) => ({
            industry: g.industry,
            count: g.tickers.length,
            collapsed: collapsedInd.has(g.industry),
            onToggle: () => toggleCollapse(g.industry),
            entities: collapsedInd.has(g.industry)
              ? [{
                  key: `${g.industry}__sum`,
                  title: "Tổng hợp",
                  subtitle: `${g.tickers.length} mã`,
                  render: (date, variant) => (
                    <CfBadge sig={branchIndustrySigByDate?.[g.industry]?.[toDateInputValue(date)] || null} small={variant === "sm"} />
                  ),
                }]
              : g.tickers.map((ticker) => ({
                  key: ticker,
                  title: ticker,
                  render: (date, variant) => (
                    <CfBadge sig={tickerContentToSig(matrix[date]?.[ticker])} small={variant === "sm"} />
                  ),
                })),
          }))}
          emptyText="Không có mã phù hợp."
        />
      ) : (
        <Card noPad>
          <CashFlowMatrixTable
            collapsedInd={collapsedInd}
            colCount={colCount}
            groupStarts={groupStarts}
            groups={groups}
            matrix={matrix}
            pageDates={pageDates}
            safePage={safePage}
            activeDate={dateInputValue}
            branchIndustrySigByDate={branchIndustrySigByDate}
            toggleCollapse={toggleCollapse}
            visibleTickers={visibleTickers}
          />
        </Card>
      )}

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
