import { T } from "../styles/tokens";

/* ─────────────────────────── DATA ───────────────────────────────────── */
export const INDICES = [
  { name: "VNINDEX", val: "1,238.45", chg: "+12.45", pct: "+1.02%" },
  { name: "HNXINDEX", val: "234.12", chg: "+2.13", pct: "+0.92%" },
  { name: "UPINDEX", val: "98.45", chg: "+0.65", pct: "+0.67%" },
];

export const MARKET_STATS = [
  { label: "GTGD KHỚP LỆNH", val: "23,842 tỷ", sub: "+18.6%", color: T.buy },
  { label: "DÒNG TIỀN RÒNG", val: "+2,341 tỷ", sub: "Ròng", color: T.buy },
  { label: "ĐỘ RỘNG", val: "267 / 93", sub: "Tăng/Giảm", color: T.text },
];

export const DONUT_SEGMENTS = [
  { label: "Chờ mua", pct: 68, color: T.accent },
  { label: "Mua", pct: 24, color: T.buy },
  { label: "Chờ bán", pct: 5, color: T.warn },
  { label: "Bán", pct: 3, color: T.sell },
];

export const SECTOR_FLOW = [
  { rank: 1, icon: "🏦", name: "Chứng khoán", tag: "Tiếp tục đổ vào", type: "buy" },
  { rank: 2, icon: "🏠", name: "BĐS dân cư", tag: "Nhen nhóm đổ vào", type: "buy" },
  { rank: 3, icon: "⚙️", name: "Thép", tag: "Nhen nhóm đổ vào", type: "buy" },
  { rank: 4, icon: "🛒", name: "Bán lẻ", tag: "Đang thoát ra", type: "warn" },
  { rank: 5, icon: "🏛️", name: "Ngân hàng", tag: "Đang thoát ra", type: "warn" },
];

export const SECTOR_STRENGTH = [
  { rank: 1, name: "Chứng khoán", score: 82, color: T.accent },
  { rank: 2, name: "BĐS dân cư", score: 78, color: T.accent },
  { rank: 3, name: "Thép", score: 74, color: T.buy },
  { rank: 4, name: "Ngân hàng", score: 71, color: T.info },
  { rank: 5, name: "Bán lẻ", score: 63, color: T.warn },
];

export const STOCK_FLOW = [
  { rank: 1, code: "SSI", cls: "ssi", name: "SSI Securities", tag: "Tiếp tục đổ vào", type: "buy" },
  { rank: 2, code: "VCI", cls: "vci", name: "Vietcap Securities", tag: "Tiếp tục đổ vào", type: "buy" },
  { rank: 3, code: "DIG", cls: "dig", name: "DIC Corp", tag: "Nhen nhóm đổ vào", type: "buy" },
  { rank: 4, code: "HPG", cls: "hpg", name: "Hòa Phát Group", tag: "Đang thoát ra", type: "warn" },
  { rank: 5, code: "STB", cls: "stb", name: "Sacombank", tag: "Đang thoát ra", type: "warn" },
];

export const STOCK_STRENGTH = [
  { rank: 1, code: "SSI", cls: "ssi", name: "SSI Securities", score: 88, color: T.accent },
  { rank: 2, code: "VCI", cls: "vci", name: "Vietcap Securities", score: 84, color: T.accent },
  { rank: 3, code: "HPG", cls: "hpg", name: "Hòa Phát Group", score: 81, color: T.buy },
  { rank: 4, code: "DIG", cls: "dig", name: "DIC Corp", score: 80, color: T.info },
  { rank: 5, code: "GAS", cls: "gas", name: "PV Gas", score: 76, color: T.warn },
];

export const PROFILE_SCORES = [
  { label: "Đọc thị trường", score: 82, grade: "Tốt", color: T.buy },
  { label: "Chọn ngành", score: 75, grade: "Khá", color: T.buy },
  { label: "Chọn mã", score: 60, grade: "Trung bình", color: T.warn },
  { label: "Quản trị vốn", score: 48, grade: "Yếu", color: T.sell },
];

export const ADVISOR_ROWS = [
  { label: "Thị trường", val: "CHỜ MUA", color: T.accent },
  { label: "Dòng tiền", val: "TIẾP TỤC ĐỔ VÀO", color: T.buy },
  { label: "Ngành dẫn sóng", val: "Chứng khoán", color: T.info },
  { label: "Ngành mạnh nhất", val: "Chứng khoán (82)", color: T.buy },
  { label: "Mã hút tiền", val: "SSI", color: T.buy },
  { label: "Mã mạnh nhất", val: "SSI (88)", color: T.buy },
];

export const PERF = [
  { period: "1 ngày", val: "+1.23%" },
  { period: "1 tuần", val: "+3.45%" },
  { period: "1 tháng", val: "+6.78%" },
  { period: "3 tháng", val: "+12.34%" },
  { period: "YTD", val: "+15.67%" },
];

export const NAV_ITEMS = [
  { label: "Dashboard", icon: "grid", section: "Tổng quan" },
  { label: "Thị trường", icon: "chart", section: "Tổng quan" },
  { label: "Ngành", icon: "clock", section: "Đầu tư" },
  { label: "Cổ phiếu", icon: "doc", section: "Đầu tư" },
  { label: "Danh mục", icon: "bag", section: "Đầu tư" },
  { label: "AI Advisor", icon: "user", section: "Công cụ" },
  { label: "Báo cáo", icon: "bar", section: "Công cụ" },
  { label: "Kiến thức", icon: "info", section: "Công cụ" },
];

export const TOP_TABS = ["Ngành hút tiền", "Ngành mạnh", "Mã hút tiền", "Mã mạnh"];

export const BOTTOM_TABS = [
  { label: "Dashboard", icon: "grid" },
  { label: "Thị trường", icon: "chart" },
  { label: "Danh mục", icon: "bag" },
  { label: "AI Advisor", icon: "user" },
  { label: "Khám phá", icon: "info" },
];
