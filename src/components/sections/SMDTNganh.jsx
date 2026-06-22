import { useMemo, useState } from "react";
import { T, mono } from "../../styles/tokens";
import { useSMDT, useRealtimeFeed } from "../../data/useSMDT";

/* Phối màu ô theo giá trị SMDT (sức mạnh dòng tiền) — tông dark. */
function cellTone(v) {
  if (v == null || Number.isNaN(v)) return { bg: T.surface2, color: T.text3 };
  if (v >= 80) return { bg: "rgba(74,227,160,.22)", color: T.buy };
  if (v >= 55) return { bg: "rgba(74,227,160,.12)", color: T.buy };
  if (v >= 30) return { bg: "rgba(240,160,69,.16)", color: T.warn };
  if (v >= 10) return { bg: "rgba(240,100,90,.14)", color: T.sell };
  return { bg: "rgba(240,100,90,.24)", color: T.sell };
}

const fmtDay = (iso) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
const fmtFull = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const SESSION_OPTIONS = [10, 25, 50];

/* ─────────────────────────── SECTION: SMDT NGÀNH ───────────────────── */
export default function SMDTNganh() {
  const { branches, datesAsc, matrix, status, error, updatedAt, refresh, applyTick } = useSMDT();

  // Cắm feed realtime (Kafka -> WebSocket). No-op nếu chưa cấu hình URL.
  useRealtimeFeed(applyTick);

  const [tab, setTab] = useState("core"); // core | sub
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState(25);
  const [page, setPage] = useState(1);

  const coreCount = branches.filter((b) => b.isCore).length;
  const subCount = branches.length - coreCount;

  // Cột ngành hiển thị: lọc theo tab + ô tìm kiếm.
  const visibleBranches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return branches
      .filter((b) => (tab === "core" ? b.isCore : !b.isCore))
      .filter((b) => (q ? b.label.toLowerCase().includes(q) : true));
  }, [branches, tab, query]);

  // Hàng = các phiên gần nhất (mới nhất trước), phân trang theo số phiên.
  const datesDesc = useMemo(() => [...datesAsc].reverse(), [datesAsc]);
  const totalPages = Math.max(1, Math.ceil(datesDesc.length / sessions));
  const safePage = Math.min(page, totalPages);
  const pageDates = useMemo(
    () => datesDesc.slice((safePage - 1) * sessions, safePage * sessions),
    [datesDesc, safePage, sessions]
  );

  const rangeLabel =
    pageDates.length > 0
      ? `${fmtFull(pageDates[pageDates.length - 1])} - ${fmtFull(pageDates[0])}`
      : "—";

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "22px 24px 26px",
      }}
    >
      {/* Tiêu đề */}
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 18, color: T.text }}>
        Sức mạnh dòng tiền ngành
      </h1>

      {/* Thanh công cụ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {/* Pill toggle Chủ lực / Ngành phụ */}
        <div style={{ display: "inline-flex", background: T.surface2, borderRadius: 11, padding: 4 }}>
          <TabPill active={tab === "core"} onClick={() => { setTab("core"); setPage(1); }} label="Chủ lực" count={coreCount} />
          <TabPill active={tab === "sub"} onClick={() => { setTab("sub"); setPage(1); }} label="Ngành phụ" count={subCount} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <ToolButton>
            <CalIcon />
            <span style={{ color: T.text }}>{rangeLabel}</span>
          </ToolButton>

          <ToolButton as="label">
            <span style={{ color: T.text2 }}>Hiển thị</span>
            <select
              value={sessions}
              onChange={(e) => { setSessions(Number(e.target.value)); setPage(1); }}
              style={{
                border: "none", background: "transparent", font: "inherit", color: T.text,
                fontWeight: 600, cursor: "pointer", outline: "none", appearance: "none",
              }}
            >
              {SESSION_OPTIONS.map((n) => (
                <option key={n} value={n} style={{ background: T.surface2, color: T.text }}>{n} phiên</option>
              ))}
            </select>
            <ChevronDown />
          </ToolButton>

          <div
            style={{
              display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 13px",
              background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 11, minWidth: 210,
            }}
          >
            <SearchIcon />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm ngành..."
              style={{ border: "none", outline: "none", background: "transparent", font: "inherit", color: T.text, width: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* Trạng thái */}
      {status === "loading" && <Banner>Đang tải dữ liệu…</Banner>}
      {status === "error" && (
        <Banner tone="error">
          Lỗi tải dữ liệu: {error}{" "}
          <button onClick={refresh} style={linkBtn}>Thử lại</button>
        </Banner>
      )}

      {/* Bảng */}
      {status === "ready" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                <Th sticky>NGÀY</Th>
                {visibleBranches.map((b) => (
                  <Th key={b.key} center>{b.label.toUpperCase()}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageDates.map((date) => (
                <tr key={date} style={{ borderTop: `1px solid ${T.border}` }}>
                  <td style={{ padding: "13px 6px", fontWeight: 600, color: T.text, whiteSpace: "nowrap", position: "sticky", left: 0, background: T.surface }}>
                    {fmtDay(date)}
                  </td>
                  {visibleBranches.map((b) => {
                    const v = matrix[b.key]?.[date];
                    const has = v != null && !Number.isNaN(v);
                    const tone = cellTone(v);
                    return (
                      <td key={b.key} style={{ padding: "7px 10px", textAlign: "center" }}>
                        <span
                          style={{
                            ...mono,
                            display: "inline-block", minWidth: 60, padding: "6px 12px", borderRadius: 7,
                            fontSize: 13, background: tone.bg, color: tone.color,
                          }}
                        >
                          {has ? v.toFixed(2) : "-"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {visibleBranches.length === 0 && (
                <tr><td colSpan={2} style={{ padding: 28, textAlign: "center", color: T.text3 }}>Không tìm thấy ngành phù hợp.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Phân trang */}
      {status === "ready" && totalPages > 1 && (
        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
      )}

      {/* Chân: cập nhật lúc */}
      {updatedAt && (
        <div style={{ marginTop: 14, fontSize: 11, color: T.text3, textAlign: "right" }}>
          Dữ liệu cập nhật: {updatedAt.toLocaleTimeString("vi-VN")} · {visibleBranches.length} ngành · {datesDesc.length} phiên
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── SUB COMPONENTS ────────────────────────── */
function TabPill({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, border: "none", cursor: "pointer",
        padding: "7px 15px", borderRadius: 8, font: "inherit", fontWeight: 600, fontSize: 13,
        background: active ? T.accent : "transparent",
        color: active ? "#fff" : T.text2,
        transition: "all .15s",
      }}
    >
      {label}
      <span
        style={{
          fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
          background: active ? "rgba(255,255,255,.22)" : T.surface3,
          color: active ? "#fff" : T.text2,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function ToolButton({ children, as: Tag = "button", ...rest }) {
  return (
    <Tag
      {...rest}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 13px",
        background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 11, font: "inherit",
        fontSize: 13, color: T.text2, cursor: "pointer",
      }}
    >
      {children}
    </Tag>
  );
}

function Pagination({ page, totalPages, onChange }) {
  const items = useMemo(() => buildPageItems(page, totalPages), [page, totalPages]);
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 7, marginTop: 22 }}>
      <PageBtn disabled={page === 1} onClick={() => onChange(page - 1)}>‹</PageBtn>
      {items.map((it, i) =>
        it === "…" ? (
          <span key={`e${i}`} style={{ color: T.text3, padding: "0 4px" }}>…</span>
        ) : (
          <PageBtn key={it} active={it === page} onClick={() => onChange(it)}>{it}</PageBtn>
        )
      )}
      <PageBtn disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</PageBtn>
    </div>
  );
}

function PageBtn({ children, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 36, height: 36, padding: "0 9px", borderRadius: 9, font: "inherit", fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        border: `1px solid ${active ? T.accent : T.border}`,
        background: active ? T.accent : T.surface2,
        color: active ? "#fff" : disabled ? T.text3 : T.text2,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function buildPageItems(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

const Th = ({ children, center, sticky }) => (
  <th
    style={{
      textAlign: center ? "center" : "left",
      padding: "0 10px 13px",
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: ".03em",
      color: T.text3,
      whiteSpace: "nowrap",
      position: sticky ? "sticky" : undefined,
      left: sticky ? 0 : undefined,
      background: sticky ? T.surface : undefined,
    }}
  >
    {children}
  </th>
);

const Banner = ({ children, tone }) => (
  <div
    style={{
      padding: "13px 15px", borderRadius: 11, marginBottom: 14, fontSize: 13,
      background: tone === "error" ? T.sellDim : T.surface2,
      color: tone === "error" ? T.sell : T.text2,
    }}
  >
    {children}
  </div>
);

const linkBtn = { border: "none", background: "none", color: T.accent, font: "inherit", fontWeight: 600, cursor: "pointer", textDecoration: "underline" };

/* ─────────────────────────── ICONS ─────────────────────────────────── */
const CalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
);
const ChevronDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
);
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
);
