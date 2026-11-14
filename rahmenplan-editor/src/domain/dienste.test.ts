import { describe, expect, it } from 'vitest';
import type { Block, BlockType, Person, Plan } from './types';
import { defaultSettings } from './seed';
import { dienstTage, dienstWochenFindings, randzeitenOf, vorgabeIssues, vorgabeText } from './dienste';
import { evaluateDay } from './rules';

const B = (start: number, end: number, type: BlockType = 'betreuung'): Block => ({ id: `${start}`, start, end, type, verb: 'weich' });
const settings = defaultSettings(); // Randzeiten 7:00–7:30 und 15:00–16:30

const frueh = [B(7, 10), B(10, 10.5, 'pause'), B(10.5, 13)];
const spaet = [B(10, 13), B(13, 13.5, 'pause'), B(13.5, 16.5)];
const normal = [B(8, 11), B(11, 11.5, 'pause'), B(11.5, 14)];

function person(dienste?: Person['dienste']): Person {
  return { id: 'a', name: 'Anna', qual: '', fk: true, groupId: 'g', soll: 30, workdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr'], normBlocks: normal, tueBlocks: null, mentorId: '', notiz: '', dienste };
}
const plan = (days: Partial<Record<'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr', Block[]>>): Plan => ({ since: '', blocks: { a: days } });

describe('Früh-/Spätdienst', () => {
  it('ordnet Randzeiten nach Tageshälfte zu', () => {
    expect(randzeitenOf(settings, 'frueh')).toEqual([{ start: 7, end: 7.5, minPersonen: 2 }]);
    expect(randzeitenOf(settings, 'spaet')).toEqual([{ start: 15, end: 16.5, minPersonen: 2 }]);
  });

  it('zählt nur Betreuung, die in die Randzeit reicht', () => {
    const pl = plan({ Mo: frueh, Di: spaet, Mi: normal, Do: [B(7, 7.5, 'verfuegung'), B(7.5, 12)] });
    expect(dienstTage(person(), pl, settings, 'frueh')).toEqual(['Mo']);
    expect(dienstTage(person(), pl, settings, 'spaet')).toEqual(['Di']);
  });

  it('zu viele = Verstoß, zu wenige = Hinweis', () => {
    const p = person({ frueh: { min: 0, max: 1, days: ['Mo', 'Di', 'Mi', 'Do', 'Fr'] }, spaet: { min: 2, max: null, days: ['Mo', 'Di', 'Mi', 'Do', 'Fr'] } });
    const f = dienstWochenFindings([p], plan({ Mo: frueh, Di: frueh, Mi: spaet }), settings);
    expect(f.map((x) => [x.kind, x.title])).toEqual([
      ['v', 'Anna: 2× Frühdienst (höchstens 1×)'],
      ['h', 'Anna: 1× Spätdienst (soll mindestens 2×)'],
    ]);
  });

  it('Dienst an nicht vorgesehenem Tag oder trotz Verbot = Verstoß am Tag', () => {
    const p = person({ frueh: { min: 0, max: null, days: ['Mo'] }, spaet: { min: 0, max: 0, days: ['Mo', 'Di', 'Mi', 'Do', 'Fr'] } });
    const pl = plan({ Di: frueh, Mi: spaet });
    const di = evaluateDay([p], pl, 'Di', settings).findings.map((x) => x.title);
    const mi = evaluateDay([p], pl, 'Mi', settings).findings.map((x) => x.title);
    expect(di).toContain('Anna: Frühdienst am Di nicht vorgesehen');
    expect(mi).toContain('Anna: Spätdienst, obwohl nicht erlaubt');
  });

  it('ohne Vorgaben keine Befunde', () => {
    expect(dienstWochenFindings([person()], plan({ Mo: frueh, Di: frueh, Mi: frueh }), settings)).toEqual([]);
  });

  it('Kurztexte und Widersprüche', () => {
    expect(vorgabeText({ min: 1, max: 2, days: ['Mo', 'Di', 'Mi', 'Do', 'Fr'] })).toBe('1–2×');
    expect(vorgabeText({ min: 0, max: 0, days: ['Mo'] })).toBe('nie');
    expect(vorgabeText({ min: 0, max: null, days: ['Mo', 'Mi'] })).toBe('nur Mo, Mi');
    expect(vorgabeIssues({ min: 3, max: 1, days: ['Mo', 'Di'] }, 'frueh')).toHaveLength(2);
  });
});
