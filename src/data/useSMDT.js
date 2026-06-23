import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

/* ───────────────────────────────────────────────────────────────────────
 * useSMDT — nguồn dữ liệu "Sức mạnh dòng tiền ngành"
 *
 * - Tải snapshot ban đầu từ API getSMDTBranch (POST).
 * - Chuẩn hoá thành cấu trúc dễ render cho bảng (ngành × ngày).
 * - Sẵn sàng cho realtime Kafka: dùng `applyTick()` để merge dữ liệu mới
 *   (date, keyName, smdt) vào state, hoặc bật `useRealtimeFeed` (Socket.IO)
 *   trỏ tới Realtime Core.
 * ─────────────────────────────────────────────────────────────────────── */

const API_URL = "/api/smdt?limit=150";

/** keyName -> nhãn hiển thị ngắn gọn cho 6 ngành "Chủ lực". */
export const CORE_BRANCHES = [
  { key: "Ngân hàng", label: "Ngân hàng" },
  { key: "Chứng khoán", label: "Chứng khoán" },
  { key: "BĐS Dân cư", label: "Bất động sản" },
  { key: "Thép", label: "Thép" },
  { key: "Xây dựng", label: "Xây dựng" },
  { key: "Sản xuất và Khai thác dầu khí", label: "Dầu khí" },
];

const CORE_KEYS = new Set(CORE_BRANCHES.map((b) => b.key));

function getBranchLabel(keyName) {
  return CORE_BRANCHES.find((c) => c.key === keyName)?.label || keyName;
}

function sortBranches(branches) {
  return branches.sort((a, b) => {
    if (a.isCore && b.isCore)
      return CORE_BRANCHES.findIndex((c) => c.key === a.key) - CORE_BRANCHES.findIndex((c) => c.key === b.key);
    if (a.isCore) return -1;
    if (b.isCore) return 1;
    return a.label.localeCompare(b.label, "vi");
  });
}

/** Chuẩn hoá payload API -> { branches, datesAsc, matrix }. */
function normalize(reply) {
  const datas = reply?.SMDTBranchReply?.SMDTDatas ?? [];

  // Tập hợp toàn bộ ngày (tăng dần) để làm trục thời gian chung.
  const dateSet = new Set();
  for (const b of datas) for (const p of b.smdts) dateSet.add(p.date);
  const datesAsc = [...dateSet].sort();

  // matrix[keyName][date] = smdt
  const matrix = {};
  const branches = datas.map((b) => {
    const row = {};
    for (const p of b.smdts) row[p.date] = p.smdt;
    matrix[b.keyName] = row;
    return {
      key: b.keyName,
      label: getBranchLabel(b.keyName),
      isCore: CORE_KEYS.has(b.keyName),
    };
  });

  // Đưa các ngành chủ lực lên đầu theo thứ tự khai báo.
  sortBranches(branches);

  return { branches, datesAsc, matrix };
}

function toRealtimeTick(item) {
  const keyName = item?.keyName;
  const date = item?.date;
  const rawSmdt = item?.smdt;
  const smdt = typeof rawSmdt === "number" ? rawSmdt : Number(rawSmdt);

  if (!keyName || !date || rawSmdt == null || !Number.isFinite(smdt)) return null;
  return { keyName, date, smdt };
}

function extractRealtimeTicks(payload) {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.flatMap(extractRealtimeTicks);
  }

  const data = payload?.channel === "smdt-branch" && payload?.data ? payload.data : payload;
  const branchDatas = data?.SMDTBranchReply?.SMDTDatas ?? data?.SMDTDatas;
  if (Array.isArray(branchDatas)) {
    return branchDatas.flatMap(extractRealtimeTicks);
  }

  if (Array.isArray(data?.smdts) && data?.keyName) {
    return data.smdts.map((point) => toRealtimeTick({ ...point, keyName: data.keyName })).filter(Boolean);
  }

  const tick = toRealtimeTick(data);
  return tick ? [tick] : [];
}

const CACHE_KEY = "smdt_data_cache";
let globalCache = null; // RAM Cache to keep data alive across hook remounts

function getCachedData() {
  if (globalCache) return globalCache;
  try {
    const serialized = localStorage.getItem(CACHE_KEY);
    if (!serialized) return null;
    const parsed = JSON.parse(serialized);
    if (parsed && parsed.branches && parsed.datesAsc && parsed.matrix) {
      globalCache = {
        branches: parsed.branches,
        datesAsc: parsed.datesAsc,
        matrix: parsed.matrix,
        updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : null,
      };
      return globalCache;
    }
  } catch (e) {
    console.warn("Failed to load SMDT cache:", e);
  }
  return null;
}

function setCachedData(data) {
  try {
    const toStore = {
      branches: data.branches,
      datesAsc: data.datesAsc,
      matrix: data.matrix,
      updatedAt: data.updatedAt ? data.updatedAt.toISOString() : null,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(toStore));
  } catch (e) {
    console.warn("Failed to save SMDT cache:", e);
  }
}

export function useSMDT() {
  const [state, setState] = useState(() => {
    const cached = getCachedData();
    if (cached) {
      return { branches: cached.branches, datesAsc: cached.datesAsc, matrix: cached.matrix };
    }
    return { branches: [], datesAsc: [], matrix: {} };
  });

  const [status, setStatus] = useState(() => {
    const cached = getCachedData();
    return cached ? "ready" : "loading";
  });

  const [error, setError] = useState(null);

  const [updatedAt, setUpdatedAt] = useState(() => {
    const cached = getCachedData();
    return cached ? cached.updatedAt : null;
  });

  const fetchSnapshot = useCallback(async () => {
    setStatus((s) => (s === "ready" ? "ready" : "loading"));
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const code = json?.SMDTBranchReply?.codeReply?.codeID;
      if (code && code !== "S0000") throw new Error(`API ${code}`);

      const normalized = normalize(json);
      const now = new Date();

      setState(normalized);
      setUpdatedAt(now);
      setStatus("ready");
      setError(null);

      // Save to global and localStorage cache
      const cacheVal = { ...normalized, updatedAt: now };
      globalCache = cacheVal;
      setCachedData(cacheVal);
    } catch (e) {
      console.error("SMDT Fetch error:", e);
      const cached = getCachedData();
      if (cached) {
        setError(null); // Keep display clean if cached data exists
        setStatus("ready");
      } else {
        setError(e.message || "Lỗi tải dữ liệu");
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  /** Merge dữ liệu realtime vào state (dùng cho feed Kafka/Socket.IO). */
  const applyTick = useCallback((payload) => {
    const ticks = extractRealtimeTicks(payload);
    if (ticks.length === 0) return;

    const now = new Date();
    setState((prev) => {
      const matrix = { ...prev.matrix };
      const dateSet = new Set(prev.datesAsc);
      const branchKeys = new Set(prev.branches.map((b) => b.key));
      let branches = prev.branches;

      for (const { keyName, date, smdt } of ticks) {
        matrix[keyName] = { ...(matrix[keyName] || {}), [date]: smdt };
        dateSet.add(date);

        if (!branchKeys.has(keyName)) {
          branchKeys.add(keyName);
          branches = [
            ...branches,
            {
              key: keyName,
              label: getBranchLabel(keyName),
              isCore: CORE_KEYS.has(keyName),
            },
          ];
        }
      }

      const datesAsc = [...dateSet].sort();
      branches = branches === prev.branches ? branches : sortBranches([...branches]);
      const nextState = { ...prev, matrix, datesAsc };
      if (branches !== prev.branches) nextState.branches = branches;

      // Update global and localStorage cache with realtime updates
      const cacheVal = { ...nextState, updatedAt: now };
      globalCache = cacheVal;
      setCachedData(cacheVal);

      return nextState;
    });
    setUpdatedAt(now);
  }, []);

  return { ...state, status, error, updatedAt, refresh: fetchSnapshot, applyTick };
}

/* ───────────────────────────────────────────────────────────────────────
 * useRealtimeFeed — cầu nối tới gateway realtime phía sau Kafka qua Socket.IO.
 *
 * Cách dùng: đặt biến môi trường VITE_SMDT_WS_URL trỏ tới Socket.IO namespace /realtime.
 * ─────────────────────────────────────────────────────────────────────── */
export function useRealtimeFeed(onTick) {
  const cbRef = useRef(onTick);
  cbRef.current = onTick;

  useEffect(() => {
    const url = import.meta.env.VITE_SMDT_WS_URL || "http://112.213.91.235:3005/realtime";

    const socket = io(url, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("Socket.IO connected to namespace:", socket.nsp);
      socket.emit("message", {
        action: "subscribe",
        channels: ["smdt-branch"],
      });
    });

    socket.on("message", (payload) => {
      if (payload?.channel === "smdt-branch" && payload?.data) {
        cbRef.current?.(payload.data);
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket.IO disconnected:", reason);
    });

    return () => {
      socket.disconnect();
    };
  }, []);
}
