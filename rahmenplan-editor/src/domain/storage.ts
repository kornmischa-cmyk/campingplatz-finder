// Persistenz im localStorage + Prüfung von importierten Sicherungsdateien.
import type { AppData, Block, Day, Person, Plan } from './types';
import { BLOCK_TYPES, DAYS } from './types';
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
  return checkBlocks(p.normBlocks, `${w} (${p.name}), Normalzeiten`) ?? (p.tueBlocks === null ? null : checkBlocks(p.tueBlocks, `${w} (${p.name}), Dienstag`));
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
  const meta = isObj(obj.meta) ? obj.meta : {};
  return {
    version: 1,
    // fehlende (neuere) Einstellungen mit Standardwerten auffüllen
    settings: { ...defaultSettings(), ...(s as Partial<AppData['settings']>) },
    groups: obj.groups as AppData['groups'],
    persons: obj.persons as Person[],
    plans: { geltend: obj.plans.geltend as Plan, test: obj.plans.test as Plan | null },
    meta: {
      lastBackup: isStr(meta.lastBackup) ? meta.lastBackup : null,
      beispieldaten: meta.beispieldaten === true,
    },
  };
}
