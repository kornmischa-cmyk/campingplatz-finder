// Speicher-Backends: Plandatei in einem Ordner (File System Access API, Edge/Chrome)
// oder – als Rückfall – der Browserspeicher.
//
// Mehrere Personen: Vor jedem Schreiben wird geprüft, ob die Datei seit dem letzten Laden/Speichern
// von außen geändert wurde (Zeitstempel). Dann wird NICHT überschrieben, sondern ein Konflikt gemeldet.

export const DATA_FILE = 'rahmenplan-daten.json';
export const BACKUP_DIR = 'Sicherungen';
export const KEEP_BACKUPS = 30;

export type SaveResult = 'ok' | 'conflict';

export interface Backend {
  kind: 'file' | 'browser' | 'demo';
  /** Für die Anzeige: wo liegen die Daten? */
  label: string;
  /** Speichert; liefert 'conflict', wenn die Quelle seit dem letzten Laden/Speichern von außen geändert wurde. */
  save(text: string, opts?: { force?: boolean }): Promise<SaveResult>;
  /** Neuer Inhalt, falls die Quelle von außen geändert wurde; sonst null. Übernimmt den neuen Stand als „bekannt“. */
  readIfChanged(): Promise<string | null>;
  /** Aktuellen Inhalt lesen (und als „bekannt“ übernehmen); null, wenn es keinen gibt. */
  readNow(): Promise<string | null>;
  /** Kopie in den Sicherungsordner (nur Datei-Backend). */
  backupCopy?(text: string, suffix: string): Promise<void>;
  /** Zugriff erneut anfragen (muss aus einem Klick heraus aufgerufen werden). */
  reconnect?(): Promise<boolean>;
}

// ---- minimale Typen der File System Access API (nur was wir brauchen; erleichtert Tests mit Fakes) ----

export interface FileLike {
  lastModified: number;
  text(): Promise<string>;
}
export interface WritableLike {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
export interface FileHandleLike {
  kind: 'file';
  name: string;
  getFile(): Promise<FileLike>;
  createWritable(): Promise<WritableLike>;
}
export interface DirHandleLike {
  kind: 'directory';
  name: string;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandleLike>;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandleLike>;
  removeEntry(name: string): Promise<void>;
  keys(): AsyncIterable<string>;
  queryPermission?(opts: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission?(opts: { mode: 'readwrite' }): Promise<PermissionState>;
}

export function fileApiSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickDirectory(): Promise<DirHandleLike> {
  const w = window as unknown as { showDirectoryPicker(o: object): Promise<DirHandleLike> };
  return w.showDirectoryPicker({ id: 'rahmenplan', mode: 'readwrite', startIn: 'documents' });
}

/** true, wenn Lese-/Schreibzugriff besteht; fragt bei Bedarf nach (nur aus einem Klick heraus). */
export async function ensurePermission(dir: DirHandleLike, ask: boolean): Promise<boolean> {
  if (!dir.queryPermission) return true;
  if ((await dir.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
  if (!ask || !dir.requestPermission) return false;
  return (await dir.requestPermission({ mode: 'readwrite' })) === 'granted';
}

function isNotFound(e: unknown): boolean {
  return e instanceof DOMException ? e.name === 'NotFoundError' : (e as { name?: string })?.name === 'NotFoundError';
}

/** Inhalt der Plandatei im Ordner, oder null, wenn es (noch) keine gibt. */
export async function readDataFile(dir: DirHandleLike): Promise<{ text: string; mtime: number } | null> {
  try {
    const f = await (await dir.getFileHandle(DATA_FILE)).getFile();
    return { text: await f.text(), mtime: f.lastModified };
  } catch (e) {
    if (isNotFound(e)) return null;
    throw e;
  }
}

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export class FileBackend implements Backend {
  kind = 'file' as const;
  label: string;
  private known: number | null;
  private lastBackupDay: string | null = null;

  constructor(
    private dir: DirHandleLike,
    knownMtime: number | null,
    private now: () => Date = () => new Date(),
  ) {
    this.known = knownMtime;
    this.label = `${dir.name}\\${DATA_FILE}`;
  }

  async save(text: string, opts: { force?: boolean } = {}): Promise<SaveResult> {
    const fh = await this.dir.getFileHandle(DATA_FILE, { create: true });
    const cur = await fh.getFile();
    // Datei existierte vorher nicht (known = null) → neu anlegen ist ok, solange sie noch leer ist
    const externallyChanged = this.known === null ? cur.lastModified !== 0 && (await cur.text()).length > 0 : cur.lastModified !== this.known;
    if (externallyChanged && !opts.force) return 'conflict';
    const w = await fh.createWritable();
    await w.write(text);
    await w.close();
    this.known = (await fh.getFile()).lastModified;
    await this.dailyBackup(text);
    return 'ok';
  }

  async readIfChanged(): Promise<string | null> {
    const r = await readDataFile(this.dir);
    if (!r || r.mtime === this.known) return null;
    this.known = r.mtime;
    return r.text;
  }

  async readNow(): Promise<string | null> {
    const r = await readDataFile(this.dir);
    this.known = r ? r.mtime : null;
    return r ? r.text : null;
  }

  async backupCopy(text: string, suffix: string): Promise<void> {
    const d = await this.dir.getDirectoryHandle(BACKUP_DIR, { create: true });
    const t = this.now();
    const time = [t.getHours(), t.getMinutes(), t.getSeconds()].map((n) => String(n).padStart(2, '0')).join('');
    await writeFile(d, `rahmenplan-${stamp(t)}-${time}-${suffix}.json`, text);
  }

  async reconnect(): Promise<boolean> {
    return ensurePermission(this.dir, true);
  }

  /** Eine Kopie pro Tag (erster Speicherstand des Tages); ältere als KEEP_BACKUPS Tageskopien werden gelöscht. */
  private async dailyBackup(text: string): Promise<void> {
    const day = stamp(this.now());
    if (this.lastBackupDay === day) return;
    const d = await this.dir.getDirectoryHandle(BACKUP_DIR, { create: true });
    const name = `rahmenplan-${day}.json`;
    const names: string[] = [];
    for await (const k of d.keys()) names.push(k);
    if (!names.includes(name)) {
      await writeFile(d, name, text);
      names.push(name);
    }
    this.lastBackupDay = day;
    const daily = names.filter((n) => /^rahmenplan-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
    for (const old of daily.slice(0, Math.max(0, daily.length - KEEP_BACKUPS))) await d.removeEntry(old);
  }
}

async function writeFile(dir: DirHandleLike, name: string, text: string): Promise<void> {
  const w = await (await dir.getFileHandle(name, { create: true })).createWritable();
  await w.write(text);
  await w.close();
}

/** Rückfall ohne Datei-Zugriff (z. B. Firefox/Safari): Browserspeicher. */
export class BrowserBackend implements Backend {
  kind = 'browser' as const;
  label = 'Browserspeicher';
  private last: string | null;
  constructor(private key: string) {
    this.last = safeGet(key);
  }
  async save(text: string): Promise<SaveResult> {
    localStorage.setItem(this.key, text);
    this.last = text;
    return 'ok';
  }
  async readIfChanged(): Promise<string | null> {
    const cur = safeGet(this.key);
    if (cur === null || cur === this.last) return null;
    this.last = cur;
    return cur;
  }
  async readNow(): Promise<string | null> {
    this.last = safeGet(this.key);
    return this.last;
  }
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Nur ansehen: speichert nichts. */
export class DemoBackend implements Backend {
  kind = 'demo' as const;
  label = 'Beispieldaten (wird nicht gespeichert)';
  async save(): Promise<SaveResult> {
    return 'ok';
  }
  async readIfChanged(): Promise<string | null> {
    return null;
  }
  async readNow(): Promise<string | null> {
    return null;
  }
}
