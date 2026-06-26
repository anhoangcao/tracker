import { useMemo, useState } from "react";
import { useCashFlowBranch, useRealtimeCashFlowFeed, contentToSig } from "../../data/useCashFlowBranch";
import { fmtDay, fmtFull, SESSION_OPTIONS } from "../../app/formatters";
import { Card, TableWrap, Pagination, Sig, Banner, LiveFooter } from "../../components/ui";
import { SMDTToolbarPill, SMDTFilterChips, SMDTSearchPill, linkBtn } from "../../components/ui/ModuleControls";

export function ModDongTienNganh() {
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 11 }}>
        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>
      <LiveFooter live={live} updatedAt={updatedAt} extra={`${visibleBranches.length} ngành · ${datesDesc.length} phiên`} />
    </div>
  );
}
