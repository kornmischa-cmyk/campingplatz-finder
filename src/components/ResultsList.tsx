"use client";

import { Place } from "@/lib/types";
import { fmtH } from "@/lib/places";
import { RowButton } from "./Chip";

export function ResultsList({
  results,
  resultCount,
  maxHoursLabel,
  nearestOutside,
  onOpen,
  onJumpToNearest,
  onResetFilters,
}: {
  results: Place[];
  resultCount: number;
  maxHoursLabel: string;
  nearestOutside: Place | undefined;
  onOpen: (id: number) => void;
  onJumpToNearest: () => void;
  onResetFilters: () => void;
}) {
  return (
    <div className="px-5 pt-4 pb-[90px] flex flex-col gap-2">
      <div className="text-[10px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
        ERGEBNISSE · NACH FAHRZEIT ({resultCount})
      </div>

      {results.length > 0 &&
        results.map((p) => (
          <div
            key={p.id}
            onClick={() => onOpen(p.id)}
            className="flex items-center gap-3 rounded-xl px-3 py-[11px] cursor-pointer"
            style={{ background: "var(--bg-card)" }}
          >
            <div className="font-mono font-bold text-base min-w-[44px]" style={{ color: "var(--accent)" }}>
              {fmtH(p.hours)}h
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</div>
              <div className="text-[10px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "var(--text-dim)" }}>
                {p.region}
              </div>
            </div>
            {p.status === "besucht" && (
              <div className="text-[11px]" style={{ color: "var(--accent)" }}>
                {p.rating ? "★".repeat(p.rating) + "☆".repeat(5 - p.rating) : ""}
              </div>
            )}
          </div>
        ))}

      {results.length === 0 && (
        <div
          className="rounded-xl p-[18px] text-center flex flex-col gap-[9px] items-center"
          style={{ border: "1.5px dashed var(--border)" }}
        >
          <div className="text-[13px] font-bold">Nichts in Reichweite bei {maxHoursLabel}h</div>
          <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            {nearestOutside
              ? `Nächstgelegener passender Platz: ${fmtH(nearestOutside.hours)}h`
              : "Filter lockern, um mehr Plätze zu sehen."}
          </div>
          {nearestOutside && (
            <RowButton variant="solid" onClick={onJumpToNearest}>
              Auf {fmtH(nearestOutside.hours)}h erhöhen →
            </RowButton>
          )}
          <RowButton variant="outline" onClick={onResetFilters}>
            Filter lockern
          </RowButton>
        </div>
      )}
    </div>
  );
}
