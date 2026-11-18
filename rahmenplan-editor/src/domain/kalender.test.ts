import { describe, expect, it } from 'vitest';
import { feiertageHessen, geschlossenAm, ostersonntag } from './kalender';
import { defaultSettings } from './seed';

describe('Feiertage Hessen', () => {
  it('berechnet Ostern richtig', () => {
    expect(ostersonntag(2026)).toBe('2026-04-05');
    expect(ostersonntag(2027)).toBe('2027-03-28');
    expect(ostersonntag(2025)).toBe('2025-04-20');
  });
  it('enthält die beweglichen Feiertage inkl. Fronleichnam', () => {
    const f = feiertageHessen(2026);
    expect(f.get('2026-04-03')).toBe('Karfreitag');
    expect(f.get('2026-05-14')).toBe('Christi Himmelfahrt');
    expect(f.get('2026-05-25')).toBe('Pfingstmontag');
    expect(f.get('2026-06-04')).toBe('Fronleichnam');
    expect(f.size).toBe(10);
  });
});

describe('Geschlossen', () => {
  it('Feiertag, Schließzeit, normaler Tag', () => {
    const s = { ...defaultSettings(), schliesszeiten: [{ id: 'z', name: 'Sommerschließung', von: '2026-07-20', bis: '2026-08-07' }] };
    expect(geschlossenAm('2026-10-03', s)).toEqual({ art: 'feiertag', name: 'Tag der Deutschen Einheit' });
    expect(geschlossenAm('2026-07-24', s)).toEqual({ art: 'schliesszeit', name: 'Sommerschließung' });
    expect(geschlossenAm('2026-07-19', s)).toBeNull();
    expect(geschlossenAm('2026-10-03', { ...s, feiertage: 'keine' })).toBeNull();
  });
});
