import { describe, expect, it } from 'vitest';
import { fmtHours, fmtSollDiff } from './soll';

describe('Soll-Anzeige in Stunden:Minuten', () => {
  it('formatiert Wochenstunden', () => {
    expect(fmtHours(31.25)).toBe('31:15');
    expect(fmtHours(32)).toBe('32');
    expect(fmtHours(19.5)).toBe('19:30');
  });
  it('zeigt offen, erreicht und über Soll', () => {
    expect(fmtSollDiff(31.25, 32)).toEqual({ tone: 'under', chip: 'noch 0:45', spoken: 'noch 0:45 Stunden offen' });
    expect(fmtSollDiff(32, 32).tone).toBe('ok');
    expect(fmtSollDiff(33.5, 32).chip).toBe('+1:30');
  });
});
