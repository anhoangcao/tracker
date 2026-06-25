import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const API_URL = "/api/cashflow-ticker?limit=150";
const DEFAULT_REFRESH_MS = 15_000;
const CACHE_KEY = "cashflow_ticker_data_cache";
const CHANNELS = ["money-flow-stock"];
const REPLY_KEYS = ["CashFlowTickerReply", "CashFlowTickerRequest"];

export const CONTENT_TO_SIG = {
  "Tiếp tục đổ vào": "si",
  "Nhen nhóm đổ vào": "sn",
  "Đang thoát ra": "so",
  "Tiếp tục thoát ra": "st",
};

export function tickerContentToSig(content) {
  return content ? CONTENT_TO_SIG[content] || null : null;
}

let globalCache = null;

function getRefreshMs() {
  const configured = Number(import.meta.env.VITE_CASHFLOW_TICKER_REFRESH_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_REFRESH_MS;
}

function getReply(data) {
  for (const key of REPLY_KEYS) {
    if (data?.[key]) return data[key];
  }
  return null;
}

function getBucketDate(bucket, index = 0) {
  return bucket?.date || bucket?.tradingDate || bucket?.tradeDate || bucket?.createdDate || bucket?.time || `latest-${index}`;
}

function normalizePercent(percent) {
  if (percent == null) return "";
  return String(percent);
}

function toNumber(value, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTicker(item) {
  const ticker = item?.ticker || item?.code || item?.symbol;
  if (!ticker) return null;
  return {
    ticker,
    type: item?.type || item?.exchange || "",
    price: toNumber(item?.price),
    percent: normalizePercent(item?.percent),
    content: item?.content || "",
  };
}

function sortRows(rows) {
  return [...rows].sort((a, b) => a.ticker.localeCompare(b.ticker));
}

function normalize(reply) {
  const buckets = getReply(reply)?.cashFlowTickers ?? reply?.cashFlowTickers ?? [];
  const normalizedBuckets = buckets
    .map((bucket, index) => {
      const date = getBucketDate(bucket, index);
      const rows = (bucket?.cashTickerDatas ?? bucket?.cashFlowTickerDatas ?? [])
        .map(normalizeTicker)
        .filter(Boolean);
      return { date, rows: sortRows(rows) };
    })
    .filter((bucket) => bucket.rows.length > 0)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return { buckets: normalizedBuckets };
}

function bucketKey(date, ticker) {
  return `${date}\u0000${ticker}`;
}

function mergeTicks(state, ticks) {
  if (ticks.length === 0) return state;

  const bucketMap = new Map(state.buckets.map((bucket) => [bucket.date, new Map(bucket.rows.map((row) => [row.ticker, row]))]));

  for (const tick of ticks) {
    const date = tick.date || state.buckets[state.buckets.length - 1]?.date || new Date().toISOString().slice(0, 10);
    if (!bucketMap.has(date)) bucketMap.set(date, new Map());
    bucketMap.get(date).set(tick.ticker, {
      ticker: tick.ticker,
      type: tick.type || "",
      price: toNumber(tick.price),
      percent: normalizePercent(tick.percent),
      content: tick.content || "",
    });
  }

  const buckets = [...bucketMap.entries()]
    .map(([date, rows]) => ({ date, rows: sortRows([...rows.values()]) }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-150);

  return { ...state, buckets };
}

function overlayFreshTicks(normalized, touchedMap, sinceMs) {
  if (!touchedMap || touchedMap.size === 0) return normalized;
  const freshTicks = [];
  for (const [key, value] of [...touchedMap]) {
    if (value.at < sinceMs) {
      touchedMap.delete(key);
      continue;
    }
    freshTicks.push(value.row);
  }
  return mergeTicks(normalized, freshTicks);
}

function toRealtimeTick(item, fallbackDate) {
  const row = normalizeTicker(item);
  if (!row) return null;
  return { ...row, date: item?.date || fallbackDate };
}

function extractRealtimeTicks(payload) {
  if (!payload) return [];

  if (typeof payload === "string") {
    try {
      return extractRealtimeTicks(JSON.parse(payload));
    } catch {
      return [];
    }
  }

  if (Array.isArray(payload)) {
    return payload.flatMap(extractRealtimeTicks);
  }

  const data = CHANNELS.includes(payload?.channel) && payload?.data ? payload.data : payload;
  const buckets = getReply(data)?.cashFlowTickers ?? data?.cashFlowTickers;

  if (Array.isArray(buckets)) {
    return buckets.flatMap((bucket, index) => {
      const date = getBucketDate(bucket, index);
      return (bucket.cashTickerDatas ?? bucket.cashFlowTickerDatas ?? [])
        .map((item) => toRealtimeTick(item, date))
        .filter(Boolean);
    });
  }

  if (Array.isArray(data?.cashTickerDatas)) {
    const date = getBucketDate(data, 0);
    return data.cashTickerDatas.map((item) => toRealtimeTick(item, date)).filter(Boolean);
  }

  const tick = toRealtimeTick(data, data?.date);
  return tick ? [tick] : [];
}

function getCachedData() {
  if (globalCache) return globalCache;
  try {
    const serialized = localStorage.getItem(CACHE_KEY);
    if (!serialized) return null;
    const parsed = JSON.parse(serialized);
    if (parsed && Array.isArray(parsed.buckets)) {
      globalCache = {
        buckets: parsed.buckets,
        updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : null,
      };
      return globalCache;
    }
  } catch (e) {
    console.warn("Failed to load CashFlowTicker cache:", e);
  }
  return null;
}

function setCachedData(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        buckets: data.buckets,
        updatedAt: data.updatedAt ? data.updatedAt.toISOString() : null,
      })
    );
  } catch (e) {
    console.warn("Failed to save CashFlowTicker cache:", e);
  }
}

export function useCashFlowTicker() {
  const inFlightRef = useRef(null);
  const realtimeTouchedRef = useRef(new Map());
  const cached = getCachedData();

  const [state, setState] = useState(() => (cached ? { buckets: cached.buckets } : { buckets: [] }));
  const [status, setStatus] = useState(() => (cached ? "ready" : "loading"));
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(() => cached?.updatedAt || null);

  const fetchSnapshot = useCallback(async ({ background = false, force = false } = {}) => {
    if (inFlightRef.current && !force) return inFlightRef.current;

    const request = (async () => {
      if (!background) setStatus((s) => (s === "ready" ? "ready" : "loading"));
      const startedAt = Date.now();
      try {
        const separator = API_URL.includes("?") ? "&" : "?";
        const res = await fetch(`${API_URL}${separator}_=${startedAt}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const code = getReply(json)?.codeReply?.codeID;
        if (code && code !== "S0000") throw new Error(`API ${code}`);

        const normalized = overlayFreshTicks(normalize(json), realtimeTouchedRef.current, startedAt);
        const now = new Date();
        const cacheVal = { ...normalized, updatedAt: now };

        setState(normalized);
        setUpdatedAt(now);
        setStatus("ready");
        setError(null);
        globalCache = cacheVal;
        setCachedData(cacheVal);
      } catch (e) {
        console.error("CashFlowTicker Fetch error:", e);
        const currentCache = getCachedData();
        if (currentCache) {
          setError(null);
          setStatus("ready");
        } else {
          setError(e.message || "Lỗi tải dữ liệu");
          setStatus("error");
        }
      } finally {
        if (inFlightRef.current === request) inFlightRef.current = null;
      }
    })();

    inFlightRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    fetchSnapshot();
    const refresh = () => {
      if (document.visibilityState === "visible") fetchSnapshot({ background: true });
    };
    const timer = window.setInterval(refresh, getRefreshMs());
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchSnapshot]);

  const applyTick = useCallback((payload) => {
    const ticks = extractRealtimeTicks(payload);
    if (ticks.length === 0) return;
    const now = new Date();

    for (const row of ticks) {
      const date = row.date || state.buckets[state.buckets.length - 1]?.date || new Date().toISOString().slice(0, 10);
      realtimeTouchedRef.current.set(bucketKey(date, row.ticker), { row: { ...row, date }, at: now.getTime() });
    }

    setState((prev) => {
      const next = mergeTicks(prev, ticks);
      const cacheVal = { ...next, updatedAt: now };
      globalCache = cacheVal;
      setCachedData(cacheVal);
      return next;
    });
    setUpdatedAt(now);
    setStatus("ready");
    setError(null);
  }, [state.buckets]);

  const latest = state.buckets[state.buckets.length - 1] || null;
  return { ...state, latest, status, error, updatedAt, refresh: () => fetchSnapshot({ force: true }), applyTick };
}

function getRealtimeUrl() {
  const configured = import.meta.env.VITE_CASHFLOW_TICKER_WS_URL || import.meta.env.VITE_CASHFLOW_WS_URL || import.meta.env.VITE_SMDT_WS_URL;
  if (configured) return configured;
  if (typeof window !== "undefined" && window.location.protocol === "https:") return `${window.location.origin}/realtime`;
  return "http://112.213.91.235:3005/realtime";
}

export function useRealtimeCashFlowTickerFeed(onTick) {
  const cbRef = useRef(onTick);
  cbRef.current = onTick;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(getRealtimeUrl(), { autoConnect: true });

    const handlePayload = (payload) => {
      if (extractRealtimeTicks(payload).length > 0) cbRef.current?.(payload);
    };

    socket.on("connect", () => {
      console.log("Socket.IO (cashflow ticker) connected to namespace:", socket.nsp);
      setConnected(true);
      socket.emit("message", { action: "subscribe", channels: CHANNELS });
    });

    socket.onAny((event, ...args) => {
      if (event === "connect" || event === "disconnect" || event === "connect_error") return;
      if (CHANNELS.includes(event) && args.length === 1) {
        handlePayload({ channel: event, data: args[0] });
        return;
      }
      for (const payload of args) handlePayload(payload);
    });

    socket.on("connect_error", (error) => console.error("Socket.IO (cashflow ticker) connection error:", error.message));
    socket.on("disconnect", () => setConnected(false));

    return () => socket.disconnect();
  }, []);

  return { connected };
}
