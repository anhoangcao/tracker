import { useState } from "react";
import { T } from "../styles/tokens";
import { TOP_TABS } from "../data/dashboardData";
import { SectorFlowList, SectorStrengthList, StockFlowList, StockStrengthList } from "./sections/TopLists";

/* ─────────────────────────── MOBILE TAB SWITCHER ───────────────────── */
export const TopTabSwitcher = () => {
  const [tab, setTab] = useState(0);
  const tabs = [<SectorFlowList />, <SectorStrengthList />, <StockFlowList />, <StockStrengthList />];
  return (
    <div>
      <div style={{ display: "flex", background: T.surface2, borderRadius: 8, padding: 3, marginBottom: 10 }}>
        {TOP_TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "6px 2px",
              fontSize: 11,
              fontWeight: 500,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: tab === i ? T.surface : "transparent",
              color: tab === i ? T.text : T.text3,
              fontFamily: "Inter,sans-serif",
              transition: "all .15s",
              boxShadow: tab === i ? "0 1px 4px rgba(0,0,0,.3)" : "none",
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {tabs[tab]}
    </div>
  );
};
