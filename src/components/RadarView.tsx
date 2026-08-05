"use client";

import { Place } from "@/lib/types";
import { RADAR_MAX_H } from "@/lib/places";

const RING_LABELS = [
  { hours: "6h", topPct: 13.5 },
  { hours: "4h", topPct: 26.6 },
  { hours: "2h", topPct: 39.75 },
];

export function RadarView({
  eligible,
  maxHours,
  onOpen,
}: {
  eligible: Place[];
  maxHours: number;
  onOpen: (id: number) => void;
}) {
  const ringTop = 50 - Math.min(maxHours / RADAR_MAX_H, 1) * 46;

  return (
    <div className="px-5 pt-4 flex justify-center">
      <div
        className="w-full relative overflow-hidden rounded-full border"
        style={{ aspectRatio: "1/1", borderColor: "var(--border)", background: "var(--bg-card)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=8.4,49.6,10.9,51.4&bboxSR=4326&size=800,800&format=jpg&f=image"
          alt="Satellitenbild"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,.35) 100%)" }}
        />
        <div className="absolute rounded-full" style={{ inset: "10.57%", border: "1px dashed rgba(238,240,234,.4)" }} />
        <div className="absolute rounded-full" style={{ inset: "23.71%", border: "1px dashed rgba(238,240,234,.4)" }} />
        <div className="absolute rounded-full" style={{ inset: "36.86%", border: "1px dashed rgba(238,240,234,.4)" }} />
        <div
          className="absolute rounded-full transition-all duration-[350ms]"
          style={{
            border: "1.5px solid var(--accent)",
            top: `${ringTop}%`,
            left: `${ringTop}%`,
            right: `${ringTop}%`,
            bottom: `${ringTop}%`,
          }}
        />
        <div
          className="absolute rounded-full z-[2]"
          style={{
            left: "50%",
            top: "50%",
            width: 7,
            height: 7,
            background: "var(--text-hi)",
            transform: "translate(-50%,-50%)",
            boxShadow: "0 0 0 2px rgba(0,0,0,.5)",
          }}
        />
        {[
          { label: "N", style: { top: 6, left: "50%", transform: "translateX(-50%)" } },
          { label: "S", style: { bottom: 6, left: "50%", transform: "translateX(-50%)" } },
          { label: "W", style: { left: 6, top: "50%", transform: "translateY(-50%)" } },
          { label: "E", style: { right: 6, top: "50%", transform: "translateY(-50%)" } },
        ].map((d) => (
          <div
            key={d.label}
            className="absolute text-[9px] font-mono rounded-[3px] px-[3px]"
            style={{ ...d.style, color: "var(--text-hi)", background: "rgba(18,20,15,.65)" }}
          >
            {d.label}
          </div>
        ))}
        {RING_LABELS.map((r) => (
          <div
            key={r.hours}
            className="absolute text-[8px] font-mono rounded-[3px] px-[3px]"
            style={{ top: `${r.topPct}%`, left: "50%", transform: "translateX(-50%)", color: "var(--text-hi)", background: "rgba(18,20,15,.65)" }}
          >
            {r.hours}
          </div>
        ))}
        {eligible.map((p) => {
          const angle = ((p.bearing - 90) * Math.PI) / 180;
          const r = Math.min(p.hours / RADAR_MAX_H, 1) * 46;
          const x = 50 + Math.cos(angle) * r;
          const y = 50 + Math.sin(angle) * r;
          const active = p.hours <= maxHours;
          const color = p.status === "besucht" ? "var(--accent)" : "var(--accent-green)";
          const glowColor = p.status === "besucht" ? "rgba(244,163,92,.22)" : "rgba(92,138,58,.22)";
          return (
            <div
              key={p.id}
              onClick={() => onOpen(p.id)}
              className="absolute rounded-full cursor-pointer"
              style={{
                width: 11,
                height: 11,
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%,-50%)",
                background: active ? color : "rgba(238,240,234,.55)",
                border: active ? "none" : "1.5px solid rgba(18,20,15,.8)",
                opacity: active ? 1 : 0.85,
                boxShadow: active ? `0 0 0 4px ${glowColor}` : "0 0 0 1px rgba(18,20,15,.5)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
