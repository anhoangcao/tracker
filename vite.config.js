import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local cache variables for dev server
let devCache = null;
let devLastFetched = 0;
const CACHE_DURATION = 3 * 1000; // Realtime là đường chính; proxy chỉ phục vụ snapshot ban đầu + lưới dự phòng, giữ ngắn để tươi.

function smdtDevPlugin() {
  return {
    name: "smdt-dev-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // Parse request URL
        const reqUrl = req.url || "";
        if (reqUrl.startsWith("/api/smdt")) {
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
                body: JSON.stringify({ SMDTBranchRequest: { account: "uyen.png" } })
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
