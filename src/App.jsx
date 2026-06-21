import { useState, useEffect } from "react";
import { DesktopDashboard } from "./layouts/DesktopDashboard";
import { MobileDashboard } from "./layouts/MobileDashboard";

/* ─────────────────────────── ROOT ──────────────────────────────────── */
export default function App() {
  // Responsive breakpoint
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const isMobile = width < 768;
  return isMobile ? <MobileDashboard /> : <DesktopDashboard />;
}
