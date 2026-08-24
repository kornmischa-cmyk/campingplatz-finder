"use client";

import { Place, StatusFilter, TypeFilter } from "@/lib/types";
import { Chip } from "./Chip";

const TYPE_LABELS: Record<keyof TypeFilter, string> = { zelt: "Zelt", wowa: "Wowa", haus: "Haus", trek: "Trekking" };

export function PlacesListView({
  places,
  types,
  status,
  search,
  onSearchChange,
  onToggleType,
  onSetStatus,
  onOpen,
}: {
  places: Place[];
  types: TypeFilter;
  status: StatusFilter;
  search: string;
  onSearchChange: (v: string) => void;
  onToggleType: (t: keyof TypeFilter) => void;
  onSetStatus: (s: StatusFilter) => void;
  onOpen: (id: number) => void;
}) {
  const query = search.trim().toLowerCase();

  const filtered = places
    .filter((p) => p.types.some((t) => types[t]))
    .filter((p) => status === "alle" || p.status === status)
    .filter((p) => !query || p.name.toLowerCase().includes(query) || p.region.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  return (
    <div className="px-5 pt-4 pb-[100px] flex flex-col gap-3">
      <input
        className="w-full box-border rounded-lg px-[11px] py-[10px] text-[13px]"
        style={{ border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-hi)" }}
        placeholder="Suche nach Name oder Region…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="flex gap-2 flex-wrap">
        <Chip active={types.zelt} onClick={() => onToggleType("zelt")}>Zelt</Chip>
        <Chip active={types.wowa} onClick={() => onToggleType("wowa")}>Wowa</Chip>
        <Chip active={types.haus} onClick={() => onToggleType("haus")}>Haus</Chip>
        <Chip active={types.trek} onClick={() => onToggleType("trek")}>Trekking</Chip>
      </div>
      <div className="flex gap-2">
        <Chip active={status === "alle"} activeColor="var(--petrol-text)" onClick={() => onSetStatus("alle")}>Alle</Chip>
        <Chip active={status === "besucht"} activeColor="var(--petrol-text)" onClick={() => onSetStatus("besucht")}>★ besucht</Chip>
        <Chip active={status === "wunsch"} activeColor="var(--petrol-text)" onClick={() => onSetStatus("wunsch")}>✎ Wunsch</Chip>
      </div>

      <div className="text-[10px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
        ALLE PLÄTZE ({filtered.length})
      </div>

      {filtered.length > 0 &&
        filtered.map((p) => (
          <div
            key={p.id}
            onClick={() => onOpen(p.id)}
            className="flex items-center gap-3 rounded-xl px-3 py-[11px] cursor-pointer"
            style={{ background: "var(--bg-card)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</div>
              <div className="text-[10px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "var(--text-dim)" }}>
                {p.region} · {p.types.map((t) => TYPE_LABELS[t]).join(", ")}
              </div>
            </div>
            <div className="text-[11px] flex-none" style={{ color: p.status === "besucht" ? "var(--accent)" : "var(--accent-green)" }}>
              {p.status === "besucht" ? (p.rating ? "★".repeat(p.rating) + "☆".repeat(5 - p.rating) : "★ besucht") : "✎ Wunsch"}
            </div>
          </div>
        ))}

      {filtered.length === 0 && (
        <div
          className="rounded-xl p-[18px] text-center text-[11px]"
          style={{ border: "1.5px dashed var(--border)", color: "var(--text-dim)" }}
        >
          Keine Plätze mit diesen Filtern.
        </div>
      )}
    </div>
  );
}
