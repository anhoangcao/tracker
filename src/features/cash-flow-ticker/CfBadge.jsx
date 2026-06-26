import { useTheme } from "../../theme";
import { hmStyle } from "../../styles/tokens";
import { CF_SIG } from "./cashFlowUtils";

export function CfBadge({ sig, small }) {
  const { t } = useTheme();
  const meta = CF_SIG[sig];
  if (!meta) return <span style={{ color: "var(--t4)" }}>—</span>;
  const s = hmStyle(meta.cls, t);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        whiteSpace: "nowrap",
        fontWeight: 700,
        background: s.bg,
        border: `0.5px solid ${s.border}`,
        color: s.color,
        fontSize: small ? 10 : 11,
        padding: small ? "2px 8px" : "5px 9px",
        minWidth: small ? 0 : 92,
      }}
    >
      {meta.label}
    </span>
  );
}
