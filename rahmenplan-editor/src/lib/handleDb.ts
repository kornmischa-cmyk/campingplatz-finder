// Merkt sich den zuletzt gewählten Datenordner (der Ordner-Zugriff selbst lässt sich in IndexedDB ablegen).
import type { DirHandleLike } from './fileStore';

const DB = 'rahmenplan-editor';
const STORE = 'handles';
const KEY = 'datenordner';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

export async function loadDirHandle(): Promise<DirHandleLike | null> {
  try {
    return ((await run<DirHandleLike | undefined>('readonly', (s) => s.get(KEY))) ?? null);
  } catch {
    return null;
  }
}

export async function saveDirHandle(h: DirHandleLike): Promise<void> {
  try {
    await run('readwrite', (s) => s.put(h, KEY));
  } catch {
    // ohne Merker geht es auch – dann muss der Ordner beim nächsten Start neu gewählt werden
  }
}

export async function forgetDirHandle(): Promise<void> {
  try {
    await run('readwrite', (s) => s.delete(KEY));
  } catch {
    /* egal */
  }
}
