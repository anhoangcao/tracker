/* ─────────────────────────── SVG ICONS ─────────────────────────────── */
export const Icon = ({ name, size = 16, color = "currentColor", strokeWidth = 1.6 }) => {
  const s = {
    width: size,
    height: size,
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    chart: (
      <>
        <polyline points="2,17 7,11 12,14 22,5" />
        <polyline points="16,5 22,5 22,11" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12,6 12,12 15,14" />
      </>
    ),
    doc: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="13" y2="14" />
      </>
    ),
    bag: (
      <>
        <rect x="2" y="6" width="20" height="15" rx="2" />
        <path d="M8 6V4a4 4 0 0 1 8 0v2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </>
    ),
    bar: (
      <>
        <polyline points="3,18 8,12 13,15 21,6" />
        <line x1="3" y1="22" x2="21" y2="22" />
      </>
    ),
    pulse: (
      <>
        <path d="M3 12h4l2-6 4 12 2-6h6" />
        <circle cx="19" cy="12" r="1.5" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12" y2="17" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    arrow: (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12,5 19,12 12,19" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" style={s}>
      {paths[name]}
    </svg>
  );
};
