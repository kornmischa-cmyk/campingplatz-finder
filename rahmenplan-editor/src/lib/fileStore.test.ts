import { describe, expect, it } from 'vitest';
import { BACKUP_DIR, DATA_FILE, FileBackend, KEEP_BACKUPS, readDataFile, type DirHandleLike, type FileHandleLike } from './fileStore';

/** Ordner im Speicher, der die genutzten Teile der File System Access API nachbildet. */
class FakeDir implements DirHandleLike {
  kind = 'directory' as const;
  files = new Map<string, { text: string; mtime: number }>();
  dirs = new Map<string, FakeDir>();
  clock = 1000;
  constructor(public name: string) {}
  tick() {
    return ++this.clock;
  }
  async getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandleLike> {
    if (!this.files.has(name)) {
      if (!opts?.create) throw Object.assign(new Error('nf'), { name: 'NotFoundError' });
      this.files.set(name, { text: '', mtime: this.tick() });
    }
    return {
      kind: 'file',
      name,
      getFile: async () => {
        const f = this.files.get(name)!;
        return { lastModified: f.mtime, text: async () => f.text };
      },
      createWritable: async () => {
        let buf = '';
        return {
          write: async (d: string) => {
            buf += d;
          },
          close: async () => {
            this.files.set(name, { text: buf, mtime: this.tick() });
          },
        };
      },
    };
  }
  async getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandleLike> {
    if (!this.dirs.has(name)) {
      if (!opts?.create) throw Object.assign(new Error('nf'), { name: 'NotFoundError' });
      this.dirs.set(name, new FakeDir(name));
    }
    return this.dirs.get(name)!;
  }
  async removeEntry(name: string) {
    this.files.delete(name);
  }
  async *keys() {
    yield* this.files.keys();
  }
  /** Simuliert eine andere Person, die die Datei speichert */
  externalWrite(text: string) {
    this.files.set(DATA_FILE, { text, mtime: this.tick() });
  }
}

const day = (d: number) => () => new Date(2026, 10, d, 9, 30, 0);

describe('FileBackend', () => {
  it('legt die Plandatei an und liest sie wieder', async () => {
    const dir = new FakeDir('Rahmenplan');
    const b = new FileBackend(dir, null, day(14));
    expect(await b.save('A')).toBe('ok');
    expect((await readDataFile(dir))!.text).toBe('A');
    expect(b.label).toBe('Rahmenplan\\' + DATA_FILE);
  });

  it('überschreibt keine Änderung einer anderen Person', async () => {
    const dir = new FakeDir('R');
    const me = new FileBackend(dir, null, day(14));
    await me.save('meins-1');
    dir.externalWrite('von-anderer-person');
    expect(await me.save('meins-2')).toBe('conflict');
    expect((await readDataFile(dir))!.text).toBe('von-anderer-person');
    // bewusst überschreiben
    expect(await me.save('meins-2', { force: true })).toBe('ok');
    expect((await readDataFile(dir))!.text).toBe('meins-2');
  });

  it('zwei Instanzen: die zweite bekommt einen Konflikt, nach dem Neuladen geht es weiter', async () => {
    const dir = new FakeDir('R');
    const a = new FileBackend(dir, null, day(14));
    await a.save('start');
    const b = new FileBackend(dir, (await readDataFile(dir))!.mtime, day(14));
    expect(await a.save('a1')).toBe('ok');
    expect(await b.save('b1')).toBe('conflict');
    expect(await b.readNow()).toBe('a1');
    expect(await b.save('b2')).toBe('ok');
    expect(await a.readIfChanged()).toBe('b2');
    expect(await a.readIfChanged()).toBeNull();
  });

  it('erkennt beim Anlegen eine bereits vorhandene Plandatei', async () => {
    const dir = new FakeDir('R');
    dir.externalWrite('schon-da');
    const b = new FileBackend(dir, null, day(14));
    expect(await b.save('neu')).toBe('conflict');
  });

  it('eine Tageskopie pro Tag, ältere werden aufgeräumt', async () => {
    const dir = new FakeDir('R');
    let d = 1;
    const b = new FileBackend(dir, null, () => new Date(2026, 0, d, 8));
    await b.save('t1');
    await b.save('t1-spaeter');
    const backups = () => [...dir.dirs.get(BACKUP_DIR)!.files.keys()].sort();
    expect(backups()).toEqual(['rahmenplan-2026-01-01.json']);
    expect(dir.dirs.get(BACKUP_DIR)!.files.get('rahmenplan-2026-01-01.json')!.text).toBe('t1');
    for (d = 2; d <= KEEP_BACKUPS + 5; d++) await b.save('t' + d);
    expect(backups()).toHaveLength(KEEP_BACKUPS);
    expect(backups()[0]).toBe('rahmenplan-2026-01-06.json');
  });

  it('Konfliktkopien landen mit Uhrzeit in den Sicherungen und werden nicht aufgeräumt', async () => {
    const dir = new FakeDir('R');
    const b = new FileBackend(dir, null, day(14));
    await b.backupCopy('x', 'ueberschrieben');
    expect([...dir.dirs.get(BACKUP_DIR)!.files.keys()]).toEqual(['rahmenplan-2026-11-14-093000-ueberschrieben.json']);
  });
});
