// Konkrete Kalenderwoche: geltender Rahmenplan + Abwesenheiten mit Datum.
// Datumswerte sind ISO-Strings „JJJJ-MM-TT“ und werden in lokaler Zeit gerechnet (keine Zeitzonenfehler um Mitternacht).
import type { Abwesenheit, Block, Day, Plan } from './types';
import { DAYS } from './types';
import { EPS } from './time';
import { sortBlocks } from './plan';

const pad = (n: number) => String(n).padStart(2, '0');

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12); // Mittag: robust gegen Sommerzeitwechsel
}

export function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** Montag der Woche, in der das Datum liegt */
export function mondayOf(iso: string): string {
  const d = parseIso(iso);
  const wd = (d.getDay() + 6) % 7; // Mo = 0
  return addDays(iso, -wd);
}

/** ISO-Kalenderwoche */
export function kalenderwoche(iso: string): number {
  const d = parseIso(iso);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const wd = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - wd);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}

/** Datum je Wochentag (Mo–Fr) für die Woche ab Montag */
export function weekDates(monday: string): Record<Day, string> {
  const out = {} as Record<Day, string>;
  DAYS.forEach((d, i) => (out[d] = addDays(monday, i)));
  return out;
}

/** „24.11.“ */
export function fmtTag(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

/** „24.11.2026“ */
export function fmtDatum(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function istGanztaegig(a: Abwesenheit): boolean {
  return a.start === undefined || a.end === undefined || a.von !== a.bis;
}

/** Abwesenheiten einer Person an einem Datum */
export function abwesenheitenAm(personId: string, iso: string, list: Abwesenheit[]): Abwesenheit[] {
  return list.filter((a) => a.personId === personId && a.von <= iso && iso <= a.bis);
}

/** Schneidet Abwesenheiten aus den Blöcken eines Tages heraus (ganztägig → keine Blöcke) */
export function applyAbwesenheit(blocks: Block[], abw: Abwesenheit[]): Block[] {
  if (!abw.length) return blocks;
  if (abw.some(istGanztaegig)) return [];
  let out = blocks;
  for (const a of abw) {
    const s = a.start!;
    const e = a.end!;
    const next: Block[] = [];
    for (const b of out) {
      if (b.end <= s + EPS || b.start >= e - EPS) {
        next.push(b);
        continue;
      }
      if (s - b.start > EPS) next.push({ ...b, id: `${b.id}:vor-${a.id}`, end: s });
      if (b.end - e > EPS) next.push({ ...b, id: `${b.id}:nach-${a.id}`, start: e });
    }
    out = next;
  }
  // Pausen ohne Arbeit davor und danach sind sinnlos
  out = out.filter((b, _i, arr) => b.type !== 'pause' || (arr.some((x) => x.type !== 'pause' && x.end <= b.start + EPS) && arr.some((x) => x.type !== 'pause' && x.start >= b.end - EPS)));
  return sortBlocks(out);
}

/** Plan für eine konkrete Woche: geltender Rahmenplan minus Abwesenheiten */
export function wochenPlan(plan: Plan, monday: string, list: Abwesenheit[]): Plan {
  const dates = weekDates(monday);
  const blocks: Plan['blocks'] = {};
  for (const [pid, days] of Object.entries(plan.blocks)) {
    blocks[pid] = {};
    for (const d of DAYS) {
      const bl = days[d];
      if (!bl) continue;
      const res = applyAbwesenheit(bl, abwesenheitenAm(pid, dates[d], list));
      if (res.length) blocks[pid][d] = res;
    }
  }
  return { since: plan.since, blocks };
}

/** Prüft eine Abwesenheit vor dem Speichern */
export function abwesenheitFehler(a: Abwesenheit): string[] {
  const out: string[] = [];
  if (!a.personId) out.push('Bitte eine Person auswählen.');
  if (!a.von || !a.bis) out.push('Bitte Beginn und Ende angeben.');
  else if (a.bis < a.von) out.push('Das Ende liegt vor dem Beginn.');
  if (a.start !== undefined && a.end !== undefined) {
    if (a.von !== a.bis) out.push('Uhrzeiten gehen nur bei einem einzelnen Tag.');
    if (a.end <= a.start) out.push('Die Uhrzeit „bis“ muss nach „von“ liegen.');
  }
  return out;
}
