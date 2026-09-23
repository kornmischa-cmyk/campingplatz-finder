import { describe, expect, it } from 'vitest';
import type { Block, BlockType } from './types';
import { applyDrag, canDrag, planDrag, pxToDelta } from './drag';

const B = (start: number, end: number, type: BlockType = 'betreuung', extra: Partial<Block> = {}): Block => ({
  id: `${start}-${end}`, start, end, type, verb: 'weich', ...extra,
});
const times = (bl: Block[]) => bl.map((b) => [b.start, b.end]);

describe('planDrag / applyDrag', () => {
  // Carla, Normaltag
  const carla = [B(8, 11.5), B(11.5, 12, 'pause'), B(12, 14.5)];

  it('verschiebt einen Block und nimmt die bündig anliegende Pause mit', () => {
    const p = planDrag(carla, 0, 'move', 7, 16.5);
    expect(times(applyDrag(carla, p, 0.25))).toEqual([[8.25, 11.75], [11.75, 12], [12, 14.5]]);
  });

  it('Pause bleibt mindestens 15 Minuten lang', () => {
    const p = planDrag(carla, 0, 'move', 7, 16.5);
    expect(times(applyDrag(carla, p, 3))).toEqual([[8.25, 11.75], [11.75, 12], [12, 14.5]]);
  });

  it('stoppt an der Öffnungszeit', () => {
    const p = planDrag(carla, 0, 'l', 7, 16.5);
    expect(times(applyDrag(carla, p, -5))[0]).toEqual([7, 11.5]);
  });

  it('Mindestdauer 15 Minuten beim Kürzen', () => {
    const p = planDrag(carla, 2, 'r', 7, 16.5);
    expect(times(applyDrag(carla, p, -10))[2]).toEqual([12, 12.25]);
  });

  it('Ende stoppt an der Schließzeit', () => {
    const p = planDrag(carla, 2, 'r', 7, 16.5);
    expect(times(applyDrag(carla, p, 10))[2]).toEqual([12, 16.5]);
  });

  it('stoppt an bündigem, nicht anpassbarem Nachbarn (Besprechung)', () => {
    const heike = [B(12.5, 14.25), B(14.25, 15.75, 'besprechung'), B(15.75, 16.5)];
    const p = planDrag(heike, 0, 'move', 7, 16.5);
    expect(applyDrag(heike, p, 0.5)).toBe(heike);
    // nach links geht es
    expect(times(applyDrag(heike, p, -0.5))[0]).toEqual([12, 13.75]);
  });

  it('bewegt sich bei Lücke bis zum Nachbarn, nicht darüber', () => {
    const bl = [B(8, 10), B(11, 12)];
    const p = planDrag(bl, 0, 'move', 7, 16.5);
    expect(times(applyDrag(bl, p, 5))).toEqual([[9, 11], [11, 12]]);
  });

  it('harter, gesperrter Nachbar wirkt wie eine Wand', () => {
    const bl = [B(8, 10), B(10, 12, 'betreuung', { verb: 'hart' })];
    const p = planDrag(bl, 0, 'r', 7, 16.5);
    expect(applyDrag(bl, p, 1)).toBe(bl);
  });

  it('entsperrter harter Nachbar passt sich an', () => {
    const bl = [B(8, 10), B(10, 12, 'betreuung', { verb: 'hart', unlocked: true })];
    const p = planDrag(bl, 0, 'r', 7, 16.5);
    expect(times(applyDrag(bl, p, 1))).toEqual([[8, 11], [11, 12]]);
  });

  it('Delta bezieht sich immer auf den Startzustand (kein Drift)', () => {
    const p = planDrag(carla, 0, 'move', 7, 16.5);
    applyDrag(carla, p, 0.25);
    expect(times(applyDrag(carla, p, -0.5))[0]).toEqual([7.5, 11]);
  });
});

describe('canDrag', () => {
  it('nur in der Testfassung, nur Betreuung/Verfügung, nicht gesperrt', () => {
    expect(canDrag(B(8, 9), 'geltend')).toBe(false);
    expect(canDrag(B(8, 9), 'test')).toBe(true);
    expect(canDrag(B(8, 9, 'verfuegung'), 'test')).toBe(true);
    expect(canDrag(B(8, 9, 'pause'), 'test')).toBe(false);
    expect(canDrag(B(8, 9, 'besprechung'), 'test')).toBe(false);
    expect(canDrag(B(8, 9, 'betreuung', { verb: 'hart' }), 'test')).toBe(false);
    expect(canDrag(B(8, 9, 'betreuung', { verb: 'hart', unlocked: true }), 'test')).toBe(true);
  });
});

describe('pxToDelta', () => {
  it('rastet auf 15 Minuten', () => {
    expect(pxToDelta(10, 950, 9.5)).toBe(0);
    expect(pxToDelta(25, 950, 9.5)).toBe(0.25);
    expect(pxToDelta(-100, 950, 9.5)).toBe(-1);
  });
});
