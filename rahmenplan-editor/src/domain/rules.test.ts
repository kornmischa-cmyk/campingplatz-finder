import { describe, expect, it } from 'vitest';
import type { Block, BlockType, Person, Plan } from './types';
import { seedData, defaultSettings } from './seed';
import { evaluateDay, longestStretch, requiredPause, weekTable, workHours } from './rules';

const B = (start: number, end: number, type: BlockType = 'betreuung'): Block => ({ id: `${start}`, start, end, type, verb: 'weich' });
const settings = defaultSettings();

function person(id: string, fk: boolean, blocks: Block[]): Person {
  return { id, name: id, qual: '', fk, groupId: 'g', soll: 30, workdays: ['Mo'], normBlocks: blocks, tueBlocks: null, mentorId: '', notiz: '' };
}
function planOf(entries: Record<string, Block[]>): Plan {
  return { since: '', blocks: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, { Mo: v }])) };
}

describe('Pausen', () => {
  it('Pausenstaffel nach ArbZG', () => {
    expect(requiredPause(6, settings)).toBe(0);
    expect(requiredPause(6.25, settings)).toBe(0.5);
    expect(requiredPause(9, settings)).toBe(0.5);
    expect(requiredPause(9.25, settings)).toBe(0.75);
  });

  it('längste Strecke am Stück', () => {
    expect(longestStretch([B(7, 10), B(10, 10.5, 'pause'), B(10.5, 13.5)])).toBe(3);
    expect(longestStretch([B(7, 11), B(11, 13.5, 'besprechung')])).toBe(6.5);
  });

  it('Arbeitszeit ohne Pausen', () => {
    expect(workHours([B(7, 10), B(10, 10.5, 'pause'), B(10.5, 13.5)])).toBe(6);
  });
});

describe('evaluateDay (Beispieldaten)', () => {
  const data = seedData('2026-01-01T00:00:00Z');
  const { persons, plans } = data;

  it('geltender Plan Dienstag: Frühdienst unterbesetzt, keine Fachkraft um 7:00', () => {
    const r = evaluateDay(persons, plans.geltend, 'Di', settings);
    const titles = r.findings.map((f) => f.title);
    expect(titles).toContain('Keine Fachkraft im Haus · 07:00–07:30');
    expect(titles).toContain('Weniger als 2 Personen · 07:00–07:30');
    expect(titles).toContain('Frauke: Plan weicht von der Normalarbeitszeit ab');
  });

  it('Testfassung Dienstag: Frühdienst behoben', () => {
    const r = evaluateDay(persons, plans.test!, 'Di', settings);
    const titles = r.findings.map((f) => f.title);
    expect(titles).not.toContain('Weniger als 2 Personen · 07:00–07:30');
    expect(titles.some((t) => t.startsWith('Frauke'))).toBe(false);
    expect(titles.some((t) => t.startsWith('Dienstbesprechung:'))).toBe(true);
  });

  it('Hinweis bei über 8 h (Heike Mo: 8,5 h)', () => {
    const r = evaluateDay(persons, plans.geltend, 'Mo', settings);
    expect(r.findings.find((f) => f.title === 'Heike: 8,50 h Arbeitszeit')?.kind).toBe('h');
  });

  it('Abdeckung zählt nur Betreuung', () => {
    const r = evaluateDay(persons, plans.geltend, 'Di', settings);
    const slot1430 = r.slots.find((s) => s.h === 14.5)!;
    // Heike, Doris, Lena, Bettina, Nora sitzen in der Besprechung
    expect(slot1430.tot).toBe(2); // Jonas, Aylin
    expect(slot1430.fk).toBe(0);
  });
});

describe('evaluateDay (konstruiert)', () => {
  it('Pflichtpause fehlt und 6 h am Stück', () => {
    const p = person('x', true, [B(7, 14)]);
    const r = evaluateDay([p], planOf({ x: [B(7, 14)] }), 'Mo', settings);
    const titles = r.findings.map((f) => f.title);
    expect(titles).toContain('x: Pflichtpause fehlt · 0 statt 30 Minuten');
    expect(titles).toContain('x: 7,00 h ohne Unterbrechung');
  });

  it('konfigurierbare Mindestanzahl Fachkräfte', () => {
    const bl = [B(7, 10), B(10, 10.5, 'pause'), B(10.5, 16.5)];
    const ps = [person('a', true, bl), person('b', true, bl)];
    const plan = planOf({ a: bl, b: bl });
    expect(evaluateDay(ps, plan, 'Mo', settings).findings.filter((f) => f.kind === 'v').length).toBe(1); // nur Pause-Lücke 10:00–10:30
    const strict = { ...settings, minFachkraefte: 2 };
    const titles = evaluateDay(ps, plan, 'Mo', strict).findings.map((f) => f.title);
    expect(titles).toContain('Weniger als 2 Fachkräfte · 10:00–10:30');
  });

  it('OK ohne Befund', () => {
    const bl = [B(7, 10), B(10, 10.5, 'pause'), B(10.5, 16.5)];
    const bl2 = [B(7, 10.5), B(10.5, 11, 'pause'), B(11, 16.5)];
    const ps = [person('a', true, bl), person('b', true, bl2), person('c', true, bl)];
    ps[1].normBlocks = bl2;
    const r = evaluateDay(ps, planOf({ a: bl, b: bl2, c: bl }), 'Mo', { ...settings, hinweisArbeitszeit: 10 });
    expect(r.findings).toEqual([expect.objectContaining({ kind: 'ok' })]);
  });

  it('harte Zeit verändert → Hinweis', () => {
    const hard: Block = { ...B(8, 13), verb: 'hart' };
    const p = person('e', true, [hard]);
    const r = evaluateDay([p], planOf({ e: [B(8.5, 13.5)] }), 'Mo', settings);
    expect(r.findings.find((f) => f.title.startsWith('e: harte Zeit verändert'))?.kind).toBe('h');
  });
});

describe('weekTable', () => {
  it('summiert Ist-Stunden', () => {
    const data = seedData();
    const carla = weekTable(data.persons, data.plans.geltend).find((r) => r.person.id === 'carla')!;
    expect(carla.ist).toBeCloseTo(30); // Di: Anleitergespräch zählt als Arbeitszeit
    expect(carla.cells[0]).toEqual({ start: 8, end: 14.5, hours: 6 });
  });
});
