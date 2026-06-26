import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local cache variables for dev server
let devCache = null;
let devLastFetched = 0;
let stockWaveDevCache = null;
let stockWaveDevLastFetched = 0;
let cashFlowDevCache = null;
let cashFlowDevLastFetched = 0;
let cashFlowTickerDevCache = null;
let cashFlowTickerDevLastFetched = 0;
let smdtTickerDevCache = null;
let smdtTickerDevLastFetched = 0;
let branchPathDevCache = null;
let branchPathDevLastFetched = 0;
const BRANCH_PATH_CACHE_DURATION = 5 * 60 * 1000; // Thành phần ngành/mã ít đổi → cache dài hơn.
const CACHE_DURATION = 3 * 1000; // Realtime là đường chính; proxy chỉ phục vụ snapshot ban đầu + lưới dự phòng, giữ ngắn để tươi.
const API_ACCOUNT = "thao.dtt";
const STOCK_WAVE_REPLY_KEYS = ["StockWaveReply", "StockWaveRequest"];
const CASH_FLOW_TICKER_REPLY_KEYS = ["CashFlowTickerReply", "CashFlowTickerRequest"];
const SMDT_TICKER_REPLY_KEYS = ["SMDTTickerReply", "SMDTTickerRequest"];

async function fetchStockWaveFromSource() {
  const payload = { StockWaveRequest: { account: API_ACCOUNT } };

  const response = await fetch("https://stocktraders.vn/service/data/getStockWave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  const reply = getStockWaveReply(data);
  const code = reply?.codeReply?.codeID;
  const waveDatas = reply?.stockWaves?.waveDatas;
  if (code && code !== "S0000") throw new Error(`API response code ${code}`);
  if (!Array.isArray(waveDatas)) throw new Error("API response missing waveDatas");
  return data;
}

function getStockWaveReply(data) {
  for (const key of STOCK_WAVE_REPLY_KEYS) {
    if (data?.[key]) {
      return data[key];
    }
  }
  return null;
}

function getCashFlowTickerReply(data) {
  for (const key of CASH_FLOW_TICKER_REPLY_KEYS) {
    if (data?.[key]) {
      return data[key];
    }
  }
  return null;
}

function getSMDTTickerReply(data) {
  for (const key of SMDT_TICKER_REPLY_KEYS) {
    if (data?.[key]) {
      return data[key];
    }
  }
  return null;
}

function smdtDevPlugin() {
  return {
    name: "smdt-dev-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Parse request URL
        const reqUrl = req.url || "";
        if (reqUrl.startsWith("/api/smdt-ticker")) {
          const host = req.headers.host || "localhost:3000";
          const parsedUrl = new URL(reqUrl, `http://${host}`);
          const limitParam = parsedUrl.searchParams.get("limit");
          let limit = parseInt(limitParam || "150", 10);
          if (isNaN(limit) || limit <= 0) {
            limit = 150;
          }

          const now = Date.now();
          if (!smdtTickerDevCache || (now - smdtTickerDevLastFetched > CACHE_DURATION)) {
            try {
              const response = await fetch("https://stocktraders.vn/service/data/getSMDTTicker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ SMDTTickerRequest: { account: API_ACCOUNT } })
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              const reply = getSMDTTickerReply(data);
              const code = reply?.codeReply?.codeID;
              if (code && code !== "S0000") throw new Error(`API response code ${code}`);
              smdtTickerDevCache = data;
              smdtTickerDevLastFetched = now;
            } catch (err) {
              console.error("Local dev smdt ticker proxy fetch error:", err);
              if (!smdtTickerDevCache) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }
          }

          try {
            const replyKey = SMDT_TICKER_REPLY_KEYS.find((key) => smdtTickerDevCache?.[key]) || "SMDTTickerReply";
            const reply = getSMDTTickerReply(smdtTickerDevCache) || {};
            const datas = Array.isArray(reply.SMDTDatas) ? reply.SMDTDatas : [];
            const out = {
              [replyKey]: {
                codeReply: reply.codeReply || { codeID: "S0000", codeName: "SUCSESS" },
                SMDTDatas: datas.map((item) => ({
                  ...item,
                  smdts: Array.isArray(item.smdts) ? item.smdts.slice(-limit) : []
                }))
              }
            };

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, max-age=0");
            res.end(JSON.stringify(out));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (reqUrl.startsWith("/api/smdt")) {
          const host = req.headers.host || "localhost:3000";
          const parsedUrl = new URL(reqUrl, `http://${host}`);
          const limitParam = parsedUrl.searchParams.get("limit");
          let limit = parseInt(limitParam || "150", 10);
          if (isNaN(limit) || limit <= 0) {
            limit = 150;
          }

          const now = Date.now();
          if (!devCache || (now - devLastFetched > CACHE_DURATION)) {
            try {
              const response = await fetch("https://stocktraders.vn/service/data/getSMDTBranch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ SMDTBranchRequest: { account: API_ACCOUNT } })
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              devCache = data;
              devLastFetched = now;
            } catch (err) {
              console.error("Local dev proxy fetch error:", err);
              if (!devCache) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }
          }

          try {
            const originalDatas = devCache?.SMDTBranchReply?.SMDTDatas || [];
            const slicedDatas = originalDatas.map(branch => {
              const originalSmdts = branch.smdts || [];
              const slicedSmdts = originalSmdts.slice(-limit);
              return { ...branch, smdts: slicedSmdts };
            });

            const reply = {
              SMDTBranchReply: {
                codeReply: devCache?.SMDTBranchReply?.codeReply || { codeID: "S0000", codeName: "SUCSESS" },
                SMDTDatas: slicedDatas
              }
            };

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, max-age=0");
            res.end(JSON.stringify(reply));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (reqUrl.startsWith("/api/stock-wave")) {
          const host = req.headers.host || "localhost:3000";
          const parsedUrl = new URL(reqUrl, `http://${host}`);
          const limitParam = parsedUrl.searchParams.get("limit");
          let limit = parseInt(limitParam || "150", 10);
          if (isNaN(limit) || limit <= 0) {
            limit = 150;
          }

          const now = Date.now();
          if (!stockWaveDevCache || (now - stockWaveDevLastFetched > CACHE_DURATION)) {
            try {
              stockWaveDevCache = await fetchStockWaveFromSource();
              stockWaveDevLastFetched = now;
            } catch (err) {
              console.error("Local dev stock wave proxy fetch error:", err);
              if (!stockWaveDevCache) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }
          }

          try {
            const replyKey = STOCK_WAVE_REPLY_KEYS.find((key) => stockWaveDevCache?.[key]) || "StockWaveReply";
            const stockWaveReply = getStockWaveReply(stockWaveDevCache) || {};
            const stockWaves = stockWaveReply.stockWaves || {};
            const waveDatas = Array.isArray(stockWaves.waveDatas) ? stockWaves.waveDatas : [];
            const reply = {
              [replyKey]: {
                codeReply: stockWaveReply.codeReply || { codeID: "S0000", codeName: "SUCSESS" },
                stockWaves: {
                  ...stockWaves,
                  waveDatas: waveDatas.slice(-limit)
                }
              }
            };

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, max-age=0");
            res.end(JSON.stringify(reply));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (reqUrl.startsWith("/api/cashflow-branch")) {
          const host = req.headers.host || "localhost:3000";
          const parsedUrl = new URL(reqUrl, `http://${host}`);
          const limitParam = parsedUrl.searchParams.get("limit");
          let limit = parseInt(limitParam || "150", 10);
          if (isNaN(limit) || limit <= 0) {
            limit = 150;
          }

          const now = Date.now();
          if (!cashFlowDevCache || (now - cashFlowDevLastFetched > CACHE_DURATION)) {
            try {
              const response = await fetch("https://stocktraders.vn/service/data/getCashFlowBranch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ CashFlowBranchRequest: { account: API_ACCOUNT } })
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              cashFlowDevCache = data;
              cashFlowDevLastFetched = now;
            } catch (err) {
              console.error("Local dev cash flow proxy fetch error:", err);
              if (!cashFlowDevCache) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }
          }

          try {
            const reply = cashFlowDevCache?.CashFlowBranchReply || {};
            const originalBuckets = Array.isArray(reply.cashFlowBranchs) ? reply.cashFlowBranchs : [];
            // Mỗi bucket là 1 phiên (ngày); slice giữ `limit` phiên gần nhất.
            const slicedBuckets = originalBuckets.slice(-limit);

            const out = {
              CashFlowBranchReply: {
                codeReply: reply.codeReply || { codeID: "S0000", codeName: "SUCSESS" },
                cashFlowBranchs: slicedBuckets
              }
            };

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, max-age=0");
            res.end(JSON.stringify(out));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (reqUrl.startsWith("/api/cashflow-ticker")) {
          const host = req.headers.host || "localhost:3000";
          const parsedUrl = new URL(reqUrl, `http://${host}`);
          const limitParam = parsedUrl.searchParams.get("limit");
          let limit = parseInt(limitParam || "150", 10);
          if (isNaN(limit) || limit <= 0) {
            limit = 150;
          }

          const now = Date.now();
          if (!cashFlowTickerDevCache || (now - cashFlowTickerDevLastFetched > CACHE_DURATION)) {
            try {
              const response = await fetch("https://stocktraders.vn/service/data/getCashFlowTicker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ CashFlowTickerRequest: { account: API_ACCOUNT } })
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              const reply = getCashFlowTickerReply(data);
              const code = reply?.codeReply?.codeID;
              if (code && code !== "S0000") throw new Error(`API response code ${code}`);
              cashFlowTickerDevCache = data;
              cashFlowTickerDevLastFetched = now;
            } catch (err) {
              console.error("Local dev cash flow ticker proxy fetch error:", err);
              if (!cashFlowTickerDevCache) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }
          }

          try {
            const replyKey = CASH_FLOW_TICKER_REPLY_KEYS.find((key) => cashFlowTickerDevCache?.[key]) || "CashFlowTickerReply";
            const reply = getCashFlowTickerReply(cashFlowTickerDevCache) || {};
            const buckets = Array.isArray(reply.cashFlowTickers) ? reply.cashFlowTickers : [];
            const out = {
              [replyKey]: {
                codeReply: reply.codeReply || { codeID: "S0000", codeName: "SUCSESS" },
                cashFlowTickers: buckets.slice(-limit)
              }
            };

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, max-age=0");
            res.end(JSON.stringify(out));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (reqUrl.startsWith("/api/smdt-ticker")) {
          const host = req.headers.host || "localhost:3000";
          const parsedUrl = new URL(reqUrl, `http://${host}`);
          const limitParam = parsedUrl.searchParams.get("limit");
          let limit = parseInt(limitParam || "150", 10);
          if (isNaN(limit) || limit <= 0) {
            limit = 150;
          }

          const now = Date.now();
          if (!smdtTickerDevCache || (now - smdtTickerDevLastFetched > CACHE_DURATION)) {
            try {
              const response = await fetch("https://stocktraders.vn/service/data/getSMDTTicker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ SMDTTickerRequest: { account: API_ACCOUNT } })
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              const reply = getSMDTTickerReply(data);
              const code = reply?.codeReply?.codeID;
              if (code && code !== "S0000") throw new Error(`API response code ${code}`);
              smdtTickerDevCache = data;
              smdtTickerDevLastFetched = now;
            } catch (err) {
              console.error("Local dev smdt ticker proxy fetch error:", err);
              if (!smdtTickerDevCache) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }
          }

          try {
            const replyKey = SMDT_TICKER_REPLY_KEYS.find((key) => smdtTickerDevCache?.[key]) || "SMDTTickerReply";
            const reply = getSMDTTickerReply(smdtTickerDevCache) || {};
            const datas = Array.isArray(reply.SMDTDatas) ? reply.SMDTDatas : [];
            const out = {
              [replyKey]: {
                codeReply: reply.codeReply || { codeID: "S0000", codeName: "SUCSESS" },
                // Mỗi cổ phiếu có chuỗi smdts theo ngày; slice giữ `limit` phiên gần nhất.
                SMDTDatas: datas.map((d) => ({
                  ...d,
                  smdts: Array.isArray(d.smdts) ? d.smdts.slice(-limit) : []
                }))
              }
            };

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, max-age=0");
            res.end(JSON.stringify(out));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (reqUrl.startsWith("/api/smdt-ticker")) {
          const host = req.headers.host || "localhost:3000";
          const parsedUrl = new URL(reqUrl, `http://${host}`);
          const limitParam = parsedUrl.searchParams.get("limit");
          let limit = parseInt(limitParam || "150", 10);
          if (isNaN(limit) || limit <= 0) {
            limit = 150;
          }

          const now = Date.now();
          if (!smdtTickerDevCache || (now - smdtTickerDevLastFetched > CACHE_DURATION)) {
            try {
              const response = await fetch("https://stocktraders.vn/service/data/getSMDTTicker", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ SMDTTickerRequest: { account: API_ACCOUNT } })
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              const reply = getSMDTTickerReply(data);
              const code = reply?.codeReply?.codeID;
              if (code && code !== "S0000") throw new Error(`API response code ${code}`);
              smdtTickerDevCache = data;
              smdtTickerDevLastFetched = now;
            } catch (err) {
              console.error("Local dev SMDT ticker proxy fetch error:", err);
              if (!smdtTickerDevCache) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }
          }

          try {
            const replyKey = SMDT_TICKER_REPLY_KEYS.find((key) => smdtTickerDevCache?.[key]) || "SMDTTickerReply";
            const reply = getSMDTTickerReply(smdtTickerDevCache) || {};
            const datas = Array.isArray(reply.SMDTDatas) ? reply.SMDTDatas : [];
            const out = {
              [replyKey]: {
                codeReply: reply.codeReply || { codeID: "S0000", codeName: "SUCSESS" },
                SMDTDatas: datas.map((item) => ({
                  ...item,
                  smdts: Array.isArray(item.smdts) ? item.smdts.slice(-limit) : []
                }))
              }
            };

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, max-age=0");
            res.end(JSON.stringify(out));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          }
        } else if (reqUrl.startsWith("/api/branch-path")) {
          const now = Date.now();
          if (!branchPathDevCache || (now - branchPathDevLastFetched > BRANCH_PATH_CACHE_DURATION)) {
            try {
              const response = await fetch("https://stocktraders.vn/service/data/getBranchPath", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ BranchPathRequest: { account: API_ACCOUNT } })
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              const code = data?.BranchPathReply?.codeReply?.codeID;
              if (code && code !== "S0000") throw new Error(`API response code ${code}`);
              if (!Array.isArray(data?.BranchPathReply?.branchs)) throw new Error("API response missing branchs");
              branchPathDevCache = data;
              branchPathDevLastFetched = now;
            } catch (err) {
              console.error("Local dev branch path proxy fetch error:", err);
              if (!branchPathDevCache) {
                res.statusCode = 502;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
            }
          }

          try {
            const reply = branchPathDevCache?.BranchPathReply || {};
            const out = {
              BranchPathReply: {
                codeReply: reply.codeReply || { codeID: "S0000", codeName: "SUCSESS" },
                branchs: Array.isArray(reply.branchs) ? reply.branchs : []
              }
            };
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store, max-age=0");
            res.end(JSON.stringify(out));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message }));
          }
        } else {
          next();
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), smdtDevPlugin()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy SMDT API to avoid CORS during local dev
      "/service": {
        target: "https://stocktraders.vn",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
