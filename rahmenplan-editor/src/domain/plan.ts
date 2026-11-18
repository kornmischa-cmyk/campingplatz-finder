// Fassungen: Plan erzeugen, vergleichen, übernehmen.
import type { Block, Day, Person, Plan, PlanBlocks, Settings, Termin } from './types';
import { DAYS } from './types';
import { EPS } from './time';
import { withAutoPause } from './pause';

/** Was die Vorlage eines Tages außer dem Profil braucht */
export interface TemplateCtx {
  settings: Settings;
  termine: Termin[];
}

/** Termine, an denen die Person an diesem Tag teilnimmt (nur wenn sie an dem Tag arbeitet) */
export function termineFor(person: Person, day: Day, termine: Termin[]): Termin[] {
  if (!person.workdays.includes(day)) return [];
  return termine.filter((t) => t.day === day && (t.teilnehmer === 'alle' || t.teilnehmer.includes(person.id)));
}

export function terminBlockId(t: Termin, day: Day): string {
  return `termin:${t.id}@${day}`;
}

/** Fügt einen Termin als zusätzlichen Block ein; überlappende Teile anderer Blöcke werden herausgeschnitten (nicht verlängert). */
export function insertTermin(blocks: Block[], t: Termin, day: Day): Block[] {
  const id = terminBlockId(t, day);
  const out: Block[] = [];
  for (const b of blocks) {
    if (b.id === id) continue;
    if (b.end <= t.start + EPS || b.start >= t.end - EPS) {
      out.push(b);
      continue;
    }
    if (t.start - b.start > EPS) out.push({ ...b, id: b.id + ':v', end: t.start });
    if (b.end - t.end > EPS) out.push({ ...b, id: b.id + ':n', start: t.end });
  }
  out.push({ id, start: t.start, end: t.end, type: t.type, verb: 'hart' });
  return sortBlocks(out);
}

/**
 * Vorlage eines Tages: Normalarbeitszeiten aus dem Profil, dazu die Termine aus dem Rahmenplan
 * als zusätzliche Blöcke, dann – falls gesetzlich nötig – eine Pause in der Mitte des Dienstes.
 */
export function templateFor(person: Person, day: Day, ctx: TemplateCtx): Block[] {
  if (!person.workdays.includes(day)) return [];
  let blocks = sortBlocks(person.normBlocks.map((b) => ({ ...b, id: `${b.id}@${day}`, unlocked: undefined })));
  for (const t of termineFor(person, day, ctx.termine)) blocks = insertTermin(blocks, t, day);
  return withAutoPause(blocks, ctx.settings, person.pauseMinuten ?? 0, `pause@${person.id}`);
}

export function sortBlocks(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
}

export function planFromProfiles(persons: Person[], since: string, ctx: TemplateCtx): Plan {
  const blocks: PlanBlocks = {};
  for (const p of persons) {
    blocks[p.id] = {};
    for (const d of DAYS) {
      const t = templateFor(p, d, ctx);
      if (t.length) blocks[p.id][d] = t;
    }
  }
  return { blocks, since };
}

export function blocksOf(plan: Plan, personId: string, day: Day): Block[] {
  return plan.blocks[personId]?.[day] ?? [];
}

export function withDayBlocks(plan: Plan, personId: string, day: Day, blocks: Block[]): Plan {
  const person = { ...(plan.blocks[personId] ?? {}) };
  if (blocks.length) person[day] = blocks;
  else delete person[day];
  return { ...plan, blocks: { ...plan.blocks, [personId]: person } };
}

export function clonePlan(plan: Plan, since: string): Plan {
  return { since, blocks: structuredClone(plan.blocks) };
}

/** Testfassung wird geltend: Entsperrungen verfallen, die Verbindlichkeit bleibt. */
export function adoptTest(test: Plan, since: string): Plan {
  const blocks: PlanBlocks = {};
  for (const [pid, days] of Object.entries(test.blocks)) {
    blocks[pid] = {};
    for (const d of DAYS) {
      const bl = days[d];
      if (bl) blocks[pid][d] = bl.map(({ unlocked: _u, ...b }) => b);
    }
  }
  return { blocks, since };
}

function sameBlock(a: Block, b: Block): boolean {
  return Math.abs(a.start - b.start) < EPS && Math.abs(a.end - b.end) < EPS && a.type === b.type;
}

/** Gleiche Blöcke (Zeiten und Art), unabhängig von IDs und Reihenfolge */
export function sameDay(a: Block[], b: Block[]): boolean {
  const x = sortBlocks(a);
  const y = sortBlocks(b);
  return x.length === y.length && x.every((bl, i) => sameBlock(bl, y[i]));
}

export interface Deviation {
  /** Plan weicht von der Normalzeit aus dem Profil ab */
  deviates: boolean;
  /** Harte Blöcke aus dem Profil, die im Plan nicht (mehr) unverändert vorkommen */
  hardChanged: Block[];
  /** Abweichung auch abgesehen von fehlenden Termin-Blöcken */
  deviatesBeyondTermine: boolean;
}

export function deviation(person: Person, planned: Block[], day: Day, ctx: TemplateCtx): Deviation {
  const tpl = templateFor(person, day, ctx);
  const pl = sortBlocks(planned);
  const deviates = tpl.length !== pl.length || tpl.some((b, i) => !sameBlock(b, pl[i]));
  const hardChanged = tpl.filter((b) => b.verb === 'hart' && !pl.some((p) => sameBlock(b, p)));
  // Ohne die (fehlenden) Termine: entspricht der Plan der Vorlage ohne diese Termine?
  const missingTermine = hardChanged.filter((b) => b.id.startsWith('termin:'));
  let deviatesBeyondTermine = deviates;
  if (deviates && missingTermine.length) {
    const ohne = templateFor(person, day, { ...ctx, termine: ctx.termine.filter((t) => !missingTermine.some((b) => b.id === `termin:${t.id}@${day}`)) });
    deviatesBeyondTermine = !sameDay(ohne, pl);
  }
  return { deviates, hardChanged, deviatesBeyondTermine };
}

/** Plausibilitätsprüfung der Normalzeiten im Profil. */
export function blockListIssues(blocks: Block[], open: number, close: number): string[] {
  const out: string[] = [];
  const sorted = sortBlocks(blocks);
  sorted.forEach((b, i) => {
    if (b.end <= b.start + EPS) out.push(`Block ${i + 1}: Ende liegt nicht nach dem Beginn.`);
    if (b.start < open - EPS || b.end > close + EPS) out.push(`Block ${i + 1}: liegt außerhalb der Öffnungszeit.`);
    const next = sorted[i + 1];
    if (next && next.start < b.end - EPS) out.push(`Block ${i + 1} und ${i + 2} überlappen sich.`);
  });
  return out;
}

export interface ProfileChanges {
  /** Tage, an denen sich die Vorlage durch die Profiländerung ändert */
  changed: Day[];
  /** davon Tage, die im Plan von Hand angepasst wurden (Plan ≠ alte Vorlage) */
  manual: Day[];
}

/** Welche Tage einer Fassung betrifft eine Profiländerung? (oldP = null bei neuer Person) */
export function profileChanges(oldP: Person | null, newP: Person, plan: Plan, ctx: TemplateCtx): ProfileChanges {
  const changed: Day[] = [];
  const manual: Day[] = [];
  for (const d of DAYS) {
    const before = oldP ? templateFor(oldP, d, ctx) : [];
    const after = templateFor(newP, d, ctx);
    const cur = blocksOf(plan, newP.id, d);
    if (sameDay(before, after) || sameDay(cur, after)) continue;
    changed.push(d);
    if (!sameDay(cur, before)) manual.push(d);
  }
  return { changed, manual };
}

/** Überträgt eine Profiländerung in eine Fassung; von Hand angepasste Tage nur mit overwriteManual. */
export function applyProfileToPlan(plan: Plan, oldP: Person | null, newP: Person, ctx: TemplateCtx, overwriteManual: boolean, newId: () => string): Plan {
  const { changed, manual } = profileChanges(oldP, newP, plan, ctx);
  let out = plan;
  for (const d of changed) {
    if (manual.includes(d) && !overwriteManual) continue;
    out = withDayBlocks(out, newP.id, d, templateFor(newP, d, ctx).map((b) => ({ ...b, id: newId() })));
  }
  return out;
}

/** Früheste/späteste wählbare Uhrzeit für Termine (auch außerhalb der Öffnungszeit, z. B. Abendbesprechung) */
export const TERMIN_MIN = 6;
export const TERMIN_MAX = 22;

/**
 * Sichtbarer Zeitraum eines Tages: die Öffnungszeit, erweitert auf volle Stunden,
 * wenn Blöcke oder Termine davor oder danach liegen.
 */
export function viewRange(open: number, close: number, plan: Plan, day: Day, termine: Termin[]): { v0: number; v1: number } {
  let lo = open;
  let hi = close;
  for (const days of Object.values(plan.blocks)) {
    for (const b of days[day] ?? []) {
      lo = Math.min(lo, b.start);
      hi = Math.max(hi, b.end);
    }
  }
  for (const t of termine) {
    if (t.day !== day) continue;
    lo = Math.min(lo, t.start);
    hi = Math.max(hi, t.end);
  }
  return { v0: lo < open - EPS ? Math.floor(lo + EPS) : open, v1: hi > close + EPS ? Math.ceil(hi - EPS) : close };
}
