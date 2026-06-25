let serverCache = null;
let lastFetched = 0;
const CACHE_DURATION = 3 * 1000;
const API_ACCOUNT = "thao.dtt";
const REPLY_KEYS = ["CashFlowTickerReply", "CashFlowTickerRequest"];

function getReply(data) {
  for (const key of REPLY_KEYS) {
    if (data?.[key]) return data[key];
  }
  return null;
}

async function fetchCashFlowTickerFromSource() {
  const response = await fetch("https://stocktraders.vn/service/data/getCashFlowTicker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ CashFlowTickerRequest: { account: API_ACCOUNT } }),
  });

  if (!response.ok) {
    throw new Error(`External API returned status ${response.status}`);
  }

  const data = await response.json();
  const reply = getReply(data);
  const code = reply?.codeReply?.codeID;
  const buckets = reply?.cashFlowTickers;

  if (code && code !== "S0000") {
    throw new Error(`API response code ${code}`);
  }
  if (!Array.isArray(buckets)) {
    throw new Error("API response missing cashFlowTickers");
  }

  return data;
}

function sliceReply(data, limit) {
  const replyKey = REPLY_KEYS.find((key) => data?.[key]) || "CashFlowTickerReply";
  const sourceReply = getReply(data) || {};
  const buckets = Array.isArray(sourceReply.cashFlowTickers) ? sourceReply.cashFlowTickers : [];

  return {
    [replyKey]: {
      codeReply: sourceReply.codeReply || { codeID: "S0000", codeName: "SUCSESS" },
      cashFlowTickers: buckets.slice(-limit),
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
      serverCache = await fetchCashFlowTickerFromSource();
      lastFetched = now;
    } catch (error) {
      console.error("Failed to refresh cash flow ticker cache from source:", error);
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
