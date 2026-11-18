import { describe, expect, it } from 'vitest';
import { seedData } from './seed';
import { berechneWoche } from './woche';
import { wocheToCsv } from './csv';

describe('Konkrete Woche', () => {
  const data = seedData('2026-01-01T00:00:00.000Z');
  data.settings.schliesszeiten = [{ id: 'z', name: 'Brückentag', von: '2026-05-15', bis: '2026-05-15' }];
  data.abwesenheiten = [{ id: 'a', personId: 'tina', art: 'urlaub', von: '2026-05-11', bis: '2026-05-12' }];

  it('Feiertag und Schließzeit leeren den Tag, Abwesenheit nur für die Person', () => {
    const w = berechneWoche(data, '2026-05-11'); // KW 20: Do 14.5. Himmelfahrt, Fr 15.5. Brückentag
    expect(w.geschlossen.Do?.name).toBe('Christi Himmelfahrt');
    expect(w.geschlossen.Fr?.name).toBe('Brückentag');
    expect(Object.values(w.plan.blocks).some((d) => d.Do || d.Fr)).toBe(false);
    expect(w.plan.blocks.tina?.Mo).toBeUndefined();
    expect(w.abwesend.Mo.tina?.[0].art).toBe('urlaub');
    expect(Object.keys(w.plan.blocks).filter((p) => w.plan.blocks[p].Mo).length).toBeGreaterThan(5);
  });

  it('CSV der Woche nennt geschlossene Tage und Abwesenheiten', () => {
    const csv = wocheToCsv(data, '2026-05-11');
    expect(csv).toContain('14.05.2026;Do;;;;;;Kita geschlossen: Christi Himmelfahrt');
    expect(csv).toContain('Abwesend: Urlaub');
    expect(csv.split('\r\n')[0]).toContain('KW;Datum;Tag');
  });
});
