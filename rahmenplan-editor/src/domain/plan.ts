// Fassungen: Plan erzeugen, vergleichen, übernehmen.
import type { Block, Day, Person, Plan, PlanBlocks } from './types';
import { DAYS } from './types';
import { EPS } from './time';

/** Normalzeiten einer Person für einen Tag (Vorlage aus dem Profil). */
export function templateFor(person: Person, day: Day): Block[] {
  if (!person.workdays.includes(day)) return [];
  const src = day === 'Di' && person.tueBlocks ? person.tueBlocks : person.normBlocks;
  return sortBlocks(src.map((b) => ({ ...b, id: `${b.id}@${day}`, unlocked: undefined })));
}

export function sortBlocks(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
}

export function planFromProfiles(persons: Person[], since: string): Plan {
  const blocks: PlanBlocks = {};
  for (const p of persons) {
    blocks[p.id] = {};
    for (const d of DAYS) {
      const t = templateFor(p, d);
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

export interface Deviation {
  /** Plan weicht von der Normalzeit aus dem Profil ab */
  deviates: boolean;
  /** Harte Blöcke aus dem Profil, die im Plan nicht (mehr) unverändert vorkommen */
  hardChanged: Block[];
}

export function deviation(person: Person, planned: Block[], day: Day): Deviation {
  const tpl = templateFor(person, day);
  const pl = sortBlocks(planned);
  const deviates = tpl.length !== pl.length || tpl.some((b, i) => !sameBlock(b, pl[i]));
  const hardChanged = tpl.filter((b) => b.verb === 'hart' && !pl.some((p) => sameBlock(b, p)));
  return { deviates, hardChanged };
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
