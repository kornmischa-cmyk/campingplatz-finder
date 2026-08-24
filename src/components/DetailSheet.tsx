"use client";

import { useEffect, useState } from "react";
import { Place } from "@/lib/types";
import { fmtH } from "@/lib/places";
import { RowButton } from "./Chip";

const TYPE_LABELS: Record<string, string> = { zelt: "Zelt", wowa: "Wowa", haus: "Haus", trek: "Trekking" };

interface PlacePhotosResponse {
  photoUrls: string[];
  mapsUrl: string | null;
  source: "places-api" | "unavailable";
}

function usePlacePhotos(place: Place) {
  const [state, setState] = useState<{ id: number; data: PlacePhotosResponse | null }>({
    id: place.id,
    data: null,
  });

  useEffect(() => {
    let cancelled = false;
    const query = `${place.name} ${place.region}`;
    fetch(`/api/place-photos?query=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setState({ id: place.id, data: json });
      })
      .catch(() => {
        if (!cancelled) setState({ id: place.id, data: { photoUrls: [], mapsUrl: null, source: "unavailable" } });
      });
    return () => {
      cancelled = true;
    };
  }, [place.id, place.name, place.region]);

  const loading = state.id !== place.id || state.data === null;
  const data = state.id === place.id ? state.data : null;
  return { data, loading };
}

function PhotoSlot({ url, placeholder }: { url?: string; placeholder: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover rounded-[10px]" />
    );
  }
  return (
    <div
      className="absolute inset-0 rounded-[10px] flex items-center justify-center text-center text-[10px] p-2"
      style={{ border: "1px dashed var(--border)", color: "#546058" }}
    >
      {placeholder}
    </div>
  );
}

export function DetailSheet({
  place,
  photoView,
  onSetPhotoView,
  onClose,
  onSetRating,
  onMarkVisited,
  onBackToWish,
  onRemove,
  onEdit,
}: {
  place: Place;
  photoView: "fotos" | "maps";
  onSetPhotoView: (v: "fotos" | "maps") => void;
  onClose: () => void;
  onSetRating: (n: number) => void;
  onMarkVisited: () => void;
  onBackToWish: () => void;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const { data: photos, loading } = usePlacePhotos(place);
  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name + " " + place.region)}`;

  const stromMap: Record<string, { label: string; style: React.CSSProperties }> = {
    ja: { label: "Strom ✓", style: { color: "var(--accent-green)", borderColor: "var(--accent-green)" } },
    nein: {
      label: place.stromException ? "Strom-Ausnahme" : "kein Strom",
      style: { color: "var(--danger)", borderColor: "var(--danger)" },
    },
    unklar: { label: "❓ prüfen", style: { color: "var(--text-dim)" } },
  };
  const strom = stromMap[place.strom];

  return (
    <div className="absolute inset-0 z-5 flex flex-col" style={{ background: "var(--bg-app)" }}>
      <div className="px-5 py-4 flex justify-between items-start border-b" style={{ borderColor: "var(--border)" }}>
        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            {place.status === "besucht" ? "★ BESUCHT" : "✎ WUNSCH"}
          </div>
          <div className="font-bold text-base mt-[3px]">{place.name}</div>
          <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            {place.region}
          </div>
        </div>
        <div
          onClick={onClose}
          className="w-[26px] h-[26px] rounded-full flex items-center justify-center cursor-pointer text-[11px]"
          style={{ border: "1px solid var(--border)" }}
        >
          ✕
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">
        <div>
          <div className="flex gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => onSetPhotoView("fotos")}
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs border cursor-pointer"
              style={photoView === "fotos" ? { borderColor: "var(--accent)", color: "var(--accent)" } : { borderColor: "var(--border)", color: "var(--text-dim)" }}
            >
              Fotos
            </button>
            <button
              type="button"
              onClick={() => onSetPhotoView("maps")}
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs border cursor-pointer"
              style={photoView === "maps" ? { borderColor: "var(--accent)", color: "var(--accent)" } : { borderColor: "var(--border)", color: "var(--text-dim)" }}
            >
              Google Maps
            </button>
          </div>

          {photoView === "fotos" && (
            <>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "1.4fr 1fr", gridTemplateRows: "1fr 1fr", height: 150 }}>
                <div className="relative min-w-0 min-h-0" style={{ gridRow: "1/3" }}>
                  <PhotoSlot url={photos?.photoUrls[0]} placeholder={loading ? "Lade Foto …" : "Kein Foto gefunden"} />
                </div>
                <div className="relative min-w-0 min-h-0">
                  <PhotoSlot url={photos?.photoUrls[1]} placeholder={loading ? "Lade Foto …" : "Kein Foto gefunden"} />
                </div>
                <div className="relative min-w-0 min-h-0">
                  <PhotoSlot url={photos?.photoUrls[2]} placeholder={loading ? "Lade Foto …" : "Kein Foto gefunden"} />
                </div>
              </div>
              <a href={googleImagesUrl} target="_blank" rel="noreferrer" className="block mt-1.5 text-[10px]" style={{ textDecoration: "none" }}>
                Weitere Bilder bei Google ansehen ↗
              </a>
              {photos?.source === "unavailable" && !loading && (
                <div className="text-[9px] mt-1" style={{ color: "#4a564f" }}>
                  Places-API nicht konfiguriert — GOOGLE_PLACES_API_KEY setzen, um echte Fotos zu laden.
                </div>
              )}
            </>
          )}

          {photoView === "maps" && (
            <>
              <div className="relative" style={{ height: 150 }}>
                <PhotoSlot url={photos?.mapsUrl ? undefined : undefined} placeholder={loading ? "Lade …" : "Kein Google-Maps-Bild verfügbar"} />
              </div>
              {photos?.mapsUrl && (
                <a href={photos.mapsUrl} target="_blank" rel="noreferrer" className="block mt-1.5 text-[10px]" style={{ textDecoration: "none" }}>
                  Auf Google Maps ansehen ↗
                </a>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "var(--bg-card)", color: "var(--accent)" }}>
            {fmtH(place.hours)}h{place.hours >= 1.5 ? " ⚠︎" : ""}
          </div>
          <div className="inline-flex items-center rounded-full px-3 py-1.5 text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
            {place.types.map((t) => TYPE_LABELS[t]).join(" · ")}
          </div>
          <div className="inline-flex items-center rounded-full px-3 py-1.5 text-xs border" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
            {"◐".repeat(place.eco)}
          </div>
          <div className="inline-flex items-center rounded-full px-3 py-1.5 text-xs border" style={strom.style}>
            {strom.label}
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {place.anlass.map((a) => (
            <div key={a} className="rounded-full px-2.5 py-1 text-[10px]" style={{ background: "var(--petrol-bg)", color: "var(--petrol-text)" }}>
              {a}
            </div>
          ))}
        </div>

        {place.status === "besucht" && (
          <div>
            <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
              BEWERTUNG
            </div>
            <div className="flex gap-1 mt-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  onClick={() => onSetRating(n)}
                  className="text-[22px] cursor-pointer"
                  style={{ color: "var(--accent)" }}
                >
                  {n <= (place.rating || 0) ? "★" : "☆"}
                </div>
              ))}
            </div>
          </div>
        )}
        {place.status === "wunsch" && (
          <RowButton variant="outline-accent" onClick={onMarkVisited}>
            Als besucht markieren →
          </RowButton>
        )}

        {place.note && (
          <div className="text-xs leading-[1.5]" style={{ color: "#c7cabd" }}>
            {place.note}
          </div>
        )}

        <div className="flex gap-4">
          <div>
            <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
              PREIS
            </div>
            <div className="text-xs mt-[3px]">{place.price}</div>
          </div>
          <div>
            <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
              SAISON
            </div>
            <div className="text-xs mt-[3px]">{place.season}</div>
          </div>
        </div>

        <div>
          <div className="text-[9px] tracking-[1px]" style={{ color: "var(--text-dim)" }}>
            AUSSTATTUNG
          </div>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {place.amenities.map((am) => (
              <div key={am} className="rounded-full px-2.5 py-1 text-[10px]" style={{ background: "var(--bg-card)", color: "#c7cabd" }}>
                {am}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
        <RowButton variant="solid" href={place.link}>
          Zur Website ↗
        </RowButton>
        <RowButton variant="outline" onClick={onEdit}>
          Bearbeiten
        </RowButton>
        {place.status === "besucht" && (
          <RowButton variant="outline" onClick={onBackToWish}>
            Als Wunsch zurückstufen
          </RowButton>
        )}
        <RowButton variant="danger" onClick={onRemove}>
          Platz entfernen
        </RowButton>
      </div>
    </div>
  );
}
