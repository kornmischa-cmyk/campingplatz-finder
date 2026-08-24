"use client";

import { ANLASS_ALL } from "@/lib/places";
import { EditPlaceDraft } from "@/lib/types";
import { Chip, RowButton } from "./Chip";

const COMPASS = [
  { label: "N", deg: 0 },
  { label: "NO", deg: 45 },
  { label: "O", deg: 90 },
  { label: "SO", deg: 135 },
  { label: "S", deg: 180 },
  { label: "SW", deg: 225 },
  { label: "W", deg: 270 },
  { label: "NW", deg: 315 },
];

export function EditPlaceSheet({
  draft,
  onChangeField,
  onToggleType,
  onSetStrom,
  onSetEco,
  onToggleAnlass,
  onSetHours,
  onSetBearing,
  onCancel,
  onSave,
}: {
  draft: EditPlaceDraft;
  onChangeField: (field: "name" | "region", value: string) => void;
  onToggleType: (t: "zelt" | "wowa" | "haus") => void;
  onSetStrom: (v: "ja" | "nein" | "unklar") => void;
  onSetEco: (v: 1 | 2 | 3) => void;
  onToggleAnlass: (a: string) => void;
  onSetHours: (h: number) => void;
  onSetBearing: (deg: number) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="absolute inset-0 z-5 flex flex-col" style={{ background: "var(--bg-app)" }}>
      <div className="px-5 py-[18px] flex justify-between border-b" style={{ borderColor: "var(--border)" }}>
        <div onClick={onCancel} className="text-xs cursor-pointer" style={{ color: "var(--text-dim)" }}>
          ✕ abbrechen
        </div>
        <div className="text-xs font-semibold">Platz bearbeiten</div>
        <div className="w-[60px]" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            NAME
          </div>
          <input
            className="w-full box-border mt-[5px] rounded-lg px-[11px] py-[11px] text-[13px]"
            style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-hi)" }}
            value={draft.name}
            onChange={(e) => onChangeField("name", e.target.value)}
          />
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            REGION / LAGE
          </div>
          <input
            className="w-full box-border mt-[5px] rounded-lg px-[11px] py-[11px] text-[13px]"
            style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-hi)" }}
            value={draft.region}
            onChange={(e) => onChangeField("region", e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
              FAHRZEIT (H)
            </div>
            <input
              type="number"
              min={0.25}
              max={12}
              step={0.25}
              className="w-full box-border mt-[5px] rounded-lg px-[11px] py-[11px] text-[13px]"
              style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-hi)" }}
              value={draft.hours}
              onChange={(e) => onSetHours(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            HIMMELSRICHTUNG (RADAR-POSITION)
          </div>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {COMPASS.map((c) => (
              <Chip key={c.deg} active={draft.bearing === c.deg} onClick={() => onSetBearing(c.deg)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            ÜBERNACHTUNG
          </div>
          <div className="flex gap-2 flex-wrap mt-1.5">
            <Chip active={draft.types.zelt} onClick={() => onToggleType("zelt")}>Zelt</Chip>
            <Chip active={draft.types.wowa} onClick={() => onToggleType("wowa")}>Wowa</Chip>
            <Chip active={draft.types.haus} onClick={() => onToggleType("haus")}>Haus</Chip>
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            STROM AM PLATZ
          </div>
          <div className="flex gap-2 mt-1.5">
            <Chip active={draft.strom === "ja"} onClick={() => onSetStrom("ja")}>Ja</Chip>
            <Chip active={draft.strom === "nein"} onClick={() => onSetStrom("nein")}>Nein</Chip>
            <Chip active={draft.strom === "unklar"} onClick={() => onSetStrom("unklar")}>❓ unklar</Chip>
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            ÖKO-LEVEL
          </div>
          <div className="flex gap-2 mt-1.5">
            <Chip active={draft.eco === 1} onClick={() => onSetEco(1)}>◐</Chip>
            <Chip active={draft.eco === 2} onClick={() => onSetEco(2)}>◐◐</Chip>
            <Chip active={draft.eco === 3} onClick={() => onSetEco(3)}>◐◐◐</Chip>
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            ANLASS
          </div>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {ANLASS_ALL.map((a) => (
              <Chip key={a} active={draft.anlass.includes(a)} onClick={() => onToggleAnlass(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <RowButton variant="solid" onClick={onSave}>
          Änderungen speichern
        </RowButton>
      </div>
    </div>
  );
}
