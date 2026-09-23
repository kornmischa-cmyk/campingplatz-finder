import { describe, expect, it } from 'vitest';
import { seedData } from './seed';
import { adoptTest, blockListIssues, deviation, templateFor, withDayBlocks } from './plan';
import { parseBackup, toBackup } from './storage';
import { planToCsv } from './csv';

describe('Plan / Fassungen', () => {
  const data = seedData('2026-01-01T00:00:00Z');
  const esther = data.persons.find((p) => p.id === 'esther')!;

  it('Dienstag nutzt den Sonderfall', () => {
    expect(templateFor(esther, 'Di').map((b) => b.type)).toEqual(['betreuung', 'anleitung']);
    expect(templateFor(esther, 'Mo').map((b) => b.type)).toEqual(['betreuung']);
  });

  it('kein Plan an freien Tagen', () => {
    const jonas = data.persons.find((p) => p.id === 'jonas')!;
    expect(templateFor(jonas, 'Mi')).toEqual([]);
  });

  it('erkennt Abweichung und harte Zeit', () => {
    const tpl = templateFor(esther, 'Mo');
    expect(deviation(esther, tpl, 'Mo')).toEqual({ deviates: false, hardChanged: [] });
    const moved = [{ ...tpl[0], start: 8.25, end: 13.25 }];
    const d = deviation(esther, moved, 'Mo');
    expect(d.deviates).toBe(true);
    expect(d.hardChanged).toHaveLength(1);
  });

  it('Übernahme entfernt Entsperrungen', () => {
    const b = { ...templateFor(esther, 'Mo')[0], unlocked: true };
    const test = withDayBlocks(data.plans.test!, 'esther', 'Mo', [b]);
    const adopted = adoptTest(test, 'x');
    expect(adopted.blocks.esther.Mo![0].unlocked).toBeUndefined();
    expect(adopted.blocks.esther.Mo![0].verb).toBe('hart');
    expect(adopted.since).toBe('x');
  });

  it('Plausibilität der Normalzeiten', () => {
    const issues = blockListIssues(
      [
        { id: 'a', start: 8, end: 10, type: 'betreuung', verb: 'weich' },
        { id: 'b', start: 9.5, end: 9.5, type: 'pause', verb: 'weich' },
      ],
      7,
      16.5,
    );
    expect(issues.length).toBe(2);
  });
});

describe('Sicherung', () => {
  it('Roundtrip', () => {
    const data = seedData('2026-01-01T00:00:00Z');
    expect(parseBackup(toBackup(data))).toEqual(data);
  });

  it('verständliche Fehler bei kaputter Datei', () => {
    expect(parseBackup('kein json')).toMatch(/kein JSON/);
    expect(parseBackup('{"version":2}')).toMatch(/unbekannten Version/);
    const data = seedData();
    const bad = JSON.parse(toBackup(data));
    bad.persons[0].normBlocks[0].type = 'kaffee';
    expect(parseBackup(JSON.stringify(bad))).toMatch(/unbekannter Blocktyp/);
  });

  it('ergänzt fehlende Einstellungen', () => {
    const bad = JSON.parse(toBackup(seedData()));
    delete bad.settings.maxAmStueck;
    const res = parseBackup(JSON.stringify(bad));
    expect(typeof res === 'string' ? res : res.settings.maxAmStueck).toBe(6);
  });
});

describe('CSV', () => {
  it('Excel-tauglich, nur geltender Plan', () => {
    const data = seedData();
    const csv = planToCsv(data);
    expect(csv.startsWith('﻿Gruppe;Person;')).toBe(true);
    expect(csv).toContain('Frosch;Carla;Erzieherin;ja;Mo;08:00;11:30;Betreuung;3,50');
    // Frauke Di geltend 7:30, nicht Testfassung 7:00
    expect(csv).toContain('Libellen;Frauke;Erzieherin;ja;Di;07:30;10:30;Betreuung;3,00');
  });

  it('schützt vor Formel-Injection und Trennzeichen', () => {
    const data = seedData();
    data.persons[0].name = '=HYPERLINK("x")';
    data.persons[1].qual = 'A;B';
    const csv = planToCsv(data);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"A;B"');
  });
});
