// Anzeige von Wochenstunden in Stunden:Minuten (so wird in der Kita gerechnet).
import { fmtDuration } from './time';

/** 31.25 → "31:15", 32 → "32" */
export function fmtHours(h: number): string {
  return Math.abs(h - Math.round(h)) < 0.005 ? String(Math.round(h)) : fmtDuration(h);
}

export type SollTone = 'ok' | 'under' | 'over';

/** Abgleich Ist/Soll: Ton, kurzer Chip-Text und ausgeschriebene Fassung für Screenreader/Tooltip */
export function fmtSollDiff(ist: number, soll: number): { tone: SollTone; chip: string; spoken: string } {
  const diff = ist - soll;
  if (Math.abs(diff) < 0.01) return { tone: 'ok', chip: '✓', spoken: 'Soll erreicht' };
  const d = fmtDuration(Math.abs(diff));
  return diff > 0
    ? { tone: 'over', chip: `+${d}`, spoken: `${d} Stunden über Soll` }
    : { tone: 'under', chip: `noch ${d}`, spoken: `noch ${d} Stunden offen` };
}
