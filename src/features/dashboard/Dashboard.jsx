import { useMemo } from "react";
import { useTheme } from "../../theme";
import { mono } from "../../styles/tokens";
import { useSMDT, useRealtimeFeed } from "../../data/useSMDT";
import { useStockWave, useRealtimeStockWaveFeed } from "../../data/useStockWave";
import { fmtNum, pct } from "../../app/formatters";
import { useNarrow } from "../../app/useNarrow";
import { Card, CardHeader, Clink, StatCard, Sig } from "../../components/ui";

export function ModDashboard() {
  const { t } = useTheme();
  const narrow = useNarrow();
  const sw = useStockWave();
  const smdt = useSMDT();
  useRealtimeStockWaveFeed(sw.applyTick);
  useRealtimeFeed(smdt.applyTick);

  const latest = useMemo(() => [...sw.rows].reverse()[0] || null, [sw.rows]);

  // Tín hiệu ngành chủ lực: suy ra từ SMDT phiên gần nhất.
  const latestDate = smdt.datesAsc[smdt.datesAsc.length - 1];
  const sectorSignals = smdt.branches
    .filter((b) => b.isCore)
    .map((b) => {
      const v = smdt.matrix[b.key]?.[latestDate];
      let sig = "so";
      if (v != null) sig = v >= 90 ? "si" : v >= 60 ? "sn" : v >= 30 ? "so" : "st";
      return { name: b.label, sig };
    });

  const wb = latest ? pct(latest.waitbuy, latest.total) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(4,1fr)", gap: 10 }}>
        <StatCard label="VN-Index" val="1,237" sub="+12.45đ (+1.02%)" colorKey="G" />
        <StatCard label="GTGD toàn TT" val={<span style={{ fontSize: 22 }}>18,250 tỷ</span>} sub="+2.3% so hôm qua" colorKey="B" />
        <StatCard label="Mã Chờ mua" val={latest ? fmtNum(latest.waitbuy) : "—"} sub={latest ? `${wb.toFixed(1)}% tổng số mã` : ""} colorKey="A" />
        <StatCard label="Độ tin cậy dò sóng" val={latest ? `${latest.reliability.toFixed(0)}%` : "—"} sub="phiên mới nhất" colorKey="P" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(2,1fr)", gap: 10 }}>
        <Card>
          <CardHeader icon="ti-wave-sine" title="Sóng cổ phiếu hôm nay" right={<Clink onClick={() => window.dispatchEvent(new CustomEvent("st-nav", { detail: "stock-wave" }))}>Chi tiết →</Clink>} />
          {latest ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", padding: "10px 0" }}>
                {[[latest.waitbuy, t.G, "Chờ mua"], [latest.buy, t.MU, "Mua"], [latest.waitsell, t.A, "Chờ bán"], [latest.sell, t.R, "Bán"]].map(([v, c, l]) => (
                  <div key={l}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: c, ...mono }}>{fmtNum(v)}</div>
                    <div style={{ fontSize: 10, color: "var(--t4)", textTransform: "uppercase", letterSpacing: ".05em", marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: t.Gs, border: `0.5px solid ${t.Gb}`, borderRadius: 8, padding: "8px 11px", marginTop: 8, fontSize: 12, color: t.G, fontWeight: 600 }}>
                ↑ {wb >= 35 ? "Khả năng tạo đáy cao" : "Theo dõi dòng tiền"} — Tin cậy {latest.reliability.toFixed(0)}%
              </div>
            </>
          ) : <div style={{ padding: 20, textAlign: "center", color: "var(--t3)" }}>Đang tải…</div>}
        </Card>
        <Card>
          <CardHeader icon="ti-building-community" title="Dòng tiền ngành" right={<Clink onClick={() => window.dispatchEvent(new CustomEvent("st-nav", { detail: "smdt-nganh" }))}>Chi tiết →</Clink>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 2 }}>
            {sectorSignals.length ? sectorSignals.map(({ name, sig }) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>{name}</span>
                <Sig type={sig} />
              </div>
            )) : <div style={{ padding: 20, textAlign: "center", color: "var(--t3)" }}>Đang tải…</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
