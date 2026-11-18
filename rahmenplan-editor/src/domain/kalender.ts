// Feiertage (Hessen) und Schließzeiten: an diesen Tagen ist die Kita zu.
import type { Settings } from './types';
import { addDays, isoDate } from './abwesenheit';

/** Ostersonntag nach der Gaußschen Osterformel (Gregorianischer Kalender) */
export function ostersonntag(jahr: number): string {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDate(new Date(jahr, monat - 1, tag, 12));
}

/** Gesetzliche Feiertage in Hessen: Datum → Name */
export function feiertageHessen(jahr: number): Map<string, string> {
  const o = ostersonntag(jahr);
  const f = (md: string) => `${jahr}-${md}`;
  return new Map([
    [f('01-01'), 'Neujahr'],
    [addDays(o, -2), 'Karfreitag'],
    [addDays(o, 1), 'Ostermontag'],
    [f('05-01'), 'Tag der Arbeit'],
    [addDays(o, 39), 'Christi Himmelfahrt'],
    [addDays(o, 50), 'Pfingstmontag'],
    [addDays(o, 60), 'Fronleichnam'],
    [f('10-03'), 'Tag der Deutschen Einheit'],
    [f('12-25'), '1. Weihnachtstag'],
    [f('12-26'), '2. Weihnachtstag'],
  ]);
}

export interface Geschlossen {
  art: 'feiertag' | 'schliesszeit';
  name: string;
}

/** Ist die Kita an diesem Datum geschlossen? (Feiertag vor Schließzeit) */
export function geschlossenAm(iso: string, settings: Settings): Geschlossen | null {
  if (settings.feiertage === 'HE') {
    const name = feiertageHessen(Number(iso.slice(0, 4))).get(iso);
    if (name) return { art: 'feiertag', name };
  }
  const z = (settings.schliesszeiten ?? []).find((x) => x.von <= iso && iso <= x.bis);
  return z ? { art: 'schliesszeit', name: z.name || 'Schließzeit' } : null;
}

/** Feiertage ab einem Datum (für die Übersicht in den Einstellungen) */
export function naechsteFeiertage(abIso: string, anzahl = 10): { datum: string; name: string }[] {
  const jahr = Number(abIso.slice(0, 4));
  const out: { datum: string; name: string }[] = [];
  for (const j of [jahr, jahr + 1]) for (const [datum, name] of feiertageHessen(j)) if (datum >= abIso) out.push({ datum, name });
  return out.sort((a, b) => a.datum.localeCompare(b.datum)).slice(0, anzahl);
}
