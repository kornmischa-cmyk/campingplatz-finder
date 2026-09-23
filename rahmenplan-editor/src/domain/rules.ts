// Regel-Engine: rein funktional, pro Tag und Fassung.
// ⚠️ Die Regeln sind beispielhaft und über Settings konfigurierbar – fachlich validieren!
import type { Block, Day, Person, Plan, Settings } from './types';
import { STEP, EPS, fmt, fmtDecimal, minutes } from './time';
import { blocksOf, deviation } from './plan';

export interface Slot {
  h: number;
  /** Personen in Betreuung */
  tot: number;
  /** davon Fachkräfte */
  fk: number;
}

export type FindingKind = 'v' | 'h' | 'ok';

export interface Finding {
  kind: FindingKind;
  title: string;
  desc: string;
  personId?: string;
  /** Plan dieser Person/dieses Tags kann aus den Normalzeiten neu erzeugt werden */
  canResetFromProfile?: boolean;
}

export interface Span {
  start: number;
  end: number;
}

export function workHours(blocks: Block[]): number {
  return blocks.filter((b) => b.type !== 'pause').reduce((a, b) => a + (b.end - b.start), 0);
}

export function pauseHours(blocks: Block[]): number {
  return blocks.filter((b) => b.type === 'pause').reduce((a, b) => a + (b.end - b.start), 0);
}

/** Geforderte Pause (h) nach Pausenstaffel */
export function requiredPause(az: number, settings: Settings): number {
  let req = 0;
  for (const s of settings.pausen) if (az > s.abStunden + EPS) req = Math.max(req, s.minuten / 60);
  return req;
}

/** Längste zusammenhängende Arbeitsstrecke ohne Pausenblock (Lücken zählen als Unterbrechung) */
export function longestStretch(blocks: Block[]): number {
  const bs = [...blocks].sort((a, b) => a.start - b.start);
  let max = 0;
  let st: number | null = null;
  let prev = 0;
  for (const b of bs) {
    const gap = st !== null && b.start > prev + EPS;
    if (b.type === 'pause' || gap) {
      if (st !== null) max = Math.max(max, prev - st);
      st = null;
    }
    if (b.type !== 'pause') {
      if (st === null) st = b.start;
      prev = b.end;
    }
  }
  if (st !== null) max = Math.max(max, prev - st);
  return max;
}

export function computeSlots(persons: Person[], plan: Plan, day: Day, settings: Settings): Slot[] {
  const out: Slot[] = [];
  for (let h = settings.open; h < settings.close - EPS; h += STEP) {
    let tot = 0;
    let fk = 0;
    for (const p of persons) {
      const inCare = blocksOf(plan, p.id, day).some((b) => b.type === 'betreuung' && h >= b.start - EPS && h < b.end - EPS);
      if (inCare) {
        tot++;
        if (p.fk) fk++;
      }
    }
    out.push({ h, tot, fk });
  }
  return out;
}

export function spans(slots: Slot[], pred: (s: Slot) => boolean, close: number): Span[] {
  const out: Span[] = [];
  let st: number | null = null;
  for (const s of slots) {
    if (pred(s)) {
      if (st === null) st = s.h;
    } else if (st !== null) {
      out.push({ start: st, end: s.h });
      st = null;
    }
  }
  if (st !== null) out.push({ start: st, end: close });
  return out;
}

export function fkShort(s: Slot, settings: Settings): boolean {
  return s.fk < settings.minFachkraefte;
}

/** Mindestpersonen im Slot, falls eine Randzeit greift; sonst 0 */
export function randzeitMin(h: number, settings: Settings): number {
  let m = 0;
  for (const r of settings.randzeiten) if (h >= r.start - EPS && h < r.end - EPS) m = Math.max(m, r.minPersonen);
  return m;
}

export function totShort(s: Slot, settings: Settings): boolean {
  return s.tot < randzeitMin(s.h, settings);
}

export interface DayResult {
  slots: Slot[];
  findings: Finding[];
  violationSpans: (Span & { label: string })[];
  counts: { v: number; h: number };
}

export function evaluateDay(persons: Person[], plan: Plan, day: Day, settings: Settings): DayResult {
  const slots = computeSlots(persons, plan, day, settings);
  const L: Finding[] = [];

  const fkSpans = spans(slots, (s) => fkShort(s, settings), settings.close);
  const totSpans = spans(slots, (s) => totShort(s, settings), settings.close);
  const fkWord = settings.minFachkraefte === 1 ? 'Keine Fachkraft im Haus' : `Weniger als ${settings.minFachkraefte} Fachkräfte`;

  for (const x of fkSpans) {
    L.push({
      kind: 'v',
      title: `${fkWord} · ${fmt(x.start)}–${fmt(x.end)}`,
      desc:
        settings.minFachkraefte === 1
          ? 'Über die gesamte Öffnungszeit muss mindestens eine Fachkraft in der Betreuung sein.'
          : `Über die gesamte Öffnungszeit müssen mindestens ${settings.minFachkraefte} Fachkräfte in der Betreuung sein.`,
    });
  }
  for (const x of totSpans) {
    const need = randzeitMin(x.start, settings);
    L.push({
      kind: 'v',
      title: `Weniger als ${need} Personen · ${fmt(x.start)}–${fmt(x.end)}`,
      desc: `Früh- und Spätdienst (zusammengelegte Gruppen) verlangen mindestens ${need} Personen in der Betreuung.`,
    });
  }

  let teilnehmende = 0;
  let anwesend = 0;
  for (const p of persons) {
    const bl = blocksOf(plan, p.id, day);
    const dev = deviation(p, bl, day);

    if (bl.length) {
      anwesend++;
      const az = workHours(bl);
      const pz = pauseHours(bl);
      const req = requiredPause(az, settings);
      if (pz + EPS < req) {
        L.push({
          kind: 'v',
          personId: p.id,
          title: `${p.name}: Pflichtpause fehlt · ${minutes(pz)} statt ${minutes(req)} Minuten`,
          desc: `Bei ${fmtDecimal(az)} h Arbeitszeit sind ${minutes(req)} Minuten Pause vorgeschrieben.`,
        });
      }
      const st = longestStretch(bl);
      if (st > settings.maxAmStueck + EPS) {
        L.push({
          kind: 'v',
          personId: p.id,
          title: `${p.name}: ${fmtDecimal(st)} h ohne Unterbrechung`,
          desc: `Länger als ${fmtDecimal(settings.maxAmStueck, settings.maxAmStueck % 1 ? 2 : 0)} Stunden am Stück ohne Ruhepause ist unzulässig, unabhängig davon, ob die Pflichtpause an anderer Stelle liegt.`,
        });
      }
      if (az > settings.hinweisArbeitszeit + EPS) {
        L.push({
          kind: 'h',
          personId: p.id,
          title: `${p.name}: ${fmtDecimal(az)} h Arbeitszeit`,
          desc: `Über ${fmtDecimal(settings.hinweisArbeitszeit, settings.hinweisArbeitszeit % 1 ? 2 : 0)} Stunden, nach §3 ArbZG nur mit Ausgleich innerhalb des Ausgleichszeitraums zulässig.`,
        });
      }
      if (bl.some((b) => b.type === 'besprechung')) teilnehmende++;
    }

    for (const hb of dev.hardChanged) {
      L.push({
        kind: 'h',
        personId: p.id,
        canResetFromProfile: true,
        title: `${p.name}: harte Zeit verändert · ${fmt(hb.start)}–${fmt(hb.end)}`,
        desc: 'Dieser Block ist im Profil als unverrückbar hinterlegt. Die Abweichung vor der Übernahme mit der Person klären.',
      });
    }
    if (dev.deviates && !dev.hardChanged.length) {
      L.push({
        kind: 'h',
        personId: p.id,
        canResetFromProfile: true,
        title: `${p.name}: Plan weicht von der Normalarbeitszeit ab`,
        desc: bl.length
          ? 'Die Zeiten im Plan entsprechen nicht den Normalarbeitszeiten aus dem Personalprofil.'
          : 'Laut Profil ist heute ein Arbeitstag, im Plan ist die Person nicht eingeplant.',
      });
    }
  }

  if (settings.besprechungsTag === day && anwesend > 0) {
    L.push({
      kind: 'h',
      title: `Dienstbesprechung: ${teilnehmende} von ${anwesend} anwesenden Personen nehmen teil`,
      desc: 'Nachmittags sind bereits viele Teilzeitkräfte gegangen.',
    });
  }

  const counts = { v: L.filter((f) => f.kind === 'v').length, h: L.filter((f) => f.kind === 'h').length };
  if (!L.length) L.push({ kind: 'ok', title: 'Keine Verstöße', desc: 'Alle hinterlegten Regeln sind für diesen Tag erfüllt.' });

  const violationSpans = [
    ...fkSpans.map((s) => ({ ...s, label: fkWord })),
    ...totSpans.map((s) => ({ ...s, label: `Weniger als ${randzeitMin(s.start, settings)} Personen` })),
  ];
  return { slots, findings: L, violationSpans, counts };
}

export interface WeekRow {
  person: Person;
  cells: ({ start: number; end: number; hours: number } | null)[];
  ist: number;
}

export function weekTable(persons: Person[], plan: Plan): WeekRow[] {
  return persons.map((p) => {
    let ist = 0;
    const cells = (['Mo', 'Di', 'Mi', 'Do', 'Fr'] as Day[]).map((d) => {
      const bl = blocksOf(plan, p.id, d);
      if (!bl.length) return null;
      const hours = workHours(bl);
      ist += hours;
      return { start: Math.min(...bl.map((b) => b.start)), end: Math.max(...bl.map((b) => b.end)), hours };
    });
    return { person: p, cells, ist };
  });
}
