import { useCallback, useEffect, useRef, useState } from "react";
import { readDataCache, writeDataCache } from "./cacheStorage";

const API_URL = "/api/performance";
const CACHE_KEY_PREFIX = "performance_by_branch_path";
const CACHE_SCHEMA_VERSION = 1;

function toNumber(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeRow(row) {
  const ticker = String(row?.ticker || "").trim().toUpperCase();
  if (!ticker) return null;

  return {
    ticker,
    branch: row?.branch || "",
    branchPath: row?.branch_path || "",
    leadDate: row?.lead_date || null,
    leadMonth: row?.lead_month || "",
    percent: toNumber(row?.percent),
    bottomDate: row?.bottom_date || null,
    topDate: row?.top_date || null,
    bottomPrice: toNumber(row?.bottom_price),
    topPrice: toNumber(row?.top_price),
    performancePct: toNumber(row?.performance_pct),
    updatedAt: row?.updated_at || null,
  };
}

function normalize(reply) {
  const rows = Array.isArray(reply?.data) ? reply.data.map(normalizeRow).filter(Boolean) : [];
  return {
    status: reply?.status || "ok",
    filter: reply?.filter || {},
    total: Number.isFinite(Number(reply?.total)) ? Number(reply.total) : rows.length,
    rows,
  };
}

function cacheKey(branchPath) {
  return `${CACHE_KEY_PREFIX}:${branchPath}`;
}

function readCache(branchPath) {
  if (!branchPath) return null;
  try {
    return readDataCache(cacheKey(branchPath), { schemaVersion: CACHE_SCHEMA_VERSION });
  } catch {
    return null;
  }
}

function writeCache(branchPath, value) {
  if (!branchPath) return;
  try {
    writeDataCache(cacheKey(branchPath), value, { schemaVersion: CACHE_SCHEMA_VERSION });
  } catch {
    // Bỏ qua nếu trình duyệt chặn hoặc quota localStorage đầy.
  }
}

export function usePerformance(branchPath) {
  const inFlightRef = useRef(null);
  const inFlightPathRef = useRef("");
  const latestPathRef = useRef(branchPath);
  const cached = readCache(branchPath);
  const [state, setState] = useState(() => cached?.state || { rows: [], filter: {}, total: 0 });
  const [status, setStatus] = useState(() => (branchPath ? (cached?.state ? "ready" : "loading") : "idle"));
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(() => (cached?.updatedAt ? new Date(cached.updatedAt) : null));
  latestPathRef.current = branchPath;

  const fetchSnapshot = useCallback(async ({ force = false } = {}) => {
    if (!branchPath) {
      setState({ rows: [], filter: {}, total: 0 });
      setStatus("idle");
      setError(null);
      return null;
    }
    if (inFlightRef.current && inFlightPathRef.current === branchPath && !force) return inFlightRef.current;
    const localCached = readCache(branchPath);
    if (!force && localCached?.state) {
      setState(localCached.state);
      setUpdatedAt(localCached.updatedAt ? new Date(localCached.updatedAt) : null);
      setStatus("ready");
      setError(null);
    } else if (!force) {
      setState({ rows: [], filter: {}, total: 0 });
    }

    const request = (async () => {
      setStatus((current) => (current === "ready" ? "ready" : "loading"));
      try {
        const url = `${API_URL}?branch_path=${encodeURIComponent(branchPath)}`;
        const response = await fetch(force ? `${url}&_=${Date.now()}` : url, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const normalized = normalize(await response.json());
        const now = new Date();
        if (latestPathRef.current === branchPath) {
          setState(normalized);
          setUpdatedAt(now);
          setStatus("ready");
          setError(null);
        }
        writeCache(branchPath, { state: normalized, updatedAt: now.toISOString() });
      } catch (err) {
        const fallback = readCache(branchPath);
        if (fallback?.state && latestPathRef.current === branchPath) {
          setState(fallback.state);
          setUpdatedAt(fallback.updatedAt ? new Date(fallback.updatedAt) : null);
          setStatus("ready");
          setError(null);
        } else if (latestPathRef.current === branchPath) {
          setStatus("error");
          setError(err?.message || "Lỗi tải dữ liệu performance");
        }
      } finally {
        if (inFlightRef.current === request) inFlightRef.current = null;
        if (inFlightRef.current === null) inFlightPathRef.current = "";
      }
    })();

    inFlightRef.current = request;
    inFlightPathRef.current = branchPath;
    return request;
  }, [branchPath]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { ...state, status, error, updatedAt, refresh: () => fetchSnapshot({ force: true }) };
}
