import { useMemo, useState } from "react";
import { valToHmCls } from "../../styles/tokens";
import { useSMDTTicker, useRealtimeSMDTTickerFeed } from "../../data/useSMDTTicker";
import { fmtDay, fmtFull, SESSION_OPTIONS } from "../../app/formatters";
import { Card, Pagination, HM, Banner, LiveFooter } from "../../components/ui";
import { HeatLegend, SMDTToolbarPill, SMDTSearchPill, linkBtn } from "../../components/ui/ModuleControls";

export function ModSMDTMa() {
  const { tickers, datesAsc, matrix, status, error, updatedAt, refresh, applyTick } = useSMDTTicker();
  const { connected: live } = useRealtimeSMDTTickerFeed(applyTick);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sessions, setSessions] = useState(25);

  const visibleTickers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickers.filter((tk) => (q ? tk.key.toLowerCase().includes(q) || tk.name.toLowerCase().includes(q) : true));
  }, [tickers, query]);

  const datesDesc = useMemo(() => [...datesAsc].reverse(), [datesAsc]);
  const totalPages = Math.max(1, Math.ceil(datesDesc.length / sessions));
  const safePage = Math.min(page, totalPages);
  const pageDates = datesDesc.slice((safePage - 1) * sessions, safePage * sessions);
  const rangeLabel = pageDates.length ? `${fmtFull(pageDates[pageDates.length - 1])} → ${fmtFull(pageDates[0])}` : "—";

  const td = { textAlign: "center", padding: "6px 8px", borderBottom: "0.5px solid var(--bdrs)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap", marginBottom: 16 }}>
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
        <SMDTSearchPill placeholder="Tìm mã..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {status === "loading" && !datesDesc.length && <Banner>Đang tải dữ liệu SMDT cổ phiếu…</Banner>}
      {status === "error" && !datesDesc.length && (
        <Banner tone="error">Lỗi tải dữ liệu: {error} <button onClick={refresh} style={linkBtn}>Thử lại</button></Banner>
      )}

      <Card noPad>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: Math.max(700, 120 + visibleTickers.length * 76) }}>
            <thead>
              <tr>
                <th style={{ fontSize: 10, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".07em", padding: "8px 14px", borderBottom: "0.5px solid var(--bdr)", background: "var(--elev)", whiteSpace: "nowrap", position: "sticky", left: 0, zIndex: 1 }}>NGÀY ↓</th>
                {visibleTickers.map((tk) => (
                  <th key={tk.key} title={tk.name} style={{ fontSize: 10, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".07em", padding: "8px 10px", borderBottom: "0.5px solid var(--bdr)", textAlign: "center", background: "var(--elev)", whiteSpace: "nowrap" }}>{tk.key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageDates.map((date) => (
                <tr key={date}>
                  <td style={{ padding: "7px 14px", fontSize: 13, color: "var(--t3)", borderBottom: "0.5px solid var(--bdrs)", whiteSpace: "nowrap", position: "sticky", left: 0, background: "var(--surf)" }}>{fmtDay(date)}</td>
                  {visibleTickers.map((tk) => {
                    const v = matrix[tk.key]?.[date];
                    const cls = valToHmCls(v);
                    return (
                      <td key={tk.key} style={td}>
                        {cls ? <HM cls={cls} val={v.toFixed(2)} /> : <span style={{ color: "var(--t4)" }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {visibleTickers.length === 0 && (
                <tr><td colSpan={2} style={{ padding: 28, textAlign: "center", color: "var(--t3)" }}>Không tìm thấy mã phù hợp.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11, gap: 12, flexWrap: "wrap" }}>
        <HeatLegend />
        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>
      <LiveFooter live={live} updatedAt={updatedAt} extra={`${visibleTickers.length} mã · ${datesDesc.length} phiên · channel smdt-ticker-cross`} />
    </div>
  );
}
