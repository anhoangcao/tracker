# StockTraders AI — Dashboard

React + Vite recreation of the StockTraders AI market dashboard (Vietnamese stock-trading UI, dark theme). Responsive: a sidebar/grid layout on desktop and a drawer + bottom-tab layout on mobile (breakpoint at 768px).

## Quick start

```bash
npm install
npm run dev      # dev server on http://localhost:3000
```

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server (port 3000)|
| `npm run build`   | Production build to `dist/`          |
| `npm run preview` | Preview the production build         |

## Project structure

```
src/
├── main.jsx                  # Entry point; injects global CSS
├── App.jsx                   # Root; desktop/mobile switch on window width
├── styles/
│   └── tokens.js             # Design tokens (T), global CSS, helpers
├── data/
│   └── dashboardData.js      # All static dashboard data
├── components/
│   ├── Icon.jsx              # Inline SVG icon set
│   ├── atoms.jsx             # Card, CardHeader, Pulse, StrengthBar, StockTag
│   ├── DonutChart.jsx        # Market-state donut
│   ├── Sidebar.jsx           # Desktop sidebar nav
│   ├── Topbar.jsx            # Top bar (indices + user)
│   ├── BottomNav.jsx         # Mobile bottom tab bar
│   ├── TopTabSwitcher.jsx    # Mobile tabbed top-lists
│   └── sections/             # Dashboard content cards
│       ├── MarketBanner.jsx
│       ├── MoneyFlow.jsx
│       ├── InvestorProfile.jsx
│       ├── Portfolio.jsx
│       ├── TopLists.jsx
│       └── AIAdvisor.jsx
└── layouts/
    ├── DesktopDashboard.jsx
    └── MobileDashboard.jsx
```

> Data is hard-coded for the UI demo — "Dữ liệu chỉ mang tính tham khảo, không phải lời khuyên đầu tư."
