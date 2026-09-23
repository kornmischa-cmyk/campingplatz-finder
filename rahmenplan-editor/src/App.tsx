import { useCallback, useEffect, useRef, useState } from 'react';
import type { Day, Variant } from './domain/types';
import { planToCsv } from './domain/csv';
import { emptyData, seedData } from './domain/seed';
import { parseBackup, toBackup } from './domain/storage';
import { fmt } from './domain/time';
import { useStore } from './state/store';
import { dateStamp, daysSince, downloadText, fmtDate } from './lib/download';
import { PlanView } from './components/PlanView';
import { PersonalView } from './components/PersonalView';
import { ProfileDrawer } from './components/ProfileDrawer';
import { SettingsView } from './components/SettingsView';
import { PrintView } from './components/PrintView';
import { ConfirmDialog, type ConfirmRequest } from './components/ConfirmDialog';

type View = 'plan' | 'personal' | 'settings';
const BACKUP_REMIND_DAYS = 7;

export function App() {
  const { data, dispatch, saved } = useStore();
  const [view, setView] = useState<View>('plan');
  const [variant, setVariant] = useState<Variant>(data.plans.test ? 'test' : 'geltend');
  const [day, setDay] = useState<Day>('Di');
  const [profile, setProfile] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const openProfile = useCallback((id: string, el: HTMLElement) => {
    opener.current = el;
    setProfile(id);
  }, []);
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
    setToast('Sicherung wurde heruntergeladen.');
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
          Die aktuellen Daten in diesem Browser werden vollständig durch die Sicherung ersetzt ({res.persons.length} Personen, {res.groups.length} Gruppen,
          geltend seit {fmtDate(res.plans.geltend.since)}{res.plans.test ? ', mit Testfassung' : ''}).
        </p>
      ),
      confirmLabel: 'Ersetzen',
      danger: true,
      onConfirm: () => {
        dispatch({ type: 'replaceAll', data: res });
        setVariant(res.plans.test ? 'test' : 'geltend');
        setToast('Sicherung wurde importiert.');
      },
    });
  };

  const replaceWith = (title: string, body: string, make: () => typeof data) =>
    setConfirmReq({
      title,
      body: <p>{body} Alle aktuellen Daten in diesem Browser werden ersetzt. Exportiere vorher eine Sicherung, wenn du sie behalten willst.</p>,
      confirmLabel: 'Ersetzen',
      danger: true,
      onConfirm: () => {
        const d = make();
        dispatch({ type: 'replaceAll', data: d });
        setVariant(d.plans.test ? 'test' : 'geltend');
      },
    });

  const kinder = data.groups.reduce((a, g) => a + (g.kinder || 0), 0);
  const stunden = data.persons.reduce((a, p) => a + p.soll, 0);
  const backupDue = daysSince(data.meta.lastBackup) > BACKUP_REMIND_DAYS;

  return (
    <>
      <div className="app">
        <header className="head">
          <div>
            <h1>Rahmenplan bearbeiten</h1>
            <div className="sub">
              {data.settings.kitaName} · Öffnung Mo–Fr {fmt(data.settings.open)}–{fmt(data.settings.close)} · {kinder} Kinder · {data.persons.length}{' '}
              planbare Personen · {stunden.toLocaleString('de-DE')} Wochenstunden
            </div>
          </div>
          <div className="head-actions" role="group" aria-label="Geltenden Plan teilen und Daten sichern">
            <span className="bar-label">Geltenden Plan teilen</span>
            <button className="btn" onClick={print}>Drucken / PDF</button>
            <button className="btn" onClick={exportCsv}>CSV (Excel)</button>
            <button className="btn" onClick={backup}>Sicherung</button>
          </div>
        </header>

        {!saved && (
          <div className="banner bad" role="alert">
            Der Browser erlaubt kein Speichern. Änderungen gehen beim Schließen verloren.
            <button className="btn" onClick={backup}>Jetzt Sicherung exportieren</button>
          </div>
        )}
        {saved && backupDue && !data.meta.beispieldaten && (
          <div className="banner warn">
            Die Daten liegen nur in diesem Browser. Letzte Sicherung: {fmtDate(data.meta.lastBackup)}.
            <button className="btn" onClick={backup}>Jetzt sichern</button>
          </div>
        )}
        {data.meta.beispieldaten && (
          <div className="banner info">
            Du siehst fiktive Beispieldaten.
            <button className="linkbtn" onClick={() => setView('settings')}>Unter „Einstellungen → Daten“ leer beginnen</button>
          </div>
        )}

        <nav className="bar" aria-label="Ansicht">
          <span className="bar-label">Ansicht</span>
          <button className="btn" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>Rahmenplan</button>
          <button className="btn" aria-pressed={view === 'personal'} onClick={() => setView('personal')}>Personal</button>
          <button className="btn" aria-pressed={view === 'settings'} onClick={() => setView('settings')}>Einstellungen</button>
        </nav>

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
            />
          )}
          {view === 'personal' && <PersonalView data={data} dispatch={dispatch} onOpenProfile={openProfile} />}
          {view === 'settings' && (
            <SettingsView
              data={data}
              dispatch={dispatch}
              onBackup={backup}
              onImport={() => fileRef.current?.click()}
              onLoadSample={() => replaceWith('Beispieldaten laden?', 'Die fiktive „Kita Sonnenblume“ wird geladen.', () => seedData())}
              onStartEmpty={() => replaceWith('Leer beginnen?', 'Es wird ein leerer Stand mit einer Gruppe angelegt.', () => emptyData())}
            />
          )}
        </main>
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      {profile && <ProfileDrawer data={data} personId={profile} dispatch={dispatch} onClose={closeProfile} confirm={setConfirmReq} />}
      <ConfirmDialog req={confirmReq} onClose={() => setConfirmReq(null)} />
      {toast && <div className="toast" role="status">{toast}</div>}
      <PrintView data={data} />
    </>
  );
}
