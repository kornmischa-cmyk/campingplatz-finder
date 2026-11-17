import { describe, expect, it } from 'vitest';
import { historyReducer, initHistory, type History } from './store';
import { seedData } from '../domain/seed';
import type { Block } from '../domain/types';

const blk = (start: number, end: number): Block[] => [{ id: 'x', start, end, type: 'betreuung', verb: 'weich' }];
const day = (h: History) => h.data.plans.test!.blocks['tina']?.Mo;

describe('Rückgängig / Wiederholen', () => {
  const base = () => initHistory(seedData('2026-01-01T00:00:00.000Z'));

  it('macht Änderungen rückgängig und stellt sie wieder her', () => {
    let h = base();
    const orig = day(h);
    h = historyReducer(h, { kind: 'do', action: { type: 'setTestDay', personId: 'tina', day: 'Mo', blocks: blk(8, 12) }, at: 0 });
    h = historyReducer(h, { kind: 'undo' });
    expect(day(h)).toEqual(orig);
    h = historyReducer(h, { kind: 'redo' });
    expect(day(h)).toEqual(blk(8, 12));
  });

  it('fasst schnelle Folgeänderungen am selben Tag (Ziehen) zu einem Schritt zusammen', () => {
    let h = base();
    const orig = day(h);
    for (let i = 0; i < 5; i++) h = historyReducer(h, { kind: 'do', action: { type: 'setTestDay', personId: 'tina', day: 'Mo', blocks: blk(8 + i * 0.25, 12) }, at: i * 50 });
    expect(h.past).toHaveLength(1);
    h = historyReducer(h, { kind: 'do', action: { type: 'setTestDay', personId: 'tina', day: 'Mo', blocks: blk(9, 12) }, at: 5000 });
    expect(h.past).toHaveLength(2);
    h = historyReducer(historyReducer(h, { kind: 'undo' }), { kind: 'undo' });
    expect(day(h)).toEqual(orig);
  });

  it('neue Änderung verwirft „Wiederholen“, Laden von außen leert den Verlauf', () => {
    let h = base();
    h = historyReducer(h, { kind: 'do', action: { type: 'setSettings', patch: { kitaName: 'A' } }, at: 0 });
    h = historyReducer(h, { kind: 'undo' });
    h = historyReducer(h, { kind: 'do', action: { type: 'setSettings', patch: { maxAmStueck: 5 } }, at: 10 });
    expect(h.future).toHaveLength(0);
    h = historyReducer(h, { kind: 'load', data: h.data });
    expect(h.past).toHaveLength(0);
    expect(historyReducer(h, { kind: 'undo' })).toBe(h);
  });
});
