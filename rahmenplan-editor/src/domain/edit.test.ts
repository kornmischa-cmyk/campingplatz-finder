import { describe, expect, it } from 'vitest';
import type { Block } from './types';
import { addBlockAfter, canEdit, deleteBlock, drawBlock, gapAt, insertPauseIn, setBlockType, suggestedPause } from './edit';
import { applyDrag, planDrag } from './drag';
import { defaultSettings } from './seed';

const b = (id: string, start: number, end: number, type: Block['type'] = 'betreuung', verb: Block['verb'] = 'weich'): Block => ({ id, start, end, type, verb });
const times = (bl: Block[]) => bl.map((x) => `${x.type}:${x.start}-${x.end}`);

describe('Zeitfenster aufziehen', () => {
  const day = [b('x', 7, 10), b('y', 14, 16)];

  it('findet die freie Lücke um einen Zeitpunkt', () => {
    expect(gapAt(day, 12, 7, 17)).toEqual({ lo: 10, hi: 14 });
    expect(gapAt(day, 8, 7, 17)).toBeNull(); // mitten in einem Block
    expect(gapAt(day, 16.5, 7, 17)).toEqual({ lo: 16, hi: 17 });
    expect(gapAt([], 9, 7, 17)).toEqual({ lo: 7, hi: 17 });
  });

  it('zieht in beide Richtungen auf, gerastert und auf die Lücke begrenzt', () => {
    const g = { lo: 10, hi: 14 };
    expect(times(drawBlock(day, 12.1, 15, g, 'n'))).toEqual(['betreuung:7-10', 'betreuung:12-14', 'betreuung:14-16']);
    expect(times(drawBlock(day, 12, 9, g, 'n'))).toEqual(['betreuung:7-10', 'betreuung:10-12', 'betreuung:14-16']);
    expect(drawBlock(day, 12, 12.05, g, 'n')).toBe(day); // zu kurz → nichts
  });

  it('legt per Knopf ein Zeitfenster in die nächste freie Lücke', () => {
    expect(times(addBlockAfter(day, 10, 7, 17, 'n')!)).toEqual(['betreuung:7-10', 'betreuung:10-12', 'betreuung:14-16']);
    expect(times(addBlockAfter(day, 16, 7, 17, 'n')!)).toEqual(['betreuung:7-10', 'betreuung:14-16', 'betreuung:16-17']);
    expect(addBlockAfter([b('a', 7, 17)], 17, 7, 17, 'n')).toBeNull();
  });
});

describe('Pause einziehen und verschieben', () => {
  it('teilt den Block mittig und lässt die Pause dann entlang der Zeitleiste wandern', () => {
    const r = insertPauseIn([b('a', 7, 16)], 'a', 0.5, 'p')!;
    expect(times(r.blocks)).toEqual(['betreuung:7-11.25', 'pause:11.25-11.75', 'betreuung:11.75-16']);
    // Pause um 1 h nach hinten ziehen: Nachbarn wandern mit, Arbeitszeit bleibt gleich
    const idx = r.blocks.findIndex((x) => x.id === 'p');
    const moved = applyDrag(r.blocks, planDrag(r.blocks, idx, 'move', 7, 17), 1);
    expect(times(moved)).toEqual(['betreuung:7-12.25', 'pause:12.25-12.75', 'betreuung:12.75-16']);
  });

  it('setzt die Pause an eine gewünschte Stelle und kürzt sie, wenn der Block zu kurz ist', () => {
    expect(times(insertPauseIn([b('a', 7, 16)], 'a', 0.5, 'p', 7)!.blocks)).toEqual(['pause:7-7.5', 'betreuung:7.5-16']);
    expect(times(insertPauseIn([b('a', 9, 9.75)], 'a', 1, 'p')!.blocks)).toEqual(['betreuung:9-9.25', 'pause:9.25-9.75']);
  });

  it('nicht in gesperrte Zeiten, Termine oder Pausen', () => {
    expect(insertPauseIn([b('a', 7, 16, 'betreuung', 'hart')], 'a', 0.5, 'p')).toBeNull();
    expect(insertPauseIn([b('termin:t@Mo', 14, 15, 'besprechung', 'hart')], 'termin:t@Mo', 0.5, 'p')).toBeNull();
    expect(insertPauseIn([b('a', 7, 9, 'pause')], 'a', 0.5, 'p')).toBeNull();
  });

  it('schlägt die gesetzlich fehlende Pause vor, sonst den Wunsch, sonst 30 Minuten', () => {
    const s = defaultSettings();
    expect(suggestedPause([b('a', 7, 16.5)], s)).toBe(0.5);
    expect(suggestedPause([b('a', 7, 16.5)], s, 60)).toBe(1);
    expect(suggestedPause([b('a', 8, 12)], s)).toBe(0.5);
  });
});

describe('Löschen und Art ändern', () => {
  it('eine entfernte Pause wird wieder durchgehende Arbeitszeit', () => {
    const day = [b('a', 7, 11), b('p', 11, 11.5, 'pause'), b('c', 11.5, 16)];
    expect(times(deleteBlock(day, 'p'))).toEqual(['betreuung:7-16']);
    const mixed = [b('a', 7, 11), b('p', 11, 11.5, 'pause'), b('c', 11.5, 16, 'verfuegung')];
    expect(times(deleteBlock(mixed, 'p'))).toEqual(['betreuung:7-11.5', 'verfuegung:11.5-16']);
  });

  it('andere Blöcke hinterlassen eine Lücke', () => {
    expect(times(deleteBlock([b('a', 7, 10), b('c', 10, 12, 'verfuegung')], 'c'))).toEqual(['betreuung:7-10']);
  });

  it('Art ändern, aber keine gesperrten Zeiten und keine Termine bearbeiten', () => {
    expect(times(setBlockType([b('a', 7, 10)], 'a', 'verfuegung'))).toEqual(['verfuegung:7-10']);
    expect(canEdit(b('a', 7, 10), 'test')).toBe(true);
    expect(canEdit(b('a', 7, 10), 'geltend')).toBe(false);
    expect(canEdit(b('a', 7, 10, 'betreuung', 'hart'), 'test')).toBe(false);
    expect(canEdit({ ...b('a', 7, 10, 'betreuung', 'hart'), unlocked: true }, 'test')).toBe(true);
    expect(canEdit(b('termin:t@Mo', 14, 15, 'besprechung', 'hart'), 'test')).toBe(false);
  });
});
