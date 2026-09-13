import { HOME_LAT, HOME_LNG, bearingDeg } from "./geo";

export interface DriveEstimate {
  hours: number;
  bearing: number;
  lat: number;
  lng: number;
}

/**
 * Geocodes `query` via the Places API (New) and computes the real driving
 * duration from HOME via the Routes API — not a straight-line estimate.
 * Returns null (never throws) if geocoding or routing fails, so callers can
 * fall back to a manual/default value instead of failing the whole request.
 */
export async function estimateDrive(apiKey: string, query: string): Promise<DriveEstimate | null> {
  try {
    const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.location",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "de" }),
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const loc = searchData.places?.[0]?.location;
    if (!loc || typeof loc.latitude !== "number" || typeof loc.longitude !== "number") return null;

    const routeRes = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: HOME_LAT, longitude: HOME_LNG } } },
        destination: { location: { latLng: { latitude: loc.latitude, longitude: loc.longitude } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
    });
    if (!routeRes.ok) return null;
    const routeData = await routeRes.json();
    const durationStr: string | undefined = routeData.routes?.[0]?.duration;
    if (!durationStr) return null;

    const seconds = parseInt(durationStr.replace("s", ""), 10);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;

    const hoursRaw = seconds / 3600;
    const hours = Math.max(0.25, Math.round(hoursRaw * 4) / 4);
    const bearing = bearingDeg(HOME_LAT, HOME_LNG, loc.latitude, loc.longitude);

    return { hours, bearing, lat: loc.latitude, lng: loc.longitude };
  } catch {
    return null;
  }
}
