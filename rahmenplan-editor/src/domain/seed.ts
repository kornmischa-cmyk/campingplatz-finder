// Fiktive Beispieldaten aus dem Design-Prototyp („Kita Sonnenblume“).
import type { AppData, Block, BlockType, Day, Group, Person, Settings } from './types';
import { planFromProfiles } from './plan';

type Raw = [number, number, BlockType];

const GROUPS: Group[] = [
  { id: 'frosch', name: 'Frosch', kinder: 25, alter: '3–6 J.' },
  { id: 'libellen', name: 'Libellen', kinder: 23, alter: '2–6 J.' },
  { id: 'flamingo', name: 'Flamingo', kinder: 14, alter: '1–3 J.' },
];

const ALL: Day[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

interface RawPerson {
  id: string;
  name: string;
  qual: string;
  fk: boolean;
  soll: number;
  groupId: string;
  workdays: Day[];
  norm: Raw[];
  tue?: Raw[];
  hart?: number[];
  mentorId?: string;
}

const RAW: RawPerson[] = [
  { id: 'carla', name: 'Carla', qual: 'Erzieherin', fk: true, soll: 32, groupId: 'frosch', workdays: ALL,
    norm: [[8, 11.5, 'betreuung'], [11.5, 12, 'pause'], [12, 14.5, 'betreuung']],
    tue: [[8, 9, 'betreuung'], [9, 11, 'anleitung'], [11, 11.5, 'betreuung'], [11.5, 12, 'pause'], [12, 14.5, 'betreuung']] },
  { id: 'tina', name: 'Tina', qual: 'Sozialassistentin', fk: false, soll: 30, groupId: 'frosch', workdays: ALL,
    norm: [[7, 10, 'betreuung'], [10, 10.5, 'pause'], [10.5, 13.5, 'betreuung']] },
  { id: 'selin', name: 'Selin', qual: 'Hilfskraft', fk: false, soll: 25, groupId: 'frosch', workdays: ALL,
    norm: [[9, 11.5, 'betreuung'], [11.5, 12, 'pause'], [12, 14, 'betreuung']] },
  { id: 'jonas', name: 'Jonas', qual: 'PiVA, 2. Jahr', fk: false, soll: 15, groupId: 'frosch', workdays: ['Mo', 'Di'], mentorId: 'carla',
    norm: [[8, 11.5, 'betreuung'], [11.5, 12, 'pause'], [12, 15.5, 'betreuung']],
    tue: [[8, 9, 'betreuung'], [9, 11, 'anleitung'], [11, 13, 'betreuung'], [13, 13.5, 'pause'], [13.5, 15.75, 'betreuung']] },
  { id: 'heike', name: 'Heike', qual: 'Erzieherin', fk: true, soll: 34, groupId: 'libellen', workdays: ['Mo', 'Di', 'Do', 'Fr'],
    norm: [[7.5, 12, 'betreuung'], [12, 12.5, 'pause'], [12.5, 16.5, 'betreuung']],
    tue: [[7.5, 12, 'betreuung'], [12, 12.5, 'pause'], [12.5, 14.25, 'betreuung'], [14.25, 15.75, 'besprechung'], [15.75, 16.5, 'betreuung']] },
  { id: 'doris', name: 'Doris', qual: 'Erzieherin', fk: true, soll: 30, groupId: 'libellen', workdays: ['Di', 'Mi', 'Do', 'Fr'],
    norm: [[8, 12, 'betreuung'], [12, 12.5, 'pause'], [12.5, 16, 'betreuung']],
    tue: [[8, 12, 'betreuung'], [12, 12.5, 'pause'], [12.5, 14.25, 'betreuung'], [14.25, 15.75, 'besprechung'], [15.75, 16, 'betreuung']] },
  { id: 'frauke', name: 'Frauke', qual: 'Erzieherin', fk: true, soll: 30, groupId: 'libellen', workdays: ALL,
    norm: [[7, 10, 'betreuung'], [10, 10.5, 'pause'], [10.5, 13, 'betreuung']] },
  { id: 'olga', name: 'Olga', qual: 'Erzieherin', fk: true, soll: 17, groupId: 'libellen', workdays: ['Mo', 'Di', 'Mi'],
    norm: [[8, 11, 'betreuung'], [11, 11.5, 'pause'], [11.5, 14, 'betreuung']] },
  { id: 'waltraud', name: 'Waltraud', qual: 'Erzieherin (Rentnerin)', fk: true, soll: 6, groupId: 'libellen', workdays: ['Mi', 'Do'],
    norm: [[9, 12, 'betreuung']] },
  { id: 'lena', name: 'Lena', qual: 'Kinderpflegerin', fk: false, soll: 39, groupId: 'libellen', workdays: ALL,
    norm: [[7.5, 12, 'betreuung'], [12, 12.5, 'pause'], [12.5, 15.75, 'betreuung']],
    tue: [[7.5, 12, 'betreuung'], [12, 12.5, 'pause'], [12.5, 14.25, 'betreuung'], [14.25, 15.75, 'besprechung']] },
  { id: 'esther', name: 'Esther', qual: 'Erzieherin · Anleitung Aylin', fk: true, soll: 25, groupId: 'flamingo', workdays: ALL,
    norm: [[8, 13, 'betreuung']], hart: [0],
    tue: [[8, 11, 'betreuung'], [11, 13, 'anleitung']] },
  { id: 'maren', name: 'Maren', qual: 'Erzieherin', fk: true, soll: 30, groupId: 'flamingo', workdays: ALL,
    norm: [[8, 11.5, 'betreuung'], [11.5, 12, 'pause'], [12, 14.5, 'betreuung']] },
  { id: 'bettina', name: 'Bettina', qual: 'Kinderpflegerin', fk: false, soll: 18, groupId: 'flamingo', workdays: ['Di', 'Mi', 'Do'],
    norm: [[9, 12, 'betreuung'], [12, 12.5, 'pause'], [12.5, 15.5, 'betreuung']],
    tue: [[9, 12, 'betreuung'], [12, 12.5, 'pause'], [12.5, 14.25, 'betreuung'], [14.25, 15.5, 'besprechung']] },
  { id: 'aylin', name: 'Aylin', qual: 'PiVA, letztes Jahr', fk: false, soll: 15, groupId: 'flamingo', workdays: ['Mo', 'Di'], mentorId: 'esther',
    norm: [[8, 11.5, 'betreuung'], [11.5, 12, 'pause'], [12, 15.5, 'betreuung']],
    tue: [[8, 11, 'betreuung'], [11, 13, 'anleitung'], [13, 13.5, 'pause'], [13.5, 15.5, 'betreuung']] },
  { id: 'nora', name: 'Nora', qual: 'Erzieherin · stellv. Leitung', fk: true, soll: 39, groupId: 'flamingo', workdays: ALL,
    norm: [[7.5, 12, 'betreuung'], [12, 12.5, 'pause'], [12.5, 16, 'betreuung']],
    tue: [[7.5, 12, 'betreuung'], [12, 12.5, 'pause'], [12.5, 14.25, 'betreuung'], [14.25, 15.75, 'besprechung'], [15.75, 16, 'betreuung']] },
];

function toBlocks(personId: string, prefix: string, raw: Raw[], hart: number[] = []): Block[] {
  return raw.map(([start, end, type], i) => ({
    id: `${personId}-${prefix}${i}`,
    start,
    end,
    type,
    verb: hart.includes(i) ? 'hart' : 'weich',
  }));
}

export function defaultSettings(): Settings {
  return {
    kitaName: 'Kita Sonnenblume (fiktiv)',
    open: 7,
    close: 16.5,
    minFachkraefte: 1,
    randzeiten: [
      { start: 7, end: 7.5, minPersonen: 2 },
      { start: 15, end: 16.5, minPersonen: 2 },
    ],
    pausen: [
      { abStunden: 6, minuten: 30 },
      { abStunden: 9, minuten: 45 },
    ],
    maxAmStueck: 6,
    hinweisArbeitszeit: 8,
    besprechungsTag: 'Di',
    showPausenstaffel: true,
  };
}

export function seedData(now = new Date().toISOString()): AppData {
  const persons: Person[] = RAW.map((r) => ({
    id: r.id,
    name: r.name,
    qual: r.qual,
    fk: r.fk,
    groupId: r.groupId,
    soll: r.soll,
    workdays: [...r.workdays],
    normBlocks: toBlocks(r.id, 'n', r.norm, r.hart),
    tueBlocks: r.tue ? toBlocks(r.id, 't', r.tue) : null,
    mentorId: r.mentorId ?? '',
    notiz: '',
  }));

  // Geltender Plan = aus den Profilen erzeugt, mit einer Abweichung wie im Prototyp:
  // Frauke arbeitet dienstags derzeit 7:30–13:30 statt ihrer Normalzeit 7:00–13:00.
  const geltend = planFromProfiles(persons, now);
  geltend.blocks.frauke.Di = toBlocks('frauke', 'g', [[7.5, 10.5, 'betreuung'], [10.5, 11, 'pause'], [11, 13.5, 'betreuung']]);

  // Testfassung = geltender Plan, aber Frauke wieder auf Normalzeit (behebt den Frühdienst-Verstoß).
  const test = planFromProfiles(persons, now);

  return {
    version: 1,
    settings: defaultSettings(),
    groups: GROUPS.map((g) => ({ ...g })),
    persons,
    plans: { geltend, test },
    meta: { lastBackup: null, beispieldaten: true },
  };
}

export function emptyData(now = new Date().toISOString()): AppData {
  return {
    version: 1,
    settings: { ...defaultSettings(), kitaName: 'Meine Kita' },
    groups: [{ id: 'g1', name: 'Gruppe 1', kinder: 0, alter: '' }],
    persons: [],
    plans: { geltend: { blocks: {}, since: now }, test: null },
    meta: { lastBackup: null, beispieldaten: false },
  };
}
