"use client";

import { ANLASS_ALL } from "@/lib/places";
import { StatusFilter, TypeFilter } from "@/lib/types";
import { Chip, RowButton } from "./Chip";

export function FilterSheet({
  types,
  ecoMin,
  anlass,
  status,
  trekException,
  resultCount,
  onToggleType,
  onSetEcoMin,
  onToggleAnlass,
  onSetStatus,
  onToggleTrekException,
  onClose,
  onReset,
}: {
  types: TypeFilter;
  ecoMin: number;
  anlass: string[];
  status: StatusFilter;
  trekException: boolean;
  resultCount: number;
  onToggleType: (t: keyof TypeFilter) => void;
  onSetEcoMin: (n: number) => void;
  onToggleAnlass: (a: string) => void;
  onSetStatus: (s: StatusFilter) => void;
  onToggleTrekException: () => void;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute inset-0 z-5 flex flex-col" style={{ background: "var(--bg-app)" }}>
      <div className="px-5 py-[18px] flex justify-between items-center border-b" style={{ borderColor: "var(--border)" }}>
        <div onClick={onClose} className="text-xs cursor-pointer" style={{ color: "var(--text-dim)" }}>
          ✕ schließen
        </div>
        <div className="text-xs font-semibold">Filter</div>
        <div onClick={onReset} className="text-[11px] cursor-pointer" style={{ color: "var(--text-dim)" }}>
          Zurücksetzen
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <div>
          <div className="text-[9px] tracking-[1px] mt-0.5" style={{ color: "var(--text-dim)" }}>
            ÜBERNACHTUNG
          </div>
          <div className="flex gap-2 flex-wrap mt-1.5">
            <Chip active={types.zelt} onClick={() => onToggleType("zelt")}>Zelt</Chip>
            <Chip active={types.wowa} onClick={() => onToggleType("wowa")}>Wowa</Chip>
            <Chip active={types.haus} onClick={() => onToggleType("haus")}>Haus</Chip>
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-[1px] mt-0.5" style={{ color: "var(--text-dim)" }}>
            ÖKO-LEVEL (Mindestwert)
          </div>
          <div className="flex gap-2 flex-wrap mt-1.5">
            <Chip active={ecoMin === 0} activeColor="var(--petrol-text)" onClick={() => onSetEcoMin(0)}>Egal</Chip>
            <Chip active={ecoMin === 1} activeColor="var(--petrol-text)" onClick={() => onSetEcoMin(1)}>◐ neutral</Chip>
            <Chip active={ecoMin === 2} activeColor="var(--petrol-text)" onClick={() => onSetEcoMin(2)}>◐◐ naturnah</Chip>
            <Chip active={ecoMin === 3} activeColor="var(--petrol-text)" onClick={() => onSetEcoMin(3)}>◐◐◐ zertifiziert</Chip>
          </div>
          <div className="text-[10px] mt-1.5 leading-[1.5]" style={{ color: "var(--text-dim)" }}>
            ◐ neutral (kein Zertifikat) · ◐◐ naturnahes Konzept · ◐◐◐ stark / zertifiziert (z. B. Green Key). Weiches
            Kriterium — filtert nur bei aktivem Mindestwert.
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-[1px] mt-0.5" style={{ color: "var(--text-dim)" }}>
            ANLASS
          </div>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {ANLASS_ALL.map((a) => (
              <Chip key={a} active={anlass.includes(a)} activeColor="var(--petrol-text)" onClick={() => onToggleAnlass(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-[1px] mt-0.5" style={{ color: "var(--text-dim)" }}>
            STATUS
          </div>
          <div className="flex gap-2 mt-1.5">
            <Chip active={status === "alle"} activeColor="var(--petrol-text)" onClick={() => onSetStatus("alle")}>Alle</Chip>
            <Chip active={status === "besucht"} activeColor="var(--petrol-text)" onClick={() => onSetStatus("besucht")}>★ besucht</Chip>
            <Chip active={status === "wunsch"} activeColor="var(--petrol-text)" onClick={() => onSetStatus("wunsch")}>✎ Wunsch</Chip>
          </div>
        </div>
        <div className="pt-3.5 flex items-center gap-2.5" style={{ borderTop: "1px dashed var(--border)" }}>
          <div
            onClick={onToggleTrekException}
            className="relative flex-none cursor-pointer"
            style={{
              width: 34,
              height: 19,
              borderRadius: 12,
              background: trekException ? "var(--accent-green)" : "var(--border)",
            }}
          >
            <div
              className="absolute rounded-full transition-all"
              style={{
                width: 15,
                height: 15,
                top: 2,
                left: trekException ? 17 : 2,
                background: "var(--text-hi)",
              }}
            />
          </div>
          <div className="text-[11px]" style={{ color: "#c7cabd" }}>
            stromlose Trekking-Ausnahmen einbeziehen
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <RowButton variant="solid" onClick={onClose}>
          Anwenden — {resultCount} Treffer
        </RowButton>
      </div>
    </div>
  );
}
