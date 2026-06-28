/* ─────────────────────────── MOBILE MATRIX CARDS ───────────────────────────
 * Hiển thị các bảng ma trận nhiệt (ngày × ngành/mã) dưới dạng card cho mobile.
 * Mỗi card = 1 thực thể (ngành/mã): tín hiệu phiên đang chọn (to, nổi bật) +
 * dải các phiên gần đây. Thành phần thuần trình bày — phần tô màu do tính năng
 * truyền vào qua `entity.render(date, variant)`.
 *
 *   groups   : [{ industry, count, collapsed, onToggle, entities }]
 *              industry = null  → không hiện tiêu đề nhóm.
 *   entities : [{ key, title, subtitle, render(date, "lg" | "sm") }]
 *   sessions : [{ date, label, isActive, isLatest }]  (mới → cũ)
 *   activeDate : giá trị ngày cho badge lớn.
 * ─────────────────────────────────────────────────────────────────────────── */

function SessionStrip({ entity, sessions }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        marginTop: 11,
        paddingTop: 11,
        borderTop: "0.5px solid var(--bdrs)",
      }}
    >
      {sessions.map((s) => (
        <div
          key={s.date}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0, minWidth: 46 }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: s.isActive ? 800 : 700,
              color: s.isActive ? "var(--B)" : "var(--t4)",
              whiteSpace: "nowrap",
            }}
          >
            {s.label}
          </span>
          {entity.render(s.date, "sm")}
        </div>
      ))}
    </div>
  );
}

function EntityCard({ entity, sessions, activeDate, activeLabel }) {
  return (
    <div
      style={{
        background: "var(--surf)",
        border: "0.5px solid var(--bdr)",
        borderRadius: 11,
        padding: "12px 13px",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "var(--t1)", fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entity.title}
          </div>
          {entity.subtitle && (
            <div style={{ color: "var(--t4)", fontSize: 11, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entity.subtitle}
            </div>
          )}
          {activeLabel && (
            <div style={{ color: "var(--t3)", fontSize: 10, marginTop: 3, fontWeight: 600 }}>Phiên {activeLabel}</div>
          )}
        </div>
        <div style={{ flexShrink: 0 }}>{entity.render(activeDate, "lg")}</div>
      </div>
      {sessions.length > 0 && <SessionStrip entity={entity} sessions={sessions} />}
    </div>
  );
}

export function MatrixCards({ groups, sessions, activeDate, activeLabel, emptyText = "Không có dữ liệu phù hợp." }) {
  const isEmpty = groups.every((g) => g.entities.length === 0);
  if (isEmpty) {
    return (
      <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>{emptyText}</div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {groups.map((group, gi) => {
        if (group.entities.length === 0) return null;
        return (
          <div key={group.industry ?? gi}>
            {group.industry && (
              <button
                type="button"
                onClick={group.onToggle}
                disabled={!group.onToggle}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 11px",
                  marginBottom: 8,
                  borderRadius: 9,
                  background: "var(--elev)",
                  border: "0.5px solid var(--bdr)",
                  cursor: group.onToggle ? "pointer" : "default",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <span style={{ flex: 1, minWidth: 0, color: "var(--t1)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {group.industry}
                </span>
                {Number.isFinite(group.count) && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: "var(--B)", background: "var(--Bs)", borderRadius: 5, padding: "2px 7px" }}>
                    {group.count}
                  </span>
                )}
                {group.onToggle && (
                  <i className={`ti ti-chevron-${group.collapsed ? "down" : "up"}`} style={{ fontSize: 14, color: "var(--t4)" }} />
                )}
              </button>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 9 }}>
              {group.entities.map((entity) => (
                <EntityCard key={entity.key} entity={entity} sessions={sessions} activeDate={activeDate} activeLabel={activeLabel} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
