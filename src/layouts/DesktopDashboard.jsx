import { useState } from "react";
import { T } from "../styles/tokens";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { MarketBanner } from "../components/sections/MarketBanner";
import { MoneyFlow } from "../components/sections/MoneyFlow";
import { InvestorProfile } from "../components/sections/InvestorProfile";
import { Portfolio } from "../components/sections/Portfolio";
import { SectorFlowList, SectorStrengthList, StockFlowList, StockStrengthList } from "../components/sections/TopLists";
import { AIAdvisor } from "../components/sections/AIAdvisor";
import SMDTNganh from "../components/sections/SMDTNganh";
import StockWave from "../components/sections/StockWave";

/* ─────────────────────────── DESKTOP LAYOUT ────────────────────────── */
export const DesktopDashboard = () => {
  const [navActive, setNavActive] = useState("Dashboard");
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar active={navActive} onNav={setNavActive} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar isMobile={false} />
        <main
          style={{
            flex: 1,
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            overflowY: "auto",
          }}
        >
          {navActive === "SMDT ngành" ? (
            <SMDTNganh />
          ) : navActive === "Sóng cổ phiếu" ? (
            <StockWave />
          ) : (
            <>
              <MarketBanner />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <MoneyFlow />
                <InvestorProfile />
                <Portfolio />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <SectorFlowList />
                <SectorStrengthList />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <StockFlowList />
                <StockStrengthList />
              </div>
              <AIAdvisor />
              <div style={{ textAlign: "center", fontSize: 11, color: T.text3, padding: "4px 0 8px" }}>
                Dữ liệu chỉ mang tính tham khảo, không phải lời khuyên đầu tư.
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
