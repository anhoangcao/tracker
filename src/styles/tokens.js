/* ─────────────────────────── DESIGN TOKENS ─────────────────────────── */
export const T = {
  bg: "#0D0F14",
  surface: "#141720",
  surface2: "#1C2030",
  surface3: "#242840",
  border: "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.12)",
  text: "#F0F2F8",
  text2: "#8B90A8",
  text3: "#565C7A",
  accent: "#A78BFA",
  accentDim: "rgba(167,139,250,0.15)",
  accentDim2: "rgba(167,139,250,0.07)",
  buy: "#4AE3A0",
  sell: "#F0645A",
  warn: "#F0A045",
  info: "#5B9CF6",
  buyDim: "rgba(74,227,160,0.10)",
  sellDim: "rgba(240,100,90,0.10)",
  warnDim: "rgba(240,160,69,0.10)",
};

/* Shared monospace text style */
export const mono = { fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 };

/* ─────────────────────────── GLOBAL STYLES ─────────────────────────── */
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body, #root { height: 100%; background: ${T.bg}; color: ${T.text}; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.5; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.surface3}; border-radius: 2px; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
`;

/* Per-stock badge colors */
export const stockColors = {
  ssi: { bg: "rgba(240,100,90,.15)", color: T.sell },
  vci: { bg: "rgba(91,156,246,.15)", color: T.info },
  dig: { bg: "rgba(91,156,246,.12)", color: "#7CB3FA" },
  hpg: { bg: "rgba(240,160,69,.12)", color: T.warn },
  stb: { bg: "rgba(74,227,160,.12)", color: T.buy },
  gas: { bg: "rgba(155,100,240,.12)", color: "#B07EF8" },
};

/* Flow-tag style by type (buy / sell / warn) */
export const tagStyle = (type) => ({
  fontSize: 10,
  padding: "2px 7px",
  borderRadius: 4,
  fontWeight: 500,
  whiteSpace: "nowrap",
  ...(type === "buy" ? { background: T.buyDim, color: T.buy } : {}),
  ...(type === "sell" ? { background: T.sellDim, color: T.sell } : {}),
  ...(type === "warn" ? { background: T.warnDim, color: T.warn } : {}),
});
