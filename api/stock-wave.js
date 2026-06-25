let serverCache = null;
let lastFetched = 0;
const CACHE_DURATION = 3 * 1000;

async function fetchStockWaveFromSource() {
  const payloads = [
    { StockWaveRequest: { name: "ALL", account: "uyen.png" } },
    { StockWaveRequest: { name: "ALL" } },
    { StockWaveRequest: {} },
  ];

  let lastError = null;
  for (const payload of payloads) {
    try {
      const response = await fetch("https://stocktraders.vn/service/data/getStockWave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`External API returned status ${response.status}`);
      }

      const data = await response.json();
      const code = data?.StockWaveRequest?.codeReply?.codeID;
      const waveDatas = data?.StockWaveRequest?.stockWaves?.waveDatas;
      if (code && code !== "S0000") {
        throw new Error(`API response code ${code}`);
      }
      if (!Array.isArray(waveDatas)) {
        throw new Error("API response missing waveDatas");
      }
      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Failed to load stock wave data");
}

function sliceReply(data, limit) {
  const stockWaves = data?.StockWaveRequest?.stockWaves || {};
  const waveDatas = Array.isArray(stockWaves.waveDatas) ? stockWaves.waveDatas : [];

  return {
    StockWaveRequest: {
      codeReply: data?.StockWaveRequest?.codeReply || { codeID: "S0000", codeName: "SUCSESS" },
      stockWaves: {
        ...stockWaves,
        waveDatas: waveDatas.slice(-limit),
      },
    },
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const now = Date.now();
  let limit = parseInt(req.query.limit || "150", 10);
  if (isNaN(limit) || limit <= 0) {
    limit = 150;
  }

  if (!serverCache || now - lastFetched > CACHE_DURATION) {
    try {
      serverCache = await fetchStockWaveFromSource();
      lastFetched = now;
    } catch (error) {
      console.error("Failed to refresh stock wave cache from source:", error);
      if (!serverCache) {
        return res.status(502).json({
          error: "Failed to load data from source",
          details: error.message,
        });
      }
    }
  }

  try {
    return res.status(200).json(sliceReply(serverCache, limit));
  } catch (error) {
    return res.status(500).json({ error: "Failed to process sliced data", details: error.message });
  }
}
