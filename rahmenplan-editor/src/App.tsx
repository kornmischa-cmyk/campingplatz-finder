import { useCallback, useEffect, useRef, useState } from 'react';
import type { Day, Variant } from './domain/types';
import { planToCsv } from './domain/csv';
import { emptyData, seedData } from './domain/seed';
import { parseBackup, toBackup } from './domain/storage';
import { fmtShort } from './domain/time';
import { useStore, type SaveStatus } from './state/store';
import type { AppData, Person } from './domain/types';
import type { Backend } from './lib/fileStore';
import { dateStamp, daysSince, downloadText, fmtDate } from './lib/download';
import { PlanView } from './components/PlanView';
import { PersonalView } from './components/PersonalView';
import { ProfileDrawer } from './components/ProfileDrawer';
import { SettingsView } from './components/SettingsView';
import { PrintView } from './components/PrintView';
import { ConfirmDialog, type ConfirmRequest } from './components/ConfirmDialog';

type View = 'plan' | 'personal' | 'settings';
const BACKUP_REMIND_DAYS = 7;

interface Props {
  initial: AppData;
  backend: Backend;
  startInfo?: string;
  /** Anderen Datenordner wählen (nur mit Datei-Zugriff) */
  onChangeStorage?: () => void;
}

function statusText(s: SaveStatus, backend: Backend): string {
  if (backend.kind === 'demo') return 'Beispiel · wird nicht gespeichert';
  switch (s.kind) {
    case 'pending':
      return 'Speichert …';
    case 'saved':
      return backend.kind === 'file'
        ? `Gespeichert${s.at ? ' ' + s.at.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''} · ${backend.label}`
        : 'Nur im Browser gespeichert';
    case 'conflict':
      return 'Nicht gespeichert – Konflikt';
    case 'error':
      return 'Nicht gespeichert!';
  }
}

export function App({ initial, backend, startInfo, onChangeStorage }: Props) {
  const { data, dispatch, status, notice, clearNotice, keepMine, takeTheirs, retry } = useStore(initial, backend);
  const [view, setView] = useState<View>('plan');
  const [variant, setVariant] = useState<Variant>(data.plans.test ? 'test' : 'geltend');
  const [day, setDay] = useState<Day>('Di');
  const [profile, setProfile] = useState<{ initial: Person; isNew: boolean } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const [toast, setToast] = useState<string | null>(startInfo ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (notice) {
      setToast(notice);
      clearNotice();
    }
  }, [notice, clearNotice]);

  const openProfile = useCallback(
    (id: string, el: HTMLElement) => {
      const p = data.persons.find((x) => x.id === id);
      if (!p) return;
      opener.current = el;
      setProfile({ initial: p, isNew: false });
    },
    [data.persons],
  );
  const newPerson = useCallback((p: Person, el: HTMLElement) => {
    opener.current = el;
    setProfile({ initial: p, isNew: true });
  }, []);
  const saveProfile = (p: Person) => {
    if (data.persons.some((x) => x.id === p.id)) dispatch({ type: 'updatePerson', id: p.id, patch: p });
    else dispatch({ type: 'addPerson', person: p });
    setToast(profile?.isNew ? `„${p.name}“ angelegt.` : `„${p.name}“ gespeichert.`);
    closeProfile();
  };
  const closeProfile = useCallback(() => {
    setProfile(null);
    // Fokus an den Auslöser zurückgeben (falls er noch existiert)
    const el = opener.current;
    requestAnimationFrame(() => el?.isConnected && el.focus());
  }, []);

  const slug = data.settings.kitaName.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, '') || 'kita';

  const backup = () => {
    dispatch({ type: 'markBackup' });
    downloadText(`rahmenplan-sicherung-${slug}-${dateStamp()}.json`, toBackup({ ...data, meta: { ...data.meta, lastBackup: new Date().toISOString() } }), 'application/json');
    setToast('Kopie der Daten wurde heruntergeladen.');
  };
  const exportCsv = () => {
    downloadText(`rahmenplan-${slug}-${dateStamp()}.csv`, planToCsv(data), 'text/csv;charset=utf-8');
    setToast('CSV des geltenden Plans wurde heruntergeladen.');
  };
  const print = () => window.print();

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const res = parseBackup(await f.text());
    if (fileRef.current) fileRef.current.value = '';
    if (typeof res === 'string') {
      setConfirmReq({ title: 'Import nicht möglich', body: <p>{res}</p>, confirmLabel: 'OK', onConfirm: () => {} });
      return;
    }
    setConfirmReq({
      title: 'Sicherung importieren?',
      body: (
        <p>
          Die aktuellen Daten werden vollständig durch die Sicherung ersetzt ({res.persons.length} Personen, {res.groups.length} Gruppen,
          geltend seit {fmtDate(res.plans.geltend.since)}{res.plans.test ? ', mit Testfassung' : ''}).
        </p>
      ),
      confirmLabel: 'Ersetzen',
      danger: true,
      onConfirm: () => {
        void backend.backupCopy?.(toBackup(data), 'vor-import');
        dispatch({ type: 'replaceAll', data: res });
        setVariant(res.plans.test ? 'test' : 'geltend');
        setToast('Sicherung wurde importiert.');
      },
    });
  };

  const replaceWith = (title: string, body: string, make: () => typeof data) =>
    setConfirmReq({
      title,
      body: (
        <p>
          {body} Alle aktuellen Daten werden ersetzt.{' '}
          {backend.kind === 'file' ? 'Der bisherige Stand wird vorher in den Ordner „Sicherungen“ kopiert.' : 'Exportiere vorher eine Sicherung, wenn du sie behalten willst.'}
        </p>
      ),
      confirmLabel: 'Ersetzen',
      danger: true,
      onConfirm: () => {
        void backend.backupCopy?.(toBackup(data), 'vor-ersetzen');
        const d = make();
        dispatch({ type: 'replaceAll', data: d });
        setVariant(d.plans.test ? 'test' : 'geltend');
      },
    });

  const kinder = data.groups.reduce((a, g) => a + (g.kinder || 0), 0);
  const stunden = data.persons.reduce((a, p) => a + p.soll, 0);
  const backupDue = backend.kind === 'browser' && daysSince(data.meta.lastBackup) > BACKUP_REMIND_DAYS;
  const statusTone = status.kind === 'error' || status.kind === 'conflict' ? 'bad' : status.kind === 'pending' ? 'pending' : 'ok';

  return (
    <>
      <div className="app">
        <header className="head">
          <div>
            <div className="kicker">{data.settings.kitaName}</div>
            <h1>Rahmenplan</h1>
            <div className="sub">
              Mo–Fr {fmtShort(data.settings.open)}–{fmtShort(data.settings.close)} · {kinder} Kinder · {data.persons.length} Personen ·{' '}
              {stunden.toLocaleString('de-DE')} Wochenstunden
            </div>
          </div>
          <div className="head-right">
            <div className="tools" role="group" aria-label="Geltenden Plan teilen und Daten sichern">
              <span className="tools-label">Geltenden Plan teilen:</span>
              <button className="pill sm" onClick={print}>Drucken / PDF</button>
              <button className="pill sm" onClick={exportCsv}>CSV (Excel)</button>
            </div>
            <div className={`save-status ${statusTone}`} role="status" aria-live="polite" title={backend.label}>
              <span className="save-dot" aria-hidden="true" />
              {statusText(status, backend)}
            </div>
            <nav className="seg" aria-label="Ansicht">
              <button aria-pressed={view === 'plan'} onClick={() => setView('plan')}>Rahmenplan</button>
              <button aria-pressed={view === 'personal'} onClick={() => setView('personal')}>Personal</button>
              <button aria-pressed={view === 'settings'} onClick={() => setView('settings')}>Einstellungen</button>
            </nav>
          </div>
        </header>

        {status.kind === 'conflict' && (
          <div className="banner bad" role="alert">
            <span style={{ flex: '1 1 380px' }}>
              <strong>Die Plandatei wurde zwischenzeitlich woanders geändert</strong> (z. B. von einer anderen Person oder in einem zweiten Fenster).
              Deine letzten Änderungen sind noch nicht gespeichert. Die jeweils andere Fassung wird in „Sicherungen“ aufgehoben.
            </span>
            <button className="pill sm" onClick={() => void takeTheirs()}>Andere Fassung laden</button>
            <button className="pill sm danger" onClick={() => void keepMine()}>Meine Fassung speichern</button>
          </div>
        )}
        {status.kind === 'error' && (
          <div className="banner bad" role="alert">
            <span style={{ flex: '1 1 380px' }}>
              <strong>{status.message}</strong> Änderungen sind noch nicht gespeichert.
            </span>
            <button className="pill sm" onClick={() => void retry()}>{status.canReconnect ? 'Zugriff erlauben und speichern' : 'Erneut versuchen'}</button>
            <button className="pill sm" onClick={backup}>Kopie herunterladen</button>
          </div>
        )}
        {backend.kind === 'browser' && (
          <div className="banner warn">
            Dieser Browser kann nicht in eine Datei speichern – die Daten liegen nur im Browser. Besser mit Edge oder Chrome öffnen.
            {backupDue && <> Letzte Sicherung: {fmtDate(data.meta.lastBackup)}.</>}
            <button className="pill sm" onClick={backup}>Sicherung exportieren</button>
          </div>
        )}
        {backend.kind === 'demo' && (
          <div className="banner info">
            Du siehst fiktive Beispieldaten. Änderungen werden nicht gespeichert.
            {onChangeStorage && <button className="linkbtn" onClick={onChangeStorage}>Zum Start: eigenen Plan anlegen</button>}
          </div>
        )}
        {backend.kind !== 'demo' && data.meta.beispieldaten && (
          <div className="banner info">
            Die Plandatei enthält noch die fiktiven Beispieldaten.
            <button className="linkbtn" onClick={() => setView('settings')}>Unter „Einstellungen → Daten“ leer beginnen</button>
          </div>
        )}

        <main>
          {view === 'plan' && (
            <PlanView
              data={data}
              dispatch={dispatch}
              variant={variant}
              setVariant={setVariant}
              day={day}
              setDay={setDay}
              onOpenProfile={openProfile}
              confirm={setConfirmReq}
              goTo={setView}
              notify={setToast}
            />
          )}
          {view === 'personal' && <PersonalView data={data} dispatch={dispatch} onOpenProfile={openProfile} onNewPerson={newPerson} />}
          {view === 'settings' && (
            <SettingsView
              data={data}
              dispatch={dispatch}
              onBackup={backup}
              storageLabel={backend.label}
              storageKind={backend.kind}
              onChangeStorage={onChangeStorage}
              onImport={() => fileRef.current?.click()}
              onLoadSample={() => replaceWith('Beispieldaten laden?', 'Die fiktive „Kita Sonnenblume“ wird geladen.', () => seedData())}
              onStartEmpty={() => replaceWith('Leer beginnen?', 'Es wird ein leerer Stand mit einer Gruppe angelegt.', () => emptyData())}
            />
          )}
        </main>
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      {profile && (
        <ProfileDrawer
          key={profile.initial.id}
          data={data}
          initial={profile.initial}
          isNew={profile.isNew}
          dispatch={dispatch}
          onSave={saveProfile}
          onClose={closeProfile}
          confirm={setConfirmReq}
        />
      )}
      <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
      {toast && <div className="toast" role="status">{toast}</div>}
      <PrintView data={data} />
    </>
  );
}
