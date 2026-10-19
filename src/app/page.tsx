"use client";

import { useEffect, useMemo, useState } from "react";
import { INITIAL_PLACES, fmtH } from "@/lib/places";
import { loadPlaces, savePlaces } from "@/lib/storage";
import { EditPlaceDraft, NewPlaceDraft, Place, PhotoView, Status, StatusFilter, TypeFilter, ViewMode } from "@/lib/types";
import { Chip } from "@/components/Chip";
import { RadarView } from "@/components/RadarView";
import { PlacesListView } from "@/components/PlacesListView";
import { ResultsList } from "@/components/ResultsList";
import { FilterSheet } from "@/components/FilterSheet";
import { DetailSheet } from "@/components/DetailSheet";
import { EditPlaceSheet } from "@/components/EditPlaceSheet";
import { AddFlowStep1, AddFlowStep2 } from "@/components/AddFlow";

const DEFAULT_TYPES: TypeFilter = { zelt: true, wowa: true, haus: true, trek: false };
const DEFAULT_TYPES_ALL: TypeFilter = { zelt: true, wowa: true, haus: true, trek: true };

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<Place[]>(() => loadPlaces() ?? INITIAL_PLACES);
  const [maxHours, setMaxHours] = useState(2);
  const [types, setTypes] = useState<TypeFilter>(DEFAULT_TYPES);
  const [ecoMin, setEcoMin] = useState(0);
  const [anlass, setAnlass] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusFilter>("alle");
  const [trekException, setTrekException] = useState(false);
  const [view, setView] = useState<ViewMode>("radar");
  const [listTypes, setListTypes] = useState<TypeFilter>(DEFAULT_TYPES_ALL);
  const [listStatus, setListStatus] = useState<StatusFilter>("alle");
  const [listSearch, setListSearch] = useState("");
  const [photoView, setPhotoView] = useState<PhotoView>("fotos");
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [addStep, setAddStep] = useState<0 | 1 | 2>(0);
  const [addLink, setAddLink] = useState("");
  const [addAnalyzing, setAddAnalyzing] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [ext, setExt] = useState<NewPlaceDraft | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditPlaceDraft | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recalcing, setRecalcing] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  // Persist every change (added/removed places, ratings, status changes).
  // Safe re: hydration — the loading skeleton shown for the first 900ms
  // doesn't depend on `places`, so an initial-state difference between
  // server (no localStorage) and client (may have stored data) never
  // produces mismatched markup.
  useEffect(() => {
    savePlaces(places);
  }, [places]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  const eligible = useMemo(() => {
    return places.filter((p) => {
      if (p.strom === "nein") {
        if (!(p.stromException && trekException && types.trek)) return false;
      }
      if (!p.types.some((t) => types[t])) return false;
      if (ecoMin > 0 && p.eco < ecoMin) return false;
      if (anlass.length && !p.anlass.some((a) => anlass.includes(a))) return false;
      if (status === "besucht" && p.status !== "besucht") return false;
      if (status === "wunsch" && p.status !== "wunsch") return false;
      return true;
    });
  }, [places, types, ecoMin, anlass, status, trekException]);

  const inRange = useMemo(
    () => eligible.filter((p) => p.hours <= maxHours).sort((a, b) => a.hours - b.hours),
    [eligible, maxHours]
  );
  const nearestOutside = useMemo(
    () => eligible.filter((p) => p.hours > maxHours).sort((a, b) => a.hours - b.hours)[0],
    [eligible, maxHours]
  );

  const detail = detailId != null ? places.find((p) => p.id === detailId) ?? null : null;

  function toggleType(t: keyof TypeFilter) {
    setTypes((s) => ({ ...s, [t]: !s[t] }));
  }

  function toggleListType(t: keyof TypeFilter) {
    setListTypes((s) => ({ ...s, [t]: !s[t] }));
  }

  function resetFilters() {
    setTypes(DEFAULT_TYPES);
    setEcoMin(0);
    setAnlass([]);
    setStatus("alle");
    setTrekException(false);
    setFilterOpen(false);
  }

  function toggleAnlass(a: string) {
    setAnlass((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]));
  }

  function setRating(id: number, n: number) {
    setPlaces((ps) => ps.map((p) => (p.id === id ? { ...p, rating: n } : p)));
  }

  function markVisited(id: number) {
    setPlaces((ps) => ps.map((p) => (p.id === id ? { ...p, status: "besucht" as Status, rating: p.rating || 4 } : p)));
  }

  function backToWish(id: number) {
    setPlaces((ps) => ps.map((p) => (p.id === id ? { ...p, status: "wunsch" as Status } : p)));
  }

  function removePlace(id: number) {
    const p = places.find((x) => x.id === id);
    setPlaces((ps) => ps.filter((x) => x.id !== id));
    setDetailId(null);
    if (p) showToast(`${p.name} entfernt`);
  }

  function startEdit(place: Place) {
    setEditDraft({
      name: place.name,
      region: place.region,
      types: {
        zelt: place.types.includes("zelt"),
        wowa: place.types.includes("wowa"),
        haus: place.types.includes("haus"),
        trek: place.types.includes("trek"),
      },
      strom: place.strom,
      eco: place.eco === 0 ? 1 : place.eco,
      anlass: place.anlass,
      status: place.status,
      rating: place.rating,
      hours: place.hours,
      bearing: place.bearing,
    });
    setEditId(place.id);
  }

  function cancelEdit() {
    setEditId(null);
    setEditDraft(null);
  }

  function confirmEdit() {
    if (editId == null || !editDraft) return;
    const activeTypes = (Object.entries(editDraft.types) as [keyof TypeFilter, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => k);
    setPlaces((ps) =>
      ps.map((p) =>
        p.id === editId
          ? {
              ...p,
              name: editDraft.name,
              region: editDraft.region,
              types: activeTypes.length ? activeTypes : ["zelt"],
              strom: editDraft.strom,
              eco: editDraft.eco,
              anlass: editDraft.anlass,
              hours: editDraft.hours,
              bearing: editDraft.bearing,
            }
          : p
      )
    );
    showToast("Änderungen gespeichert");
    setEditId(null);
    setEditDraft(null);
  }

  async function recalcAllDrives() {
    setRecalcing(true);
    const targets = places;
    setRecalcProgress({ done: 0, total: targets.length });
    let updated = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      try {
        const res = await fetch("/api/estimate-drive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: p.name, region: p.region }),
        });
        const data = await res.json();
        if (res.ok) {
          setPlaces((ps) => ps.map((x) => (x.id === p.id ? { ...x, hours: data.hours, bearing: data.bearing } : x)));
          updated++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      setRecalcProgress({ done: i + 1, total: targets.length });
    }
    setRecalcing(false);
    setRecalcProgress(null);
    showToast(`${updated} Fahrzeiten aktualisiert${failed ? `, ${failed} fehlgeschlagen` : ""}`);
  }

  function startAdd() {
    setAddStep(1);
    setAddLink("");
    setAddAnalyzing(false);
    setAddError(null);
    setExt(null);
  }

  async function analyzeLink() {
    if (!addLink.trim()) {
      setAddError("Bitte einen Link einfügen.");
      return;
    }
    setAddAnalyzing(true);
    setAddError(null);
    try {
      const res = await fetch("/api/analyze-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: addLink.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Analyse fehlgeschlagen");
      }
      setExt({
        name: data.name,
        region: data.region,
        types: { ...data.types, trek: false },
        strom: data.strom,
        eco: data.eco,
        anlass: data.anlass,
        status: "wunsch",
        rating: null,
        hours: typeof data.hours === "number" ? data.hours : undefined,
        bearing: typeof data.bearing === "number" ? data.bearing : undefined,
      });
      if (typeof data.hours !== "number") {
        showToast("Fahrzeit konnte nicht ermittelt werden — bitte manuell prüfen");
      }
      setAddStep(2);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Analyse fehlgeschlagen");
    } finally {
      setAddAnalyzing(false);
    }
  }

  function confirmAdd() {
    if (!ext) return;
    const activeTypes = (Object.entries(ext.types) as [keyof TypeFilter, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => k);
    const newPlace: Place = {
      id: Math.max(0, ...places.map((p) => p.id)) + 1,
      name: ext.name,
      region: ext.region,
      status: ext.status,
      types: activeTypes.length ? activeTypes : ["zelt"],
      hours: ext.hours ?? 1.5,
      bearing: ext.bearing ?? 120,
      eco: ext.eco,
      strom: ext.strom,
      anlass: ext.anlass,
      rating: ext.status === "besucht" ? ext.rating : null,
      link: addLink,
      note: "",
      price: "",
      season: "",
      amenities: [],
    };
    setPlaces((ps) => [...ps, newPlace]);
    setAddStep(0);
    showToast("Zum Pool hinzugefügt");
  }

  const sliderFillPct = ((maxHours - 0.5) / (7 - 0.5)) * 100;

  return (
    <div
      className="relative overflow-hidden w-full h-dvh sm:mx-auto sm:my-9 sm:h-[850px] sm:w-[402px] sm:rounded-[34px] sm:shadow-[0_30px_60px_rgba(0,0,0,.28)]"
      style={{
        background: "var(--bg-app)",
        color: "var(--text-hi)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="absolute inset-0 overflow-y-auto">
      {loading ? (
        <div className="p-[22px] flex flex-col gap-3.5">
          <div className="h-3.5 w-1/2 rounded" style={{ background: "var(--bg-card)" }} />
          <div className="h-[70px] rounded-2xl" style={{ background: "var(--bg-card)" }} />
          <div
            className="rounded-full flex items-center justify-center text-[11px]"
            style={{ aspectRatio: "1/1", background: "#171c19", border: "1px solid var(--border)", color: "#546058" }}
          >
            Radar lädt …
          </div>
          <div className="h-2.5 w-[90%] rounded" style={{ background: "var(--bg-card)" }} />
          <div className="h-2.5 w-[70%] rounded" style={{ background: "var(--bg-card)" }} />
          <div className="text-[9px] mt-1.5" style={{ color: "#546058" }}>
            ⚠︎ Fahrzeiten geschätzt, nicht final geroutet
          </div>
        </div>
      ) : (
        <div>
          <div className="px-5 pt-5">
            <div className="flex justify-between items-center">
              <div className="text-[10px] tracking-[1.5px]" style={{ color: "var(--text-dim)" }}>
                AB ZUHAUSE · FREIGERICHT SOMBORN
              </div>
              <div
                onClick={() => setFilterOpen(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ border: "1px solid var(--border)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f4a35c" strokeWidth="2">
                  <path d="M4 6h16M8 12h12M4 12h1M12 18h8M4 18h5" />
                  <circle cx="6" cy="6" r="1.8" fill="#f4a35c" stroke="none" />
                  <circle cx="10" cy="12" r="1.8" fill="#f4a35c" stroke="none" />
                  <circle cx="16" cy="18" r="1.8" fill="#f4a35c" stroke="none" />
                </svg>
              </div>
            </div>

            <div
              className="mt-4 rounded-2xl px-4 py-3.5 relative"
              style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
            >
              <div className="text-[10px] tracking-[1.5px] mb-2" style={{ color: "var(--text-dim)" }}>
                MAX. FAHRZEIT
              </div>
              <div className="flex items-baseline gap-2.5">
                <div className="font-mono font-bold text-[34px] min-w-[80px]" style={{ color: "var(--accent)" }}>
                  {fmtH(maxHours)}
                  <span className="text-base" style={{ color: "var(--text-dim)" }}>
                    h
                  </span>
                </div>
                <div className="flex-1 relative h-5">
                  <div className="absolute left-0 right-0 top-2 h-[3px] rounded" style={{ background: "var(--border)" }} />
                  <div
                    className="absolute left-0 top-2 h-[3px] rounded"
                    style={{ background: "var(--accent)", width: `${sliderFillPct}%` }}
                  />
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      top: 2,
                      width: 15,
                      height: 15,
                      background: "var(--accent)",
                      boxShadow: "0 0 0 5px rgba(244,163,92,.2)",
                      left: `${sliderFillPct}%`,
                      transform: "translateX(-50%)",
                    }}
                  />
                  <input
                    type="range"
                    min={0.5}
                    max={7}
                    step={0.25}
                    value={maxHours}
                    onChange={(e) => setMaxHours(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer m-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3.5">
              <Chip activeColor="var(--accent)" active={view === "radar"} onClick={() => setView("radar")}>
                Radar
              </Chip>
              <Chip activeColor="var(--accent)" active={view === "liste"} onClick={() => setView("liste")}>
                Liste
              </Chip>
            </div>
          </div>

          {view === "radar" && (
            <>
              <RadarView eligible={eligible} maxHours={maxHours} onOpen={setDetailId} />
              <div className="px-5 pt-2 text-[9px] text-center" style={{ color: "#4a564f" }}>
                ⚠︎ Fahrzeiten geschätzt · Ring = Fahrzeit, Winkel = Himmelsrichtung
              </div>

              <div className="px-5 pt-4 flex gap-2 flex-wrap">
                <Chip active={types.zelt} onClick={() => toggleType("zelt")}>
                  <svg className="inline-flex flex-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3l9 18H3z" />
                  </svg>
                  Zelt
                </Chip>
                <Chip active={types.wowa} onClick={() => toggleType("wowa")}>
                  <svg className="inline-flex flex-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="9" width="16" height="8" rx="2" />
                    <circle cx="6" cy="19" r="1.5" />
                    <circle cx="15" cy="19" r="1.5" />
                  </svg>
                  Wowa
                </Chip>
                <Chip active={types.haus} onClick={() => toggleType("haus")}>
                  <svg className="inline-flex flex-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 11l8-6 8 6v9H4z" />
                  </svg>
                  Haus
                </Chip>
                <Chip active={types.trek} onClick={() => toggleType("trek")}>
                  <svg className="inline-flex flex-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 20l4-9 3 4 3-7 4 12" />
                  </svg>
                  Trekking
                </Chip>
              </div>

              <ResultsList
                results={inRange}
                resultCount={inRange.length}
                maxHoursLabel={fmtH(maxHours)}
                nearestOutside={nearestOutside}
                onOpen={setDetailId}
                onJumpToNearest={() => nearestOutside && setMaxHours(nearestOutside.hours)}
                onResetFilters={resetFilters}
              />
            </>
          )}

          {view === "liste" && (
            <PlacesListView
              places={places}
              types={listTypes}
              status={listStatus}
              search={listSearch}
              onSearchChange={setListSearch}
              onToggleType={toggleListType}
              onSetStatus={setListStatus}
              onOpen={setDetailId}
              onRecalcAll={recalcAllDrives}
              recalcing={recalcing}
              recalcProgress={recalcProgress}
            />
          )}
        </div>
      )}
      </div>

      {!loading && (
        <div
          onClick={startAdd}
          className="absolute right-4 bottom-4 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold cursor-pointer z-[2]"
          style={{ background: "var(--accent)", color: "#161b18", boxShadow: "0 8px 20px rgba(244,163,92,.4)" }}
        >
          +
        </div>
      )}

      {filterOpen && (
        <FilterSheet
          types={types}
          ecoMin={ecoMin}
          anlass={anlass}
          status={status}
          trekException={trekException}
          resultCount={inRange.length}
          onToggleType={toggleType}
          onSetEcoMin={setEcoMin}
          onToggleAnlass={toggleAnlass}
          onSetStatus={setStatus}
          onToggleTrekException={() => setTrekException((v) => !v)}
          onClose={() => setFilterOpen(false)}
          onReset={resetFilters}
        />
      )}

      {detail && (
        <DetailSheet
          place={detail}
          photoView={photoView}
          onSetPhotoView={setPhotoView}
          onClose={() => setDetailId(null)}
          onSetRating={(n) => setRating(detail.id, n)}
          onMarkVisited={() => markVisited(detail.id)}
          onBackToWish={() => backToWish(detail.id)}
          onRemove={() => removePlace(detail.id)}
          onEdit={() => startEdit(detail)}
        />
      )}

      {editId != null && editDraft && (
        <EditPlaceSheet
          draft={editDraft}
          onChangeField={(field, value) => setEditDraft((s) => (s ? { ...s, [field]: value } : s))}
          onToggleType={(t) => setEditDraft((s) => (s ? { ...s, types: { ...s.types, [t]: !s.types[t] } } : s))}
          onSetStrom={(v) => setEditDraft((s) => (s ? { ...s, strom: v } : s))}
          onSetEco={(v) => setEditDraft((s) => (s ? { ...s, eco: v } : s))}
          onToggleAnlass={(a) =>
            setEditDraft((s) =>
              s ? { ...s, anlass: s.anlass.includes(a) ? s.anlass.filter((x) => x !== a) : [...s.anlass, a] } : s
            )
          }
          onSetHours={(h) => setEditDraft((s) => (s ? { ...s, hours: h } : s))}
          onSetBearing={(deg) => setEditDraft((s) => (s ? { ...s, bearing: deg } : s))}
          onCancel={cancelEdit}
          onSave={confirmEdit}
        />
      )}

      {addStep === 1 && (
        <AddFlowStep1
          addLink={addLink}
          addAnalyzing={addAnalyzing}
          addError={addError}
          onChangeLink={setAddLink}
          onCancel={() => setAddStep(0)}
          onAnalyze={analyzeLink}
        />
      )}

      {addStep === 2 && ext && (
        <AddFlowStep2
          ext={ext}
          onChangeField={(field, value) => setExt((s) => (s ? { ...s, [field]: value } : s))}
          onToggleType={(t) => setExt((s) => (s ? { ...s, types: { ...s.types, [t]: !s.types[t] } } : s))}
          onSetStrom={(v) => setExt((s) => (s ? { ...s, strom: v } : s))}
          onSetEco={(v) => setExt((s) => (s ? { ...s, eco: v } : s))}
          onToggleAnlass={(a) =>
            setExt((s) => (s ? { ...s, anlass: s.anlass.includes(a) ? s.anlass.filter((x) => x !== a) : [...s.anlass, a] } : s))
          }
          onSetStatus={(v) => setExt((s) => (s ? { ...s, status: v } : s))}
          onSetRating={(n) => setExt((s) => (s ? { ...s, rating: n } : s))}
          onSetHours={(h) => setExt((s) => (s ? { ...s, hours: h } : s))}
          onBack={() => setAddStep(1)}
          onConfirm={confirmAdd}
        />
      )}

      {toast && (
        <div
          className="absolute left-1/2 bottom-6 -translate-x-1/2 rounded-full px-[18px] py-2.5 text-xs font-semibold z-20"
          style={{ background: "var(--text-hi)", color: "#161b18", boxShadow: "0 8px 20px rgba(0,0,0,.3)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
