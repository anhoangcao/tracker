import { T, mono } from "../styles/tokens";
import { DONUT_SEGMENTS } from "../data/dashboardData";

/* ─────────────────────────── DONUT CHART ───────────────────────────── */
export const DonutChart = ({ size = 110, thickness = 12 }) => {
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.surface3} strokeWidth={thickness} />
      {DONUT_SEGMENTS.map((seg, i) => {
        const dash = (seg.pct / 100) * circ;
        const gap = circ - dash;
        const off = -((cum / 100) * circ) - circ * 0.25;
        cum += seg.pct;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={off}
            strokeLinecap="round"
          />
        );
      })}
      <text
        x={size / 2}
        y={size / 2 - 6}
        textAnchor="middle"
        style={{ ...mono }}
        fontSize={size === 72 ? 14 : 20}
        fontWeight={500}
        fill={T.accent}
      >
        {DONUT_SEGMENTS[0].pct}
      </text>
      <text x={size / 2} y={size / 2 + 8} textAnchor="middle" fontFamily="Inter" fontSize={9} fill={T.text3}>
        /100
      </text>
      <text x={size / 2} y={size / 2 + 20} textAnchor="middle" fontFamily="Inter" fontSize={9} fill={T.text3}>
        CHỜ MUA
      </text>
    </svg>
  );
};
