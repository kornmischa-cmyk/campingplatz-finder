// Früh- und Spätdienst: wer ist wann in der Randzeit in der Betreuung, und passt das zu den Vorgaben der Person?
import type { Block, Day, DienstArt, DienstVorgabe, Person, Plan, Settings } from './types';
import { DAYS } from './types';
import { blocksOf } from './plan';
import type { Finding } from './rules';

export const DIENST_LABEL: Record<DienstArt, string> = { frueh: 'Frühdienst', spaet: 'Spätdienst' };

export function defaultVorgabe(): DienstVorgabe {
  return { min: 0, max: null, days: [...DAYS] };
}

export function vorgabenOf(p: Person): Record<DienstArt, DienstVorgabe> {
  return p.dienste ?? { frueh: defaultVorgabe(), spaet: defaultVorgabe() };
}

/** Randzeiten in der ersten Tageshälfte = Frühdienst, in der zweiten = Spätdienst */
export function randzeitenOf(settings: Settings, art: DienstArt) {
  const mid = (settings.open + settings.close) / 2;
  return settings.randzeiten.filter((r) => ((r.start + r.end) / 2 < mid) === (art === 'frueh'));
}

export function hatDienst(blocks: Block[], settings: Settings, art: DienstArt): boolean {
  const rz = randzeitenOf(settings, art);
  return blocks.some((b) => b.type === 'betreuung' && rz.some((r) => b.start < r.end && b.end > r.start));
}

export function dienstTage(person: Person, plan: Plan, settings: Settings, art: DienstArt): Day[] {
  return DAYS.filter((d) => hatDienst(blocksOf(plan, person.id, d), settings, art));
}

export function hatVorgabe(v: DienstVorgabe): boolean {
  return v.min > 0 || v.max !== null || v.days.length < DAYS.length;
}

/** Kurztext, z. B. „1–2× · nur Mo, Mi“ oder „nie“ */
export function vorgabeText(v: DienstVorgabe): string {
  if (v.max === 0 || v.days.length === 0) return 'nie';
  let n = '';
  if (v.min > 0 && v.max !== null) n = v.min === v.max ? `${v.min}×` : `${v.min}–${v.max}×`;
  else if (v.min > 0) n = `mind. ${v.min}×`;
  else if (v.max !== null) n = `höchstens ${v.max}×`;
  const t = v.days.length < DAYS.length ? `nur ${v.days.join(', ')}` : '';
  return [n, t].filter(Boolean).join(' · ') || 'keine Vorgabe';
}

/** Widersprüche in den Vorgaben (verhindern das Speichern) */
export function vorgabeIssues(v: DienstVorgabe, art: DienstArt): string[] {
  const out: string[] = [];
  if (v.max !== null && v.min > v.max) out.push(`${DIENST_LABEL[art]}: „mindestens“ ist größer als „höchstens“.`);
  if (v.min > v.days.length) out.push(`${DIENST_LABEL[art]}: mindestens ${v.min}×, aber nur an ${v.days.length} Tag(en) möglich.`);
  return out;
}

/** Tagesprüfung: Dienst an einem Tag, an dem er für die Person nicht vorgesehen ist (Verstoß) */
export function dienstTagFindings(person: Person, blocks: Block[], day: Day, settings: Settings): Finding[] {
  const out: Finding[] = [];
  const vs = vorgabenOf(person);
  for (const art of ['frueh', 'spaet'] as DienstArt[]) {
    const v = vs[art];
    if (!hatDienst(blocks, settings, art)) continue;
    if (v.max === 0) {
      out.push({ kind: 'v', personId: person.id, title: `${person.name}: ${DIENST_LABEL[art]}, obwohl nicht erlaubt`, desc: `Laut Personalprofil macht ${person.name} keinen ${DIENST_LABEL[art]}.` });
    } else if (!v.days.includes(day)) {
      out.push({
        kind: 'v',
        personId: person.id,
        title: `${person.name}: ${DIENST_LABEL[art]} am ${day} nicht vorgesehen`,
        desc: `Laut Personalprofil ${v.days.length ? `nur ${v.days.join(', ')}` : 'an keinem Tag'}.`,
      });
    }
  }
  return out;
}

/** Wochenprüfung: zu viele Dienste (Verstoß), zu wenige (Hinweis) */
export function dienstWochenFindings(persons: Person[], plan: Plan, settings: Settings): Finding[] {
  const out: Finding[] = [];
  for (const p of persons) {
    const vs = vorgabenOf(p);
    for (const art of ['frueh', 'spaet'] as DienstArt[]) {
      const v = vs[art];
      if (v.max === 0) continue; // schon als Tages-Verstoß gemeldet
      const tage = dienstTage(p, plan, settings, art);
      const n = tage.length;
      if (v.max !== null && n > v.max) {
        out.push({
          kind: 'v',
          personId: p.id,
          title: `${p.name}: ${n}× ${DIENST_LABEL[art]} (höchstens ${v.max}×)`,
          desc: `Eingeplant am ${tage.join(', ')}.`,
        });
      }
      if (n < v.min) {
        out.push({
          kind: 'h',
          personId: p.id,
          title: `${p.name}: ${n}× ${DIENST_LABEL[art]} (soll mindestens ${v.min}×)`,
          desc: n ? `Bisher am ${tage.join(', ')}.` : 'Bisher an keinem Tag eingeplant.',
        });
      }
    }
  }
  return out;
}
