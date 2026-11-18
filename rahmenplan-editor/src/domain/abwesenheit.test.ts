import { describe, expect, it } from 'vitest';
import type { Abwesenheit, Block, Plan } from './types';
import { abwesenheitFehler, addDays, applyAbwesenheit, kalenderwoche, mondayOf, weekDates, wochenPlan } from './abwesenheit';

const b = (id: string, start: number, end: number, type: Block['type'] = 'betreuung'): Block => ({ id, start, end, type, verb: 'weich' });
const abw = (x: Partial<Abwesenheit>): Abwesenheit => ({ id: 'a', personId: 'p', art: 'urlaub', von: '2026-11-24', bis: '2026-11-24', ...x });

describe('Kalender', () => {
  it('findet Montag und Kalenderwoche', () => {
    expect(mondayOf('2026-11-26')).toBe('2026-11-23');
    expect(mondayOf('2026-11-23')).toBe('2026-11-23');
    expect(mondayOf('2026-11-29')).toBe('2026-11-23'); // Sonntag gehört zur Woche davor
    expect(kalenderwoche('2026-11-23')).toBe(48);
    expect(kalenderwoche('2027-01-01')).toBe(53);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(weekDates('2026-11-23').Fr).toBe('2026-11-27');
  });
});

describe('Abwesenheiten', () => {
  const day = [b('x', 7, 11), b('p', 11, 11.5, 'pause'), b('y', 11.5, 15)];

  it('ganztägig: Person fällt an dem Tag aus', () => {
    expect(applyAbwesenheit(day, [abw({})])).toEqual([]);
  });

  it('zeitweise: nur die Uhrzeit wird herausgeschnitten', () => {
    const r = applyAbwesenheit(day, [abw({ art: 'fortbildung', start: 9, end: 12 })]);
    expect(r.map((x) => `${x.type}:${x.start}-${x.end}`)).toEqual(['betreuung:7-9', 'betreuung:12-15']);
  });

  it('Wochenplan: Urlaub über mehrere Tage, andere Tage unverändert', () => {
    const plan: Plan = { since: '', blocks: { p: { Mo: day, Di: day, Mi: day }, q: { Di: day } } };
    const w = wochenPlan(plan, '2026-11-23', [abw({ von: '2026-11-24', bis: '2026-12-02' })]);
    expect(w.blocks.p.Mo).toEqual(day);
    expect(w.blocks.p.Di).toBeUndefined();
    expect(w.blocks.p.Mi).toBeUndefined();
    expect(w.blocks.q.Di).toEqual(day);
  });

  it('prüft Eingaben', () => {
    expect(abwesenheitFehler(abw({ bis: '2026-11-20' }))).toContain('Das Ende liegt vor dem Beginn.');
    expect(abwesenheitFehler(abw({ bis: '2026-11-25', start: 9, end: 12 }))).toContain('Uhrzeiten gehen nur bei einem einzelnen Tag.');
    expect(abwesenheitFehler(abw({}))).toEqual([]);
  });
});
