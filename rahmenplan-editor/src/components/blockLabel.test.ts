import { describe, expect, it } from 'vitest';
import { blockLabel } from './Timeline';
import type { Block } from '../domain/types';

const b = (type: Block['type']): Block => ({ id: 'x', start: 14.25, end: 15.75, type, verb: 'hart' });

describe('Blockbeschriftung nennt die Art (nicht nur das Muster)', () => {
  it('zeigt bei Platz Name und Zeit, sonst zuerst die Uhrzeit', () => {
    expect(blockLabel(b('besprechung'), 400)).toBe('Dienstbesprechung 14:15–15:45');
    expect(blockLabel(b('besprechung'), 140)).toBe('Bespr. 14:15–15:45');
    expect(blockLabel(b('besprechung'), 100)).toBe('14:15–15:45');
    expect(blockLabel(b('besprechung'), 50)).toBe('14:15');
    expect(blockLabel(b('anleitung'), 40)).toBe('Anl.');
    expect(blockLabel(b('verfuegung'), 20)).toBe('V');
  });
  it('Betreuung bleibt ohne Artnamen, Pause wird benannt', () => {
    expect(blockLabel(b('betreuung'), 400)).toBe('14:15–15:45');
    expect(blockLabel(b('pause'), 50)).toBe('Pause');
  });
});
