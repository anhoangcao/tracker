import { useSMDT, useRealtimeFeed } from "../../data/useSMDT";
import { useNarrow } from "../../app/useNarrow";
import { Card, CardHeader, Clink, StatCard, Sig } from "../../components/ui";

export function ModDashboard() {
  const narrow = useNarrow();
  const smdt = useSMDT();
  useRealtimeFeed(smdt.applyTick);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "repeat(2,1fr)", gap: 10 }}>
        <StatCard label="VN-Index" val="1,237" sub="+12.45đ (+1.02%)" colorKey="G" />
        <StatCard label="GTGD toàn TT" val={<span style={{ fontSize: 22 }}>18,250 tỷ</span>} sub="+2.3% so hôm qua" colorKey="B" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
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
