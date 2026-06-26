import { ModDashboard } from "../features/dashboard/Dashboard";
import { ModDoSong } from "../features/stock-wave/StockWave";
import { ModSMDTNganh } from "../features/smdt-branch/SMDTBranch";
import { ModDongTienNganh } from "../features/cash-flow-branch/CashFlowBranch";
import { ModDongTienCP } from "../features/cash-flow-ticker/CashFlowTicker";
import { ModSMDTMa } from "../features/smdt-ticker/SMDTTicker";
import { ModDongTienTT } from "../features/market-flow/MarketFlow";

/* ─────────────────────────── MODULE REGISTRY ───────────────────────────
 * Mỗi module: tiêu đề + phụ đề cho topbar, render qua <ModuleView>.
 * Dữ liệu thật: "smdt-nganh" (useSMDT) và "stock-wave"/Sóng cổ phiếu (useStockWave).
 * Các module còn lại dùng dữ liệu mẫu theo bản thiết kế tham khảo.
 * ─────────────────────────────────────────────────────────────────────── */
export const MODULES = {
  "dashboard":       { title: "Dashboard",          sub: "Tổng quan thị trường hôm nay" },
  "dong-tien-tt":    { title: "Thị trường",          sub: "Tổng hợp GTGD · Khối ngoại · Tự doanh" },
  "dong-tien-nganh": { title: "Dòng tiền ngành",     sub: "Chủ lực 6 ngành — theo dõi vào/ra theo ngày" },
  "smdt-nganh":      { title: "SMDT ngành",          sub: "Sức mạnh dòng tiền theo ngành · Heatmap" },
  "dong-tien-cp":    { title: "Dòng tiền cổ phiếu",  sub: "Tín hiệu từng mã — theo dõi nhiều phiên" },
  "smdt-ma":         { title: "SMDT cổ phiếu",       sub: "SMDT từng cổ phiếu theo ngày · realtime" },
  "stock-wave":      { title: "Sóng cổ phiếu",       sub: "Dữ liệu thật từ getStockWave · realtime" },
  "do-song":         { title: "Sóng cổ phiếu",       sub: "Dữ liệu thật từ getStockWave · realtime" },
};

export const SIDEBAR_GROUPS = {
  industry: ["dong-tien-nganh", "smdt-nganh"],
  stocks: ["dong-tien-cp", "smdt-ma", "stock-wave", "do-song"],
};

export const BOTTOM_TABS = [
  { id: "dashboard", icon: "ti-layout-grid", label: "Dashboard" },
  { id: "dong-tien-tt", icon: "ti-chart-line", label: "Thị trường" },
  { id: "smdt-nganh", icon: "ti-table", label: "SMDT" },
  { id: "stock-wave", icon: "ti-wave-sine", label: "Sóng" },
];

export function ModuleView({ id }) {
  switch (id) {
    case "dashboard":       return <ModDashboard />;
    case "stock-wave":
    case "do-song":         return <ModDoSong />;
    case "smdt-nganh":      return <ModSMDTNganh />;
    case "dong-tien-nganh": return <ModDongTienNganh />;
    case "dong-tien-cp":    return <ModDongTienCP />;
    case "smdt-ma":         return <ModSMDTMa />;
    case "dong-tien-tt":    return <ModDongTienTT />;
    default:                return <ModDashboard />;
  }
}
