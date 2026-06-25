import { useMemo, useState } from "react";
import { T, mono } from "../../styles/tokens";
import { useStockWave } from "../../data/useStockWave";

const SESSION_OPTIONS = [10, 25, 50];

const fmtDay = (iso) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

const fmtFull = (iso) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

/* ─────────────────────────── SECTION: STOCK WAVE ───────────────────── */
export default function StockWave() {
  const { name, rows, status, error, updatedAt, refresh } = useStockWave();
  const [sessions, setSessions] = useState(25);
  const [page, setPage] = useState(1);

  const rowsDesc = useMemo(() => [...rows].reverse(), [rows]);
  const latest = rowsDesc[0] || null;
  const totalPages = Math.max(1, Math.ceil(rowsDesc.length / sessions));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => rowsDesc.slice((safePage - 1) * sessions, safePage * sessions),
    [rowsDesc, safePage, sessions]
  );

  const rangeLabel =
    pageRows.length > 0
      ? `${fmtFull(pageRows[pageRows.length - 1].date)} - ${fmtFull(pageRows[0].date)}`
      : "-";

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "22px 24px 26px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: T.text }}>
            Sóng cổ phiếu
          </h1>
          <div style={{ marginTop: 4, fontSize: 12, color: T.text3 }}>
            Nhóm dữ liệu: <span style={{ color: T.text2, fontWeight: 600 }}>{name}</span>
          </div>
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
              onChange={(e) => {
                setSessions(Number(e.target.value));
                setPage(1);
              }}
              style={{
                border: "none",
                background: "transparent",
                font: "inherit",
                color: T.text,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
                appearance: "none",
              }}
            >
              {SESSION_OPTIONS.map((n) => (
                <option key={n} value={n} style={{ background: T.surface2, color: T.text }}>
                  {n} phiên
                </option>
              ))}
            </select>
            <ChevronDown />
          </ToolButton>
        </div>
      </div>

      {status === "loading" && <Banner>Đang tải dữ liệu...</Banner>}
      {status === "error" && (
        <Banner tone="error">
          Lỗi tải dữ liệu: {error}{" "}
          <button onClick={refresh} style={linkBtn}>
            Thử lại
          </button>
        </Banner>
      )}

      {status === "ready" && latest && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <MetricCard label="Tổng mã theo dõi" value={formatNumber(latest.total)} sub={fmtFull(latest.date)} />
            <MetricCard label="Mua / Chờ mua" value={`${formatNumber(latest.buy)} / ${formatNumber(latest.waitbuy)}`} tone="buy" />
            <MetricCard label="Bán / Chờ bán" value={`${formatNumber(latest.sell)} / ${formatNumber(latest.waitsell)}`} tone="sell" />
            <MetricCard label="Độ tin cậy" value={`${latest.reliability.toFixed(0)}%`} tone="info" />
          </div>

          <WaveBar row={latest} />
        </>
      )}

      {status === "ready" && (
        <div style={{ overflowX: "auto", marginTop: 18 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr>
                <Th>NGÀY</Th>
                <Th center>CHỜ MUA</Th>
                <Th center>MUA</Th>
                <Th center>CHỜ BÁN</Th>
                <Th center>BÁN</Th>
                <Th center>TỔNG</Th>
                <Th center>ĐỘ TIN CẬY</Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.date} style={{ borderTop: `1px solid ${T.border}` }}>
                  <td style={{ padding: "13px 10px 13px 0", fontWeight: 600, color: T.text, whiteSpace: "nowrap" }}>
                    {fmtDay(row.date)}
                  </td>
                  <NumberCell value={row.waitbuy} tone="waitbuy" total={row.total} />
                  <NumberCell value={row.buy} tone="buy" total={row.total} />
                  <NumberCell value={row.waitsell} tone="waitsell" total={row.total} />
                  <NumberCell value={row.sell} tone="sell" total={row.total} />
                  <td style={{ padding: "8px 10px", textAlign: "center", color: T.text2, ...mono }}>
                    {formatNumber(row.total)}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                    <Reliability value={row.reliability} />
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 28, textAlign: "center", color: T.text3 }}>
                    Chưa có dữ liệu sóng cổ phiếu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {status === "ready" && totalPages > 1 && (
        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
      )}

      {updatedAt && (
        <div
          style={{
            marginTop: 14,
            fontSize: 11,
            color: T.text3,
            textAlign: "right",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 6,
          }}
        >
          <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: T.text3 }} />
          <span style={{ color: T.text3, fontWeight: 600 }}>Định kỳ</span>
          <span>
            · Dữ liệu cập nhật: {updatedAt.toLocaleTimeString("vi-VN")} · {rowsDesc.length} phiên
          </span>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, tone }) {
  const color = tone === "buy" ? T.buy : tone === "sell" ? T.sell : tone === "info" ? T.info : T.text;
  const bg = tone === "buy" ? T.buyDim : tone === "sell" ? T.sellDim : tone === "info" ? "rgba(91,156,246,.10)" : T.surface2;

  return (
    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "13px 14px" }}>
      <div style={{ fontSize: 11, color: T.text3, letterSpacing: ".03em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", minHeight: 30, padding: "3px 9px", borderRadius: 7, background: bg, color, fontSize: 20, fontWeight: 700 }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: 7, fontSize: 12, color: T.text3 }}>{sub}</div>}
    </div>
  );
}

function WaveBar({ row }) {
  const segments = [
    { label: "Chờ mua", value: row.waitbuy, color: T.accent },
    { label: "Mua", value: row.buy, color: T.buy },
    { label: "Chờ bán", value: row.waitsell, color: T.warn },
    { label: "Bán", value: row.sell, color: T.sell },
  ];

  return (
    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10, fontSize: 12, color: T.text2 }}>
        <span style={{ fontWeight: 600, color: T.text }}>Cấu trúc sóng phiên mới nhất</span>
        <span>{fmtFull(row.date)}</span>
      </div>
      <div style={{ display: "flex", height: 12, overflow: "hidden", borderRadius: 999, background: T.surface3 }}>
        {segments.map((segment) => (
          <div
            key={segment.label}
            title={`${segment.label}: ${segment.value}`}
            style={{
              width: `${pct(segment.value, row.total)}%`,
              minWidth: segment.value > 0 ? 4 : 0,
              background: segment.color,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", marginTop: 11 }}>
        {segments.map((segment) => (
          <div key={segment.label} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: T.text2 }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: segment.color }} />
            <span>{segment.label}</span>
            <span style={{ ...mono, color: T.text }}>{formatNumber(segment.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberCell({ value, tone, total }) {
  const styles = {
    waitbuy: { bg: T.accentDim, color: T.accent },
    buy: { bg: T.buyDim, color: T.buy },
    waitsell: { bg: T.warnDim, color: T.warn },
    sell: { bg: T.sellDim, color: T.sell },
  };
  const s = styles[tone];

  return (
    <td style={{ padding: "8px 10px", textAlign: "center" }}>
      <span
        style={{
          ...mono,
          display: "inline-flex",
          justifyContent: "center",
          minWidth: 56,
          padding: "6px 10px",
          borderRadius: 7,
          background: s.bg,
          color: s.color,
          fontSize: 13,
        }}
        title={`${pct(value, total)}%`}
      >
        {formatNumber(value)}
      </span>
    </td>
  );
}

function Reliability({ value }) {
  const color = value >= 70 ? T.buy : value >= 40 ? T.warn : T.text3;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 106 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: T.surface3, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: color }} />
      </div>
      <span style={{ ...mono, width: 34, color, fontSize: 12, textAlign: "right" }}>{value.toFixed(0)}%</span>
    </div>
  );
}

function ToolButton({ children, as: Tag = "button", ...rest }) {
  return (
    <Tag
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 40,
        padding: "0 13px",
        background: T.surface2,
        border: `1px solid ${T.border}`,
        borderRadius: 11,
        font: "inherit",
        fontSize: 13,
        color: T.text2,
        cursor: "pointer",
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
      <PageBtn disabled={page === 1} onClick={() => onChange(page - 1)}>
        ‹
      </PageBtn>
      {items.map((it, i) =>
        it === "..." ? (
          <span key={`e${i}`} style={{ color: T.text3, padding: "0 4px" }}>
            ...
          </span>
        ) : (
          <PageBtn key={it} active={it === page} onClick={() => onChange(it)}>
            {it}
          </PageBtn>
        )
      )}
      <PageBtn disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        ›
      </PageBtn>
    </div>
  );
}

function PageBtn({ children, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 36,
        height: 36,
        padding: "0 9px",
        borderRadius: 9,
        font: "inherit",
        fontWeight: 600,
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
  if (start > 2) items.push("...");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("...");
  items.push(total);
  return items;
}

const Th = ({ children, center }) => (
  <th
    style={{
      textAlign: center ? "center" : "left",
      padding: "0 10px 13px",
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: ".03em",
      color: T.text3,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </th>
);

const Banner = ({ children, tone }) => (
  <div
    style={{
      padding: "13px 15px",
      borderRadius: 11,
      marginBottom: 14,
      fontSize: 13,
      background: tone === "error" ? T.sellDim : T.surface2,
      color: tone === "error" ? T.sell : T.text2,
    }}
  >
    {children}
  </div>
);

const linkBtn = {
  border: "none",
  background: "none",
  color: T.accent,
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "underline",
};

const CalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const ChevronDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.text2} strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);
