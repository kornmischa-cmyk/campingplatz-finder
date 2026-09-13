// Approximate fallback coordinates for Freigericht-Somborn, Hesse — used only if
// HOME_LAT/HOME_LNG are not set as environment variables. For accurate driving-time
// estimates, set HOME_LAT/HOME_LNG to your exact coordinates (e.g. right-click your
// address on Google Maps to copy the exact lat/lng).
const FALLBACK_HOME_LAT = 50.1325;
const FALLBACK_HOME_LNG = 9.1436;

export const HOME_LAT = Number(process.env.HOME_LAT) || FALLBACK_HOME_LAT;
export const HOME_LNG = Number(process.env.HOME_LNG) || FALLBACK_HOME_LNG;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
