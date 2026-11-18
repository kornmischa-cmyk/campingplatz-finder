// Persistenz im localStorage + Prüfung von importierten Sicherungsdateien.
import type { AppData, Block, Day, Person, Plan, Termin, TerminTyp, Abwesenheit } from './types';
import { BLOCK_TYPES, DAYS, TYPE_LABEL } from './types';
import { defaultSettings } from './seed';

export const STORAGE_KEY = 'rahmenplan-editor/v1';

export function loadLocal(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const res = parseBackup(raw);
    return typeof res === 'string' ? null : res;
  } catch {
    return null;
  }
}

/** true = gespeichert; false = Speicher nicht verfügbar (z. B. gesperrt oder voll) */
export function saveLocal(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function toBackup(data: AppData): string {
  return JSON.stringify({ app: 'rahmenplan-editor', ...data }, null, 2);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isDay = (v: unknown): v is Day => DAYS.includes(v as Day);

function checkBlock(b: unknown, where: string): string | null {
  if (!isObj(b)) return `${where}: kein gültiger Block`;
  if (!isStr(b.id) || !isNum(b.start) || !isNum(b.end)) return `${where}: Block ohne ID oder Zeiten`;
  if (!BLOCK_TYPES.includes(b.type as Block['type'])) return `${where}: unbekannter Blocktyp „${String(b.type)}“`;
  if (b.verb !== 'hart' && b.verb !== 'weich') return `${where}: ungültige Verbindlichkeit`;
  return null;
}

function checkBlocks(v: unknown, where: string): string | null {
  if (!Array.isArray(v)) return `${where}: Blockliste fehlt`;
  for (let i = 0; i < v.length; i++) {
    const e = checkBlock(v[i], `${where}, Block ${i + 1}`);
    if (e) return e;
  }
  return null;
}

function checkPlan(v: unknown, where: string): string | null {
  if (!isObj(v) || !isObj(v.blocks) || !isStr(v.since)) return `${where} fehlt oder ist beschädigt`;
  for (const [pid, days] of Object.entries(v.blocks)) {
    if (!isObj(days)) return `${where}: Eintrag für ${pid} ist beschädigt`;
    for (const [d, bl] of Object.entries(days)) {
      if (!isDay(d)) return `${where}: unbekannter Tag „${d}“`;
      const e = checkBlocks(bl, `${where}, ${pid} ${d}`);
      if (e) return e;
    }
  }
  return null;
}

function checkPerson(p: unknown, i: number): string | null {
  const w = `Person ${i + 1}`;
  if (!isObj(p)) return `${w}: beschädigt`;
  if (!isStr(p.id) || !isStr(p.name) || !isStr(p.qual) || !isStr(p.groupId) || !isStr(p.mentorId) || !isStr(p.notiz))
    return `${w}: Textfelder fehlen`;
  if (typeof p.fk !== 'boolean' || !isNum(p.soll)) return `${w}: Fachkraft oder Soll-Stunden fehlen`;
  if (!Array.isArray(p.workdays) || !p.workdays.every(isDay)) return `${w}: Arbeitstage ungültig`;
  if (p.dienste !== undefined) {
    const ds = p.dienste;
    const okV = (v: unknown) => isObj(v) && isNum(v.min) && (v.max === null || isNum(v.max)) && Array.isArray(v.days) && v.days.every(isDay);
    if (!isObj(ds) || !okV(ds.frueh) || !okV(ds.spaet)) return `${w}: Früh-/Spätdienst-Vorgaben ungültig`;
  }
  return checkBlocks(p.normBlocks, `${w} (${p.name}), Normalzeiten`) ?? (p.tueBlocks == null ? null : checkBlocks(p.tueBlocks, `${w} (${p.name}), Dienstag`));
}

/** Liefert die Daten oder eine verständliche Fehlermeldung. */
export function parseBackup(text: string): AppData | string {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return 'Die Datei ist keine gültige Sicherung (kein JSON).';
  }
  if (!isObj(obj)) return 'Die Datei ist keine gültige Sicherung.';
  if (obj.version !== 1) return 'Die Sicherung stammt aus einer unbekannten Version des Editors.';
  const s = obj.settings;
  if (!isObj(s) || !isNum(s.open) || !isNum(s.close) || !isNum(s.minFachkraefte) || !Array.isArray(s.randzeiten) || !Array.isArray(s.pausen))
    return 'Einstellungen fehlen oder sind beschädigt.';
  if (!Array.isArray(obj.groups) || !obj.groups.every((g) => isObj(g) && isStr(g.id) && isStr(g.name)))
    return 'Gruppen fehlen oder sind beschädigt.';
  if (!Array.isArray(obj.persons)) return 'Personalliste fehlt.';
  for (let i = 0; i < obj.persons.length; i++) {
    const e = checkPerson(obj.persons[i], i);
    if (e) return e;
  }
  if (!isObj(obj.plans)) return 'Pläne fehlen.';
  const e1 = checkPlan(obj.plans.geltend, 'Geltender Plan');
  if (e1) return e1;
  if (obj.plans.test !== null) {
    const e2 = checkPlan(obj.plans.test, 'Testfassung');
    if (e2) return e2;
  }
  if (obj.termine !== undefined) {
    if (!Array.isArray(obj.termine)) return 'Termine sind beschädigt.';
    for (const t of obj.termine) {
      if (!isObj(t) || !isStr(t.id) || !isStr(t.name) || !isDay(t.day) || !isNum(t.start) || !isNum(t.end) || !['besprechung', 'anleitung', 'verfuegung'].includes(t.type as string))
        return 'Ein Termin ist beschädigt.';
      if (t.teilnehmer !== 'alle' && !(Array.isArray(t.teilnehmer) && t.teilnehmer.every(isStr))) return 'Teilnehmende eines Termins sind beschädigt.';
    }
  }
  const abwesenheiten: Abwesenheit[] = [];
  if (obj.abwesenheiten !== undefined) {
    if (!Array.isArray(obj.abwesenheiten)) return 'Abwesenheiten sind beschädigt.';
    const isDate = (x: unknown) => isStr(x) && /^\d{4}-\d{2}-\d{2}$/.test(x);
    for (const a of obj.abwesenheiten) {
      if (!isObj(a) || !isStr(a.id) || !isStr(a.personId) || !isDate(a.von) || !isDate(a.bis) || !['urlaub', 'krank', 'fortbildung', 'sonstiges'].includes(a.art as string))
        return 'Eine Abwesenheit ist beschädigt.';
      if ((a.start !== undefined && !isNum(a.start)) || (a.end !== undefined && !isNum(a.end))) return 'Uhrzeit einer Abwesenheit ist beschädigt.';
      const x = a as unknown as Abwesenheit;
      // Bei Krankheit wird keine Notiz gespeichert (Datenschutz)
      abwesenheiten.push(x.art === 'krank' ? { ...x, notiz: undefined } : x);
    }
  }
  const meta = isObj(obj.meta) ? obj.meta : {};
  const migrated = migrateTueBlocks(obj.persons as Person[], (obj.termine as Termin[] | undefined) ?? []);
  return {
    version: 1,
    // fehlende (neuere) Einstellungen mit Standardwerten auffüllen
    settings: sanitizeSettings({ ...defaultSettings(), ...(s as Partial<AppData['settings']>) }),
    groups: obj.groups as AppData['groups'],
    persons: migrated.persons,
    termine: migrated.termine,
    abwesenheiten,
    plans: { geltend: obj.plans.geltend as Plan, test: obj.plans.test as Plan | null },
    meta: {
      lastBackup: isStr(meta.lastBackup) ? meta.lastBackup : null,
      beispieldaten: meta.beispieldaten === true,
    },
  };
}

/**
 * Früher gab es pro Person einen „Dienstag-Sonderfall“. Daraus werden Termine im Rahmenplan:
 * gleiche Besprechungs-/Anleitungs-/Verfügungsblöcke mehrerer Personen werden ein gemeinsamer Termin;
 * nehmen alle teil, die dienstags arbeiten, gilt der Termin für „alle“.
 */
/** Neuere Einstellungen prüfen; Beschädigtes wird verworfen statt den Import zu blockieren */
function sanitizeSettings(st: AppData['settings']): AppData['settings'] {
  const isDate = (x: unknown) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
  const sz = Array.isArray(st.schliesszeiten)
    ? st.schliesszeiten.filter((z) => isObj(z) && isStr(z.id) && isStr(z.name) && isDate(z.von) && isDate(z.bis))
    : [];
  return { ...st, schliesszeiten: sz, feiertage: st.feiertage === 'keine' ? 'keine' : 'HE' };
}

export function migrateTueBlocks(persons: Person[], termine: Termin[]): { persons: Person[]; termine: Termin[] } {
  if (!persons.some((p) => p.tueBlocks)) return { persons, termine };
  const groups = new Map<string, { type: TerminTyp; start: number; end: number; ids: string[] }>();
  for (const p of persons) {
    for (const b of p.tueBlocks ?? []) {
      if (b.type !== 'besprechung' && b.type !== 'anleitung' && b.type !== 'verfuegung') continue;
      if (p.normBlocks.some((n) => n.type === b.type && n.start === b.start && n.end === b.end)) continue;
      const key = `${b.type}|${b.start}|${b.end}`;
      const g = groups.get(key) ?? { type: b.type, start: b.start, end: b.end, ids: [] };
      g.ids.push(p.id);
      groups.set(key, g);
    }
  }
  const tuesdayWorkers = persons.filter((p) => p.workdays.includes('Di')).map((p) => p.id);
  const neu: Termin[] = [...groups.values()].map((g, i) => ({
    id: `migriert-${i + 1}`,
    name: TYPE_LABEL[g.type],
    type: g.type,
    day: 'Di',
    start: g.start,
    end: g.end,
    teilnehmer: tuesdayWorkers.every((id) => g.ids.includes(id)) ? 'alle' : g.ids,
  }));
  return {
    persons: persons.map(({ tueBlocks: _t, ...p }) => p),
    termine: [...termine, ...neu],
  };
}
