import { Place } from "./types";

const PLACES_KEY = "camping-finder:places:v1";

export function loadPlaces(): Place[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PLACES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as Place[];
  } catch {
    return null;
  }
}

export function savePlaces(places: Place[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLACES_KEY, JSON.stringify(places));
  } catch {
    // storage full or unavailable — silently skip, in-memory state still works
  }
}
