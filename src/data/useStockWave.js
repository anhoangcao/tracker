import { useCallback, useEffect, useRef, useState } from "react";

/* ───────────────────────────────────────────────────────────────────────
 * useStockWave — nguồn dữ liệu "Sóng cổ phiếu"
 *
 * - Tải snapshot từ API getStockWave qua proxy nội bộ.
 * - Chuẩn hoá waveDatas thành danh sách theo ngày, dễ render bảng/biểu đồ.
 * - Có cache RAM + localStorage để giữ giao diện ổn định khi remount.
 * ─────────────────────────────────────────────────────────────────────── */

const API_URL = "/api/stock-wave?limit=150";
const DEFAULT_REFRESH_MS = 15_000;
const CACHE_KEY = "stock_wave_data_cache";

let globalCache = null;

function getRefreshMs() {
  const configured = Number(import.meta.env.VITE_STOCK_WAVE_REFRESH_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_REFRESH_MS;
}

function toNumber(value, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalize(reply) {
  const stockWaves = reply?.StockWaveRequest?.stockWaves;
  const waveDatas = Array.isArray(stockWaves?.waveDatas) ? stockWaves.waveDatas : [];

  const rows = waveDatas
    .filter((item) => item?.date)
    .map((item) => ({
      date: item.date,
      buy: toNumber(item.buy),
      waitbuy: toNumber(item.waitbuy),
      waitsell: toNumber(item.waitsell),
      sell: toNumber(item.sell),
      total: toNumber(item.total),
      reliability: toNumber(item.reliability),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    name: stockWaves?.name || "ALL",
    rows,
  };
}

function getCachedData() {
  if (globalCache) return globalCache;
  try {
    const serialized = localStorage.getItem(CACHE_KEY);
    if (!serialized) return null;
    const parsed = JSON.parse(serialized);
    if (parsed && Array.isArray(parsed.rows)) {
      globalCache = {
        name: parsed.name || "ALL",
        rows: parsed.rows,
        updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : null,
      };
      return globalCache;
    }
  } catch (e) {
    console.warn("Failed to load stock wave cache:", e);
  }
  return null;
}

function setCachedData(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        name: data.name,
        rows: data.rows,
        updatedAt: data.updatedAt ? data.updatedAt.toISOString() : null,
      })
    );
  } catch (e) {
    console.warn("Failed to save stock wave cache:", e);
  }
}

export function useStockWave() {
  const inFlightRef = useRef(null);

  const [state, setState] = useState(() => {
    const cached = getCachedData();
    return cached ? { name: cached.name, rows: cached.rows } : { name: "ALL", rows: [] };
  });

  const [status, setStatus] = useState(() => (getCachedData() ? "ready" : "loading"));
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(() => getCachedData()?.updatedAt || null);

  const fetchSnapshot = useCallback(async ({ background = false, force = false } = {}) => {
    if (inFlightRef.current && !force) return inFlightRef.current;

    const request = (async () => {
      if (!background) {
        setStatus((s) => (s === "ready" ? "ready" : "loading"));
      }

      const startedAt = Date.now();
      try {
        const separator = API_URL.includes("?") ? "&" : "?";
        const res = await fetch(`${API_URL}${separator}_=${startedAt}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const code = json?.StockWaveRequest?.codeReply?.codeID;
        if (code && code !== "S0000") throw new Error(`API ${code}`);

        const normalized = normalize(json);
        const now = new Date();

        setState(normalized);
        setUpdatedAt(now);
        setStatus("ready");
        setError(null);

        const cacheVal = { ...normalized, updatedAt: now };
        globalCache = cacheVal;
        setCachedData(cacheVal);
      } catch (e) {
        console.error("Stock wave fetch error:", e);
        const cached = getCachedData();
        if (cached) {
          setError(null);
          setStatus("ready");
        } else {
          setError(e.message || "Lỗi tải dữ liệu");
          setStatus("error");
        }
      } finally {
        if (inFlightRef.current === request) {
          inFlightRef.current = null;
        }
      }
    })();

    inFlightRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    fetchSnapshot();

    const refresh = () => {
      if (document.visibilityState === "visible") {
        fetchSnapshot({ background: true });
      }
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

  return { ...state, status, error, updatedAt, refresh: () => fetchSnapshot({ force: true }) };
}
