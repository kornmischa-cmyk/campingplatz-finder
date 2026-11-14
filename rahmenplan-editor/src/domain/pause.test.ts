import { describe, expect, it } from 'vitest';
import type { Block, BlockType, Person } from './types';
import { defaultSettings, seedData } from './seed';
import { missingPause, withAutoPause } from './pause';
import { templateFor } from './plan';
import { migrateTueBlocks, parseBackup, toBackup } from './storage';

const B = (start: number, end: number, type: BlockType = 'betreuung', id = `${type}${start}`): Block => ({ id, start, end, type, verb: 'weich' });
const settings = defaultSettings();
const t = (bl: Block[]) => bl.map((b) => [b.type, b.start, b.end]);

describe('Automatische Pause', () => {
  it('7:00–16:30 bekommt 30 Min in der Mitte (9 h Arbeit brauchen 30 Min)', () => {
    expect(missingPause([B(7, 16.5)], settings)).toBe(0.5);
    expect(t(withAutoPause([B(7, 16.5)], settings))).toEqual([
      ['betreuung', 7, 11.5],
      ['pause', 11.5, 12],
      ['betreuung', 12, 16.5],
    ]);
  });

  it('bis 6 h keine Pause', () => {
    expect(t(withAutoPause([B(8, 14)], settings))).toEqual([['betreuung', 8, 14]]);
  });

  it('10 h Anwesenheit → 45 Min', () => {
    expect(missingPause([B(7, 17)], settings)).toBe(0.75);
  });

  it('Wunschlänge pro Person (60 Min), aber nur wenn eine Pause nötig ist', () => {
    expect(t(withAutoPause([B(7, 16.5)], settings, 60))).toEqual([
      ['betreuung', 7, 11.25],
      ['pause', 11.25, 12.25],
      ['betreuung', 12.25, 16.5],
    ]);
    expect(withAutoPause([B(8, 13)], settings, 60)).toHaveLength(1);
  });

  it('vorhandene Pause reicht → nichts einfügen', () => {
    const bl = [B(7, 11), B(11, 11.5, 'pause'), B(11.5, 16)];
    expect(withAutoPause(bl, settings)).toBe(bl);
  });

  it('Pause nie in einen Termin', () => {
    const bl = [B(8, 11), { ...B(11, 14, 'besprechung'), id: 'termin:x@Mo' }, B(14, 16)];
    const out = withAutoPause(bl, settings);
    const p = out.find((b) => b.type === 'pause')!;
    expect(p.start >= 14 || p.end <= 11).toBe(true);
  });
});

describe('Termine', () => {
  it('Termin ist zusätzlicher Block, Dienst wird nicht verlängert', () => {
    const data = seedData();
    const selin = data.persons.find((p) => p.id === 'selin')!; // 9–11:30, Pause, 12–14
    expect(t(templateFor(selin, 'Di', data)).slice(-2)).toEqual([
      ['betreuung', 12, 14],
      ['besprechung', 14.25, 15.75],
    ]);
  });

  it('nur wer an dem Tag arbeitet', () => {
    const data = seedData();
    const doris = data.persons.find((p) => p.id === 'doris')!; // arbeitet nicht montags
    expect(templateFor(doris, 'Mo', data)).toEqual([]);
  });
});

describe('Umwandlung alter Dienstag-Sonderfälle', () => {
  const mk = (id: string, tue: Block[] | null, workdays: Person['workdays'] = ['Mo', 'Di']): Person => ({
    id, name: id, qual: '', fk: true, groupId: 'g', soll: 20, workdays, normBlocks: [B(8, 12)], tueBlocks: tue, mentorId: '', notiz: '',
  });

  it('gleiche Besprechung bei allen Dienstags-Arbeitenden → Termin für alle', () => {
    const meet = B(14, 15, 'besprechung');
    const r = migrateTueBlocks([mk('a', [B(8, 12), meet]), mk('b', [B(8, 12), meet]), mk('c', null, ['Mo'])], []);
    expect(r.termine).toEqual([{ id: 'migriert-1', name: 'Dienstbesprechung', type: 'besprechung', day: 'Di', start: 14, end: 15, teilnehmer: 'alle' }]);
    expect(r.persons.every((p) => p.tueBlocks === undefined)).toBe(true);
  });

  it('Anleitergespräch nur bei einzelnen → Termin mit Teilnehmenden', () => {
    const r = migrateTueBlocks([mk('a', [B(9, 10, 'anleitung')]), mk('b', [B(9, 10, 'anleitung')]), mk('c', null)], []);
    expect(r.termine[0].teilnehmer).toEqual(['a', 'b']);
  });

  it('alte Sicherung ohne Termine wird gelesen', () => {
    const old = JSON.parse(toBackup(seedData()));
    delete old.termine;
    old.persons[0].tueBlocks = [{ id: 'x', start: 14.25, end: 15.75, type: 'besprechung', verb: 'weich' }];
    const res = parseBackup(JSON.stringify(old));
    expect(typeof res).not.toBe('string');
    if (typeof res !== 'string') expect(res.termine).toHaveLength(1);
  });
});
