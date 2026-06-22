import { useCallback, useEffect, useRef, useState } from "react";

/* ───────────────────────────────────────────────────────────────────────
 * useSMDT — nguồn dữ liệu "Sức mạnh dòng tiền ngành"
 *
 * - Tải snapshot ban đầu từ API getSMDTBranch (POST).
 * - Chuẩn hoá thành cấu trúc dễ render cho bảng (ngành × ngày).
 * - Sẵn sàng cho realtime Kafka: dùng `applyTick()` để merge 1 điểm dữ liệu
 *   mới (date, keyName, smdt) vào state, hoặc bật `useRealtimeFeed` (WebSocket)
 *   trỏ tới gateway phía sau Kafka.
 * ─────────────────────────────────────────────────────────────────────── */

// Khi chạy qua vite proxy ("/service" -> stocktraders.vn) sẽ tránh được CORS.
const API_URL = "/service/data/getSMDTBranch";
const ACCOUNT = "uyen.png";

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
      label: CORE_BRANCHES.find((c) => c.key === b.keyName)?.label || b.keyName,
      isCore: CORE_KEYS.has(b.keyName),
    };
  });

  // Đưa các ngành chủ lực lên đầu theo thứ tự khai báo.
  branches.sort((a, b) => {
    if (a.isCore && b.isCore)
      return CORE_BRANCHES.findIndex((c) => c.key === a.key) - CORE_BRANCHES.findIndex((c) => c.key === b.key);
    if (a.isCore) return -1;
    if (b.isCore) return 1;
    return a.label.localeCompare(b.label, "vi");
  });

  return { branches, datesAsc, matrix };
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
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SMDTBranchRequest: { account: ACCOUNT } }),
      });
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

  /** Merge 1 điểm dữ liệu realtime vào state (dùng cho feed Kafka/WebSocket). */
  const applyTick = useCallback(({ keyName, date, smdt }) => {
    if (!keyName || !date) return;
    setState((prev) => {
      const matrix = { ...prev.matrix, [keyName]: { ...(prev.matrix[keyName] || {}), [date]: smdt } };
      const datesAsc = prev.datesAsc.includes(date)
        ? prev.datesAsc
        : [...prev.datesAsc, date].sort();

      const nextState = { ...prev, matrix, datesAsc };
      const now = new Date();

      // Update global and localStorage cache with realtime updates
      const cacheVal = { ...nextState, updatedAt: now };
      globalCache = cacheVal;
      setCachedData(cacheVal);

      return nextState;
    });
    setUpdatedAt(new Date());
  }, []);

  return { ...state, status, error, updatedAt, refresh: fetchSnapshot, applyTick };
}

/* ───────────────────────────────────────────────────────────────────────
 * useRealtimeFeed — cầu nối tới gateway realtime phía sau Kafka.
 *
 * Cách dùng: đặt biến môi trường VITE_SMDT_WS_URL trỏ tới WebSocket gateway
 * (consumer Kafka topic SMDT phát ra các message dạng {keyName,date,smdt}).
 * Mỗi message nhận được sẽ gọi onTick() -> applyTick() để cập nhật bảng.
 * Khi chưa cấu hình URL, hook không làm gì (UI vẫn chạy với snapshot REST).
 * ─────────────────────────────────────────────────────────────────────── */
export function useRealtimeFeed(onTick) {
  const cbRef = useRef(onTick);
  cbRef.current = onTick;

  useEffect(() => {
    const url = import.meta.env.VITE_SMDT_WS_URL;
    if (!url) return; // chưa bật realtime

    let ws;
    let closed = false;
    const connect = () => {
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          // Hỗ trợ cả message đơn lẻ lẫn batch.
          const ticks = Array.isArray(msg) ? msg : [msg];
          for (const t of ticks) cbRef.current?.(t);
        } catch {
          /* bỏ qua message không hợp lệ */
        }
      };
      ws.onclose = () => {
        if (!closed) setTimeout(connect, 3000); // tự kết nối lại
      };
    };
    connect();

    return () => {
      closed = true;
      ws?.close();
    };
  }, []);
}
