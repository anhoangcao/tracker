import { useState } from "react";
import { T, mono } from "../styles/tokens";
import { NAV_ITEMS, INDICES } from "../data/dashboardData";
import { Icon } from "../components/Icon";
import { Topbar } from "../components/Topbar";
import { BottomNav } from "../components/BottomNav";
import { TopTabSwitcher } from "../components/TopTabSwitcher";
import { MarketBanner } from "../components/sections/MarketBanner";
import { MoneyFlow } from "../components/sections/MoneyFlow";
import { InvestorProfile } from "../components/sections/InvestorProfile";
import { Portfolio } from "../components/sections/Portfolio";
import { AIAdvisor } from "../components/sections/AIAdvisor";
import SMDTNganh from "../components/sections/SMDTNganh";

/* ─────────────────────────── MOBILE LAYOUT ─────────────────────────── */
export const MobileDashboard = () => {
  const [bottomTab, setBottomTab] = useState("Dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navActive, setNavActive] = useState("Dashboard");

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 40, animation: "fadeIn .2s" }}
        />
      )}
      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 240,
          background: T.surface,
          zIndex: 50,
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .25s cubic-bezier(.4,0,.2,1)",
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "linear-gradient(135deg,#7C3AED,#A78BFA)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1,12 5,8 9,10 15,4" />
              <polyline points="11,4 15,4 15,8" />
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>StockTraders AI</span>
        </div>
        <nav style={{ flex: 1, padding: "8px 6px", overflowY: "auto" }}>
          {[...new Set(NAV_ITEMS.map((n) => n.section))].map((sec) => (
            <div key={sec}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: ".08em",
                  color: T.text3,
                  padding: "8px 10px 4px",
                  textTransform: "uppercase",
                }}
              >
                {sec}
              </div>
              {NAV_ITEMS.filter((n) => n.section === sec).map((n) => (
                <div
                  key={n.label}
                  onClick={() => {
                    setNavActive(n.label);
                    setDrawerOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "9px 10px",
                    borderRadius: 6,
                    color: navActive === n.label ? T.accent : T.text2,
                    background: navActive === n.label ? "rgba(167,139,250,.14)" : "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    marginBottom: 1,
                  }}
                >
                  <Icon name={n.icon} size={15} color={navActive === n.label ? T.accent : T.text2} />
                  {n.label}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: 12, borderTop: `1px solid ${T.border}` }}>
          <button
            style={{
              display: "block",
              width: "100%",
              background: "linear-gradient(135deg,#7C3AED,#A78BFA)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Inter,sans-serif",
            }}
          >
            👑 Nâng cấp Premium
          </button>
        </div>
      </div>

      <Topbar isMobile onMenuToggle={() => setDrawerOpen((o) => !o)} />

      {/* Index strip */}
      <div
        style={{
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          gap: 0,
          overflowX: "auto",
          padding: "8px 14px",
        }}
      >
        {INDICES.map((idx, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              paddingRight: 14,
              marginRight: 14,
              borderRight: i < INDICES.length - 1 ? `1px solid ${T.border}` : "none",
            }}
          >
            <div style={{ fontSize: 10, color: T.text3, letterSpacing: ".05em" }}>{idx.name}</div>
            <div style={{ ...mono, fontSize: 13 }}>{idx.val}</div>
            <div style={{ fontSize: 11, color: T.buy }}>{idx.pct}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          padding: "14px 13px",
          display: "flex",
          flexDirection: "column",
          gap: 13,
          paddingBottom: "calc(80px + env(safe-area-inset-bottom,0px))",
        }}
      >
        {navActive === "SMDT ngành" ? (
          <SMDTNganh />
        ) : (
          <>
            <MarketBanner />
            <MoneyFlow />
            <TopTabSwitcher />
            <AIAdvisor />
            <InvestorProfile />
            <Portfolio />
          </>
        )}
        <div style={{ textAlign: "center", fontSize: 11, color: T.text3 }}>
          Dữ liệu chỉ mang tính tham khảo, không phải lời khuyên đầu tư.
        </div>
      </div>

      <BottomNav active={bottomTab} onChange={setBottomTab} />
    </div>
  );
};
