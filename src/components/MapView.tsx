"use client";

export function MapView() {
  return (
    <div className="px-5 pt-4">
      <div
        className="w-full relative overflow-hidden rounded-2xl border"
        style={{
          aspectRatio: "1/1",
          borderColor: "var(--border)",
          background: `
            repeating-linear-gradient(0deg, rgba(255,255,255,.55) 0 1px, transparent 1px 34px),
            repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 1px, transparent 1px 34px),
            repeating-linear-gradient(0deg, rgba(255,255,255,.25) 0 1px, transparent 1px 11px),
            repeating-linear-gradient(90deg, rgba(255,255,255,.25) 0 1px, transparent 1px 11px),
            #cfe0bd`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(115deg, transparent 40%, rgba(139,186,214,.55) 46%, rgba(139,186,214,.65) 54%, transparent 60%)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 22% 30%, rgba(90,110,70,.25) 0 6%, transparent 7%), radial-gradient(circle at 70% 65%, rgba(90,110,70,.22) 0 5%, transparent 6%), radial-gradient(circle at 78% 22%, rgba(90,110,70,.2) 0 4%, transparent 5%)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[11px]" style={{ color: "#4a564f" }}>
          Straßenkarte folgt (z. B. OpenStreetMap-Ausschnitt) — gleiche Plätze &amp; Filter wie Radar
        </div>
      </div>
      <div className="text-[9px] text-center mt-2" style={{ color: "#4a564f" }}>
        Karte ist optionale Zweitansicht im OSM-Stil — Radar bleibt Standard/Identität
      </div>
    </div>
  );
}
