export const FOUR_KEY_LOOKBACK_SESSIONS = 3;

export const FOUR_KEY_META = {
  DS_DN: {
    group: "Đúng sóng - Đúng ngành",
    label: "Đúng sóng - Đúng ngành",
    recommendation: "MUA - tín hiệu thuận cả 2 chiều",
    score: 85,
  },
  DS_SN: {
    group: "Đúng sóng - Sai ngành",
    label: "Đúng sóng - Sai ngành",
    recommendation: "CÂN NHẮC - mã mạnh riêng lẻ, ngược dòng ngành",
    score: 55,
  },
  DN_SS: {
    group: "Đúng ngành - Sai sóng",
    label: "Đúng ngành - Sai sóng",
    recommendation: "THEO DÕI - ngành thuận nhưng mã chưa xác nhận",
    score: 38,
  },
  SS: {
    group: "Sai sóng - Sai ngành",
    label: "Sai sóng - Sai ngành",
    recommendation: "TRÁNH - cả 2 chiều bất lợi",
    score: 15,
  },
};

function toDateSortKey(date) {
  if (!date || typeof date !== "string") return "";
  if (date.includes("/")) {
    const [d, m, y] = date.split("/");
    return d && m && y ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : date;
  }
  return date.slice(0, 10);
}

function toNumber(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function seriesFromMatrix(matrix, datesAsc, key, targetDate) {
  const row = matrix?.[key];
  if (!row || !targetDate) return [];
  const targetValue = toDateSortKey(targetDate);
  return datesAsc
    .filter((date) => toDateSortKey(date) <= targetValue)
    .map((date) => ({ date, smdt: toNumber(row[date]) }))
    .filter((point) => point.smdt != null)
    .sort((a, b) => toDateSortKey(a.date).localeCompare(toDateSortKey(b.date)));
}

function classify4Key(tickerDelta, industryDelta) {
  const dungSong = tickerDelta > 0;
  const dungNganh = industryDelta > 0;
  if (dungSong && dungNganh) return "DS_DN";
  if (dungSong && !dungNganh) return "DS_SN";
  if (!dungSong && dungNganh) return "DN_SS";
  return "SS";
}

function momentumPoint(series, lookbackSessions) {
  if (!Array.isArray(series) || series.length <= lookbackSessions) return null;
  const current = series[series.length - 1];
  const previous = series[series.length - 1 - lookbackSessions];
  return {
    date: current.date,
    value: current.smdt,
    prevDate: previous.date,
    prev: previous.smdt,
    delta: current.smdt - previous.smdt,
  };
}

export function evaluateFourKey({
  ticker,
  industry,
  date,
  tickerSeries,
  industrySeries,
  lookbackSessions = FOUR_KEY_LOOKBACK_SESSIONS,
}) {
  const tickerMomentum = momentumPoint(tickerSeries, lookbackSessions);
  const industryMomentum = momentumPoint(industrySeries, lookbackSessions);
  if (!tickerMomentum || !industryMomentum) return null;

  const evalKey = classify4Key(tickerMomentum.delta, industryMomentum.delta);
  const meta = FOUR_KEY_META[evalKey];

  return {
    ticker,
    industry,
    date,
    evalKey,
    group: meta.group,
    recommendation: meta.recommendation,
    tickerMomentum,
    industryMomentum,
    reason: `Động lượng ${lookbackSessions} phiên: mã ${tickerMomentum.delta >= 0 ? "+" : ""}${tickerMomentum.delta.toFixed(2)}, ngành ${industryMomentum.delta >= 0 ? "+" : ""}${industryMomentum.delta.toFixed(2)}`,
  };
}

export function fallbackEvalKey({ tickerOk, industryOk }) {
  if (tickerOk && industryOk) return "DS_DN";
  if (tickerOk && !industryOk) return "DS_SN";
  if (!tickerOk && industryOk) return "DN_SS";
  return "SS";
}

export function scorePortfolio4Key(rows) {
  const n = rows.length || 1;
  const dn = rows.filter((row) => row.evalKey === "DS_DN").length;
  const sn = rows.filter((row) => row.evalKey === "DS_SN").length;
  const ns = rows.filter((row) => row.evalKey === "DN_SS").length;
  const ss = rows.filter((row) => row.evalKey === "SS").length;
  const score = Math.round(
    (dn / n) * FOUR_KEY_META.DS_DN.score
    + (sn / n) * FOUR_KEY_META.DS_SN.score
    + (ns / n) * FOUR_KEY_META.DN_SS.score
    + (ss / n) * FOUR_KEY_META.SS.score
  );
  return { dn, sn, ns, ss, score };
}
