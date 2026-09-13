"use client";

import { ANLASS_ALL } from "@/lib/places";
import { NewPlaceDraft } from "@/lib/types";
import { Chip, RowButton } from "./Chip";

export function AddFlowStep1({
  addLink,
  addAnalyzing,
  addError,
  onChangeLink,
  onCancel,
  onAnalyze,
}: {
  addLink: string;
  addAnalyzing: boolean;
  addError: string | null;
  onChangeLink: (v: string) => void;
  onCancel: () => void;
  onAnalyze: () => void;
}) {
  return (
    <div className="absolute inset-0 z-5 flex flex-col" style={{ background: "var(--bg-app)" }}>
      <div className="px-5 py-[18px] flex justify-between border-b" style={{ borderColor: "var(--border)" }}>
        <div onClick={onCancel} className="text-xs cursor-pointer" style={{ color: "var(--text-dim)" }}>
          ✕ abbrechen
        </div>
        <div className="text-xs font-semibold">Neuer Wunschplatz</div>
        <div className="w-[60px]" />
      </div>
      <div className="flex-1 flex flex-col justify-center gap-3 p-6 text-center items-center">
        <div className="text-sm font-bold">Link zum Platz einfügen</div>
        <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
          Die KI liest die Seite und schlägt Name, Region, Übernachtungsart, Strom, Öko-Level und Anlass vor.
        </div>
        <input
          className="w-full box-border rounded-lg px-[11px] py-[11px] text-[13px]"
          style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-hi)" }}
          placeholder="https://…"
          value={addLink}
          onChange={(e) => onChangeLink(e.target.value)}
        />
        {addAnalyzing && (
          <div className="w-full box-border rounded-lg p-2.5 text-[11px]" style={{ background: "var(--petrol-bg)", color: "var(--petrol-text)" }}>
            ⏳ KI analysiert Link …
          </div>
        )}
        {addError && !addAnalyzing && (
          <div className="w-full box-border rounded-lg p-2.5 text-[11px]" style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}>
            {addError}
          </div>
        )}
        {!addAnalyzing && (
          <RowButton variant="solid" onClick={onAnalyze}>
            Analysieren →
          </RowButton>
        )}
      </div>
    </div>
  );
}

export function AddFlowStep2({
  ext,
  onChangeField,
  onToggleType,
  onSetStrom,
  onSetEco,
  onToggleAnlass,
  onSetStatus,
  onSetRating,
  onSetHours,
  onBack,
  onConfirm,
}: {
  ext: NewPlaceDraft;
  onChangeField: (field: "name" | "region", value: string) => void;
  onToggleType: (t: "zelt" | "wowa" | "haus") => void;
  onSetStrom: (v: "ja" | "nein" | "unklar") => void;
  onSetEco: (v: 1 | 2 | 3) => void;
  onToggleAnlass: (a: string) => void;
  onSetStatus: (v: "wunsch" | "besucht") => void;
  onSetRating: (n: number) => void;
  onSetHours: (h: number) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-5 flex flex-col" style={{ background: "var(--bg-app)" }}>
      <div className="px-5 py-[18px] flex justify-between border-b" style={{ borderColor: "var(--border)" }}>
        <div onClick={onBack} className="text-xs cursor-pointer" style={{ color: "var(--text-dim)" }}>
          ← zurück
        </div>
        <div className="text-xs font-semibold">Von KI erkannt</div>
        <div className="w-[50px]" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        <div className="rounded-lg p-[9px] text-[11px]" style={{ background: "var(--petrol-bg)", color: "var(--petrol-text)" }}>
          ✓ Analyse abgeschlossen — bitte prüfen, alle Felder bearbeitbar
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            NAME
          </div>
          <input
            className="w-full box-border mt-[5px] rounded-lg px-[11px] py-[11px] text-[13px]"
            style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-hi)" }}
            value={ext.name}
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
            value={ext.region}
            onChange={(e) => onChangeField("region", e.target.value)}
          />
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            FAHRZEIT (H) {ext.hours == null && "— konnte nicht automatisch berechnet werden"}
          </div>
          <input
            type="number"
            min={0.25}
            max={12}
            step={0.25}
            className="w-full box-border mt-[5px] rounded-lg px-[11px] py-[11px] text-[13px]"
            style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-hi)" }}
            value={ext.hours ?? 1.5}
            onChange={(e) => onSetHours(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            ÜBERNACHTUNG
          </div>
          <div className="flex gap-2 flex-wrap mt-1.5">
            <Chip active={ext.types.zelt} onClick={() => onToggleType("zelt")}>Zelt</Chip>
            <Chip active={ext.types.wowa} onClick={() => onToggleType("wowa")}>Wowa</Chip>
            <Chip active={ext.types.haus} onClick={() => onToggleType("haus")}>Haus</Chip>
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            STROM AM PLATZ
          </div>
          <div className="flex gap-2 mt-1.5">
            <Chip active={ext.strom === "ja"} onClick={() => onSetStrom("ja")}>Ja</Chip>
            <Chip active={ext.strom === "nein"} onClick={() => onSetStrom("nein")}>Nein</Chip>
            <Chip active={ext.strom === "unklar"} onClick={() => onSetStrom("unklar")}>❓ unklar</Chip>
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            ÖKO-LEVEL
          </div>
          <div className="flex gap-2 mt-1.5">
            <Chip active={ext.eco === 1} onClick={() => onSetEco(1)}>◐</Chip>
            <Chip active={ext.eco === 2} onClick={() => onSetEco(2)}>◐◐</Chip>
            <Chip active={ext.eco === 3} onClick={() => onSetEco(3)}>◐◐◐</Chip>
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            ANLASS
          </div>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {ANLASS_ALL.map((a) => (
              <Chip key={a} active={ext.anlass.includes(a)} onClick={() => onToggleAnlass(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </div>
        <div className="pt-2" style={{ borderTop: "1px dashed var(--border)" }}>
          <div className="text-[9px] tracking-[1px] mt-3.5" style={{ color: "var(--text-dim)" }}>
            STATUS
          </div>
          <div className="flex gap-2 mt-1.5">
            <Chip active={ext.status === "wunsch"} onClick={() => onSetStatus("wunsch")}>✎ Wunsch</Chip>
            <Chip active={ext.status === "besucht"} onClick={() => onSetStatus("besucht")}>★ besucht</Chip>
          </div>
        </div>
        {ext.status === "besucht" && (
          <div>
            <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
              BEWERTUNG (OPTIONAL)
            </div>
            <div className="flex gap-1 mt-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  onClick={() => onSetRating(n)}
                  className="text-[22px] cursor-pointer"
                  style={{ color: "var(--accent)" }}
                >
                  {n <= (ext.rating || 0) ? "★" : "☆"}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <RowButton variant="solid" onClick={onConfirm}>
          {ext.status === "besucht" ? "Zum Pool hinzufügen (als besucht)" : "Zum Pool hinzufügen (als Wunsch)"}
        </RowButton>
      </div>
    </div>
  );
}
