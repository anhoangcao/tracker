import { useEffect, useRef, useState } from "react";
import { CfBadge } from "./CfBadge";

export function IndustryPicker({ industries, hidden, industrySig, onToggle, onAll, onNone }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const selected = industries.filter((i) => !hidden.has(i)).length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ minHeight: 30, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 14px", borderRadius: 15, background: open ? "var(--Bs)" : "#111827", border: `1px solid ${open ? "var(--Bb)" : "#26324A"}`, color: "var(--B)", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
      >
        <i className="ti ti-stack-2" style={{ fontSize: 14 }} />
        {selected} / {industries.length} ngành
        <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ fontSize: 13 }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 60, width: 340, maxHeight: 440, overflowY: "auto", background: "var(--surf)", border: "1px solid var(--bdr)", borderRadius: 12, padding: 8, boxShadow: "0 16px 48px rgba(0,0,0,.45)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px 10px" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".07em" }}>Chọn ngành</span>
            <span style={{ display: "inline-flex", gap: 12 }}>
              <span onClick={onAll} style={{ fontSize: 12, fontWeight: 700, color: "var(--B)", cursor: "pointer" }}>Tất cả</span>
              <span onClick={onNone} style={{ fontSize: 12, fontWeight: 700, color: "var(--R)", cursor: "pointer" }}>Bỏ hết</span>
            </span>
          </div>
          {industries.map((ind) => {
            const on = !hidden.has(ind);
            return (
              <button
                key={ind}
                onClick={() => onToggle(ind)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 8px", borderRadius: 8, background: on ? "var(--Bs)" : "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", marginBottom: 2 }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", background: on ? "var(--B)" : "transparent", border: `1.5px solid ${on ? "var(--B)" : "var(--bdr)"}`, color: "#fff", flexShrink: 0 }}>
                    {on && <i className="ti ti-check" style={{ fontSize: 12 }} />}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: on ? "var(--t1)" : "var(--t2)" }}>{ind}</span>
                </span>
                <CfBadge sig={industrySig[ind]} small />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
