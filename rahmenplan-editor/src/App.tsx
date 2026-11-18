import { useCallback, useEffect, useRef, useState } from 'react';
import type { Day, Variant } from './domain/types';
import { planToCsv, wocheToCsv } from './domain/csv';
import { emptyData, seedData } from './domain/seed';
import { parseBackup, toBackup } from './domain/storage';
import { fmtShort } from './domain/time';
import { useStore, type SaveStatus } from './state/store';
import type { AppData, Person } from './domain/types';
import { DAYS } from './domain/types';
import { profileChanges } from './domain/plan';
import type { Backend } from './lib/fileStore';
import { dateStamp, daysSince, downloadText, fmtDate } from './lib/download';
import { PlanView } from './components/PlanView';
import { PersonalView } from './components/PersonalView';
import { WeekView } from './components/WeekView';
import { isoDate, kalenderwoche, mondayOf } from './domain/abwesenheit';
import { ProfileDrawer } from './components/ProfileDrawer';
import { SettingsView } from './components/SettingsView';
import { PrintView } from './components/PrintView';
import { ConfirmDialog, type ConfirmRequest } from './components/ConfirmDialog';
import { RedoIcon, UndoIcon } from './components/Icons';

type View = 'plan' | 'woche' | 'personal' | 'settings';
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
  const { data, dispatch, status, notice, clearNotice, keepMine, takeTheirs, retry, undo, redo, canUndo, canRedo } = useStore(initial, backend);
  const [view, setView] = useState<View>('plan');
  const [variant, setVariant] = useState<Variant>(data.plans.test ? 'test' : 'geltend');
  const [day, setDay] = useState<Day>('Di');
  const [weekMonday, setWeekMonday] = useState(() => mondayOf(isoDate(new Date())));
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
  const doUndo = useCallback(() => {
    if (!canUndo) return;
    undo();
    setToast('Letzte Änderung rückgängig gemacht. Strg+Y stellt sie wieder her.');
  }, [canUndo, undo]);
  const doRedo = useCallback(() => {
    if (!canRedo) return;
    redo();
    setToast('Änderung wiederhergestellt.');
  }, [canRedo, redo]);
  // Strg+Z / Strg+Y (Strg+Umschalt+Z); in Eingabefeldern bleibt das normale Text-Rückgängig
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== 'z' && k !== 'y') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || t.closest('.drawer, dialog'))) return;
      if (profile || confirmReq) return;
      e.preventDefault();
      if (k === 'y' || e.shiftKey) doRedo();
      else doUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doUndo, doRedo, profile, confirmReq]);
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
  const saveProfile = (p: Person, alsoGeltend: boolean) => {
    const old = data.persons.find((x) => x.id === p.id) ?? null;
    const isNew = !old;
    // Welche Tage betrifft die Änderung, und sind davon welche von Hand angepasst?
    const testBase = data.plans.test ?? data.plans.geltend;
    const t = profileChanges(old, p, testBase, data);
    const g = alsoGeltend ? profileChanges(old, p, data.plans.geltend, data) : { changed: [], manual: [] };
    const manual = DAYS.filter((d) => t.manual.includes(d) || g.manual.includes(d));
    const changed = t.changed.length + g.changed.length > 0;
    const done = (overwriteManual: boolean) => {
      dispatch({ type: 'saveProfile', person: p, alsoGeltend, overwriteManual });
      if (changed) setVariant('test');
      const wo = !changed ? '' : alsoGeltend ? ' Plan in Testfassung und geltendem Plan aktualisiert.' : ' Testfassung aktualisiert.';
      setToast(`„${p.name}“ ${isNew ? 'angelegt' : 'gespeichert'}.${wo}`);
      closeProfile();
    };
    if (!manual.length) {
      done(false);
      return;
    }
    setConfirmReq({
      title: 'Angepasste Tage überschreiben?',
      body: (
        <p>
          Bei {p.name} wurden diese Tage im Plan von Hand angepasst: <strong>{manual.join(', ')}</strong>. Sollen sie durch die neuen Zeiten aus dem
          Profil ersetzt werden? Unveränderte Tage werden in jedem Fall aktualisiert.
        </p>
      ),
      confirmLabel: 'Überschreiben',
      onConfirm: () => done(true),
      secondaryLabel: 'Angepasste Tage behalten',
      onSecondary: () => done(false),
    });
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
    if (view === 'woche') {
      downloadText(`wochenplan-kw${kalenderwoche(weekMonday)}-${weekMonday}-${slug}.csv`, wocheToCsv(data, weekMonday), 'text/csv;charset=utf-8');
      setToast(`CSV der KW ${kalenderwoche(weekMonday)} wurde heruntergeladen.`);
      return;
    }
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
        {view === 'plan' && (
          <a className="skip-link" href="#plan">
            Zum Plan springen
          </a>
        )}
        <header className="head">
          <div>
            <h1>Rahmenplan</h1>
            <div className="sub">
              <strong className="sub-kita">{data.settings.kitaName}</strong> · Mo–Fr {fmtShort(data.settings.open)}–{fmtShort(data.settings.close)} · {kinder} Kinder · {data.persons.length} Personen ·{' '}
              {stunden.toLocaleString('de-DE')} Wochenstunden
            </div>
          </div>
          <div className="head-right">
            <div className="head-status">
              <div className={`save-status ${statusTone}`} role="status" aria-live="polite" title={backend.label}>
                <span className="save-dot" aria-hidden="true" />
                {statusText(status, backend)}
              </div>
              <div className="undo-group" role="group" aria-label="Verlauf">
                <button className="pill sm icon-pill" onClick={doUndo} disabled={!canUndo} title="Rückgängig (Strg+Z)" aria-label="Rückgängig" aria-keyshortcuts="Control+Z">
                  <UndoIcon /> <span className="lbl">Rückgängig</span>
                </button>
                <button className="pill sm icon-pill" onClick={doRedo} disabled={!canRedo} title="Wiederholen (Strg+Y)" aria-label="Wiederholen" aria-keyshortcuts="Control+Y">
                  <RedoIcon /> <span className="lbl">Wiederholen</span>
                </button>
              </div>
              <span className="head-sep" aria-hidden="true" />
              <div className="tools" role="group" aria-label={view === 'woche' ? 'Woche drucken oder exportieren' : 'Geltenden Plan drucken oder exportieren'}>
                <button
                  className="pill sm"
                  onClick={print}
                  title={view === 'woche' ? `Druckt KW ${kalenderwoche(weekMonday)} mit Abwesenheiten – im Druckdialog „Als PDF speichern“ wählen` : 'Druckt den geltenden Rahmenplan – im Druckdialog „Als PDF speichern“ wählen'}
                >
                  Drucken / PDF
                </button>
                <button className="pill sm" onClick={exportCsv} title={view === 'woche' ? 'Diese Woche als Tabelle für Excel' : 'Geltenden Rahmenplan als Tabelle für Excel'}>
                  CSV (Excel)
                </button>
              </div>
            </div>
            <nav className="seg" aria-label="Ansicht">
              <button aria-pressed={view === 'plan'} onClick={() => setView('plan')}>Rahmenplan</button>
              <button aria-pressed={view === 'woche'} onClick={() => setView('woche')}>Woche</button>
              <button aria-pressed={view === 'personal'} onClick={() => setView('personal')}>Personal</button>
              <button aria-pressed={view === 'settings'} onClick={() => setView('settings')}>Einstellungen</button>
            </nav>
          </div>
        </header>

        <main>
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
              onBackup={backup}
            />
          )}
          {view === 'woche' && <WeekView data={data} dispatch={dispatch} confirm={setConfirmReq} onOpenProfile={openProfile} notify={setToast} monday={weekMonday} setMonday={setWeekMonday} />}
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
      <PrintView data={data} week={view === 'woche' ? weekMonday : undefined} />
    </>
  );
}
