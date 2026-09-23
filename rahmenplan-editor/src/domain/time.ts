export const STEP = 0.25;
export const EPS = 1e-9;

/** 7.25 → "07:15" */
export function fmt(h: number): string {
  const total = Math.round(h * 60);
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}

/** 8 → "8", 9.5 → "9:30" */
export function fmtShort(h: number): string {
  const total = Math.round(h * 60);
  const m = total % 60;
  return Math.floor(total / 60) + (m ? ':' + String(m).padStart(2, '0') : '');
}

/** 1.75 → "1:45" */
export function fmtDuration(h: number): string {
  const total = Math.round(h * 60);
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

/** 7.5 → "7,50" (Standard: 2 Nachkommastellen) */
export function fmtDecimal(h: number, digits = 2): string {
  return h.toFixed(digits).replace('.', ',');
}

export function minutes(h: number): number {
  return Math.round(h * 60);
}

export function snap(h: number): number {
  return Math.round(h / STEP) * STEP;
}

/** "07:15" → 7.25; null bei ungültiger Eingabe */
export function parseTime(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h + min / 60;
}

let counter = 0;
export function uid(prefix = 'b'): string {
  counter += 1;
  return prefix + '_' + Date.now().toString(36) + '_' + counter.toString(36) + Math.random().toString(36).slice(2, 6);
}
