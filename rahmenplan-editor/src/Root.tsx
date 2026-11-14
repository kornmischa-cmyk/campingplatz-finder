import { useEffect, useRef, useState } from 'react';
import type { AppData } from './domain/types';
import { emptyData, seedData } from './domain/seed';
import { parseBackup, STORAGE_KEY } from './domain/storage';
import {
  BrowserBackend,
  DemoBackend,
  FileBackend,
  DATA_FILE,
  ensurePermission,
  fileApiSupported,
  pickDirectory,
  readDataFile,
  type Backend,
  type DirHandleLike,
} from './lib/fileStore';
import { forgetDirHandle, loadDirHandle, saveDirHandle } from './lib/handleDb';
import { serialize } from './state/store';
import { fmtDate } from './lib/download';
import { App } from './App';

type Phase =
  | { kind: 'checking' }
  | { kind: 'start'; remembered: DirHandleLike | null; error?: string }
  | { kind: 'new'; dir: DirHandleLike | null }
  | { kind: 'running'; data: AppData; backend: Backend; info?: string };

function browserData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const r = parseBackup(raw);
    return typeof r === 'string' ? null : r;
  } catch {
    return null;
  }
}

function errorText(e: unknown): string | null {
  const name = (e as { name?: string })?.name;
  if (name === 'AbortError') return null; // Dialog abgebrochen
  if (name === 'SecurityError' || name === 'NotAllowedError')
    return 'Auf diesen Ordner darf der Browser nicht zugreifen. Lege einen eigenen Unterordner an, z. B. „Dokumente\\Rahmenplan“, und wähle ihn aus.';
  return 'Der Ordner konnte nicht geöffnet werden.';
}

export function Root() {
  const supported = fileApiSupported();
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' });
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supported) {
      // Rückfall: Browserspeicher (Firefox, Safari)
      const d = browserData();
      if (d) setPhase({ kind: 'running', data: d, backend: new BrowserBackend(STORAGE_KEY) });
      else setPhase({ kind: 'new', dir: null });
      return;
    }
    loadDirHandle().then((h) => setPhase({ kind: 'start', remembered: h }));
  }, [supported]);

  const run = (data: AppData, backend: Backend, info?: string) => {
    setSession((s) => s + 1);
    setPhase({ kind: 'running', data, backend, info });
  };

  const openDir = async (dir: DirHandleLike, ask: boolean) => {
    setBusy(true);
    try {
      if (!(await ensurePermission(dir, ask))) {
        setPhase({ kind: 'start', remembered: dir, error: 'Ohne Zugriff auf den Ordner kann nicht gespeichert werden.' });
        return;
      }
      const file = await readDataFile(dir);
      if (!file) {
        setPhase({ kind: 'new', dir });
        return;
      }
      const res = parseBackup(file.text);
      if (typeof res === 'string') {
        setPhase({ kind: 'start', remembered: dir, error: `Die Plandatei im Ordner „${dir.name}“ ist beschädigt: ${res} Im Unterordner „Sicherungen“ liegen Tageskopien.` });
        return;
      }
      await saveDirHandle(dir);
      run(res, new FileBackend(dir, file.mtime), `Plandatei aus „${dir.name}“ geladen.`);
    } catch (e) {
      const msg = errorText(e);
      setPhase({ kind: 'start', remembered: dir, error: msg ?? undefined });
    } finally {
      setBusy(false);
    }
  };

  const choose = async () => {
    try {
      const dir = await pickDirectory();
      await openDir(dir, true);
    } catch (e) {
      const msg = errorText(e);
      if (msg) setPhase((p) => ({ kind: 'start', remembered: p.kind === 'start' ? p.remembered : null, error: msg }));
    }
  };

  const create = async (dir: DirHandleLike | null, data: AppData) => {
    if (!dir) {
      const b = new BrowserBackend(STORAGE_KEY);
      await b.save(serialize(data));
      run(data, b);
      return;
    }
    setBusy(true);
    try {
      const b = new FileBackend(dir, null);
      if ((await b.save(serialize(data))) === 'conflict') {
        // jemand hat genau jetzt eine Plandatei angelegt → die nehmen
        await openDir(dir, false);
        return;
      }
      await saveDirHandle(dir);
      run(data, b, `Plandatei „${DATA_FILE}“ in „${dir.name}“ angelegt. Jede Änderung wird dort automatisch gespeichert.`);
    } catch (e) {
      setPhase({ kind: 'start', remembered: dir, error: errorText(e) ?? undefined });
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (dir: DirHandleLike | null, f: File | undefined) => {
    if (!f) return;
    const res = parseBackup(await f.text());
    if (importRef.current) importRef.current.value = '';
    if (typeof res === 'string') {
      alert(res);
      return;
    }
    await create(dir, { ...res, meta: { ...res.meta, beispieldaten: false } });
  };

  if (phase.kind === 'running') {
    return (
      <App
        key={session}
        initial={phase.data}
        backend={phase.backend}
        startInfo={phase.info}
        onChangeStorage={
          supported
            ? () => {
                setPhase({ kind: 'start', remembered: null });
                loadDirHandle().then((h) => setPhase({ kind: 'start', remembered: h }));
              }
            : undefined
        }
      />
    );
  }

  if (phase.kind === 'checking') return null;

  const old = browserData();
  return (
    <div className="app start">
      <header className="head">
        <div>
          <div className="kicker">Kita-Personalplanung</div>
          <h1>Rahmenplan</h1>
        </div>
      </header>

      {phase.kind === 'start' && (
        <div className="start-grid">
          {phase.error && (
            <div className="banner bad" role="alert" style={{ gridColumn: '1 / -1' }}>
              {phase.error}
            </div>
          )}
          {phase.remembered && (
            <div className="card start-card primary-card">
              <h2>Weiterarbeiten</h2>
              <p>
                Mit der Plandatei im Ordner <strong>„{phase.remembered.name}“</strong>. Der Browser fragt eventuell einmal, ob er auf den Ordner zugreifen
                darf.
              </p>
              <button className="cta" disabled={busy} onClick={() => openDir(phase.remembered!, true)}>
                Weiter mit „{phase.remembered.name}“
              </button>
            </div>
          )}
          <div className="card start-card">
            <h2>{phase.remembered ? 'Anderen Ordner wählen' : 'Ordner für die Plandaten wählen'}</h2>
            <p>
              Der Plan wird als Datei in einem Ordner auf diesem Rechner gespeichert, automatisch bei jeder Änderung. Liegt dort schon eine Plandatei,
              wird sie geöffnet, sonst legen wir eine neue an.
            </p>
            <ul className="hint-list">
              <li>Lege am besten einen eigenen Ordner an, z. B. <strong>Dokumente\Rahmenplan</strong>.</li>
              <li>
                Arbeiten mehrere Personen mit <strong>eigenem Windows-Konto</strong> an diesem Rechner, nimm einen Ordner unter{' '}
                <strong>„Öffentliche Dokumente“</strong>, damit alle ihn sehen.
              </li>
              <li>Im Ordner entsteht „{DATA_FILE}“ und ein Unterordner „Sicherungen“ mit einer Kopie pro Tag.</li>
            </ul>
            <button className={phase.remembered ? 'pill' : 'cta'} disabled={busy} onClick={choose}>
              Ordner wählen …
            </button>
            {phase.remembered && (
              <button
                className="linkbtn muted"
                style={{ marginLeft: 12 }}
                onClick={async () => {
                  await forgetDirHandle();
                  setPhase({ kind: 'start', remembered: null });
                }}
              >
                Gemerkten Ordner vergessen
              </button>
            )}
          </div>
          <div className="card start-card">
            <h2>Nur ausprobieren</h2>
            <p>Die fiktive „Kita Sonnenblume“ ansehen und herumprobieren. Es wird nichts gespeichert.</p>
            <button className="pill" onClick={() => run(seedData(), new DemoBackend())}>
              Beispiel öffnen
            </button>
          </div>
        </div>
      )}

      {phase.kind === 'new' && (
        <div className="start-grid">
          {!phase.dir && (
            <div className="banner warn" style={{ gridColumn: '1 / -1' }}>
              Dieser Browser kann nicht direkt in eine Datei speichern. Die Daten bleiben nur in diesem Browser. Am besten mit Microsoft Edge oder Google
              Chrome öffnen; sonst regelmäßig unter „Einstellungen → Daten“ eine Sicherung exportieren.
            </div>
          )}
          <div className="card start-card primary-card">
            <h2>Neu beginnen</h2>
            <p>
              {phase.dir ? (
                <>
                  Im Ordner <strong>„{phase.dir.name}“</strong> liegt noch keine Plandatei. Wir legen eine an.
                </>
              ) : (
                'Leerer Plan mit einer Gruppe.'
              )}{' '}
              Danach: Kita und Gruppen einrichten, Personal anlegen, einplanen.
            </p>
            <button className="cta" disabled={busy} onClick={() => create(phase.dir, emptyData())}>
              Leeren Plan anlegen
            </button>
          </div>
          {old && !old.meta.beispieldaten && (
            <div className="card start-card">
              <h2>Bisherige Daten übernehmen</h2>
              <p>
                In diesem Browser liegen noch Daten aus der früheren Version ({old.persons.length} Personen, geltend seit {fmtDate(old.plans.geltend.since)}).
              </p>
              <button className="pill" disabled={busy} onClick={() => create(phase.dir, old)}>
                Übernehmen
              </button>
            </div>
          )}
          <div className="card start-card">
            <h2>Sicherung einspielen</h2>
            <p>Eine exportierte Sicherungsdatei (.json) als Startstand verwenden.</p>
            <button className="pill" disabled={busy} onClick={() => importRef.current?.click()}>
              Sicherung wählen …
            </button>
            <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(phase.dir, e.target.files?.[0])} />
          </div>
          <div className="card start-card">
            <h2>Mit Beispieldaten</h2>
            <p>Die fiktive „Kita Sonnenblume“ als Startstand – zum Üben. Lässt sich später unter „Einstellungen“ ersetzen.</p>
            <button className="pill" disabled={busy} onClick={() => create(phase.dir, seedData())}>
              Beispieldaten anlegen
            </button>
          </div>
          {phase.dir && (
            <div style={{ gridColumn: '1 / -1' }}>
              <button className="linkbtn muted" onClick={() => setPhase({ kind: 'start', remembered: null })}>
                ← Anderen Ordner wählen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
