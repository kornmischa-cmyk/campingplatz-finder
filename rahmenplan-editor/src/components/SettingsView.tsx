import { useEffect, useId, useState } from 'react';
import type { AppData, Day, Group, Settings } from '../domain/types';
import { DAYS } from '../domain/types';
import { fmt, STEP, uid } from '../domain/time';
import type { Action } from '../state/store';
import { fmtDate } from '../lib/download';

interface Props {
  data: AppData;
  dispatch: (a: Action) => void;
  onBackup: () => void;
  onImport: () => void;
  onLoadSample: () => void;
  onStartEmpty: () => void;
  storageLabel: string;
  storageKind: 'file' | 'browser' | 'demo';
  onChangeStorage?: () => void;
}

const DAY_TIMES: number[] = [];
for (let h = 5; h <= 21 + 1e-9; h += STEP) DAY_TIMES.push(h);

function TimeSelect({ value, onChange, label, min = 5, max = 21 }: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number }) {
  const opts = DAY_TIMES.filter((h) => h >= min - 1e-9 && h <= max + 1e-9);
  if (!opts.includes(value)) opts.push(value);
  return (
    <select className="input sm" aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {opts.sort((a, b) => a - b).map((h) => <option key={h} value={h}>{fmt(h)}</option>)}
    </select>
  );
}

const num = (v: string, fallback = 0) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
};

export function SettingsView({ data, dispatch, onBackup, onImport, onLoadSample, onStartEmpty, storageLabel, storageKind, onChangeStorage }: Props) {
  const s = data.settings;
  const set = (patch: Partial<Settings>) => dispatch({ type: 'setSettings', patch });
  const setGroups = (groups: Group[]) => dispatch({ type: 'setGroups', groups });
  const fid = useId();
  const [focusGroup, setFocusGroup] = useState<string | null>(null);
  useEffect(() => {
    if (!focusGroup) return;
    const el = document.querySelector<HTMLInputElement>(`input[data-group="${focusGroup}"]`);
    el?.focus();
    el?.select();
    setFocusGroup(null);
  }, [focusGroup]);

  return (
    <div className="settings">
      <div className="card">
        <h2>Kita</h2>
        <div className="form-grid">
          <div>
            <label className="field-label" htmlFor={`${fid}-name`}>Name der Kita</label>
            <input id={`${fid}-name`} className="input" value={s.kitaName} onChange={(e) => set({ kitaName: e.target.value })} />
          </div>
          <div>
            <span className="field-label">Öffnungszeit (Mo–Fr)</span>
            <div className="list-row">
              <TimeSelect label="Öffnung" value={s.open} max={s.close - 1} onChange={(v) => set({ open: v })} />
              –
              <TimeSelect label="Schließung" value={s.close} min={s.open + 1} onChange={(v) => set({ close: v })} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Gruppen</h2>
        {data.groups.map((g, i) => {
          const members = data.persons.filter((p) => p.groupId === g.id).length;
          const upd = (patch: Partial<Group>) => setGroups(data.groups.map((x) => (x.id === g.id ? { ...x, ...patch } : x)));
          const move = (dir: -1 | 1) => {
            const arr = [...data.groups];
            [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
            setGroups(arr);
          };
          return (
            <div className="list-row" key={g.id}>
              <input className="input" data-group={g.id} aria-label={`Gruppe ${i + 1}, Name`} value={g.name} onChange={(e) => upd({ name: e.target.value })} />
              <input className="input num" type="number" min={0} aria-label={`Gruppe ${i + 1}, Anzahl Kinder`} value={g.kinder} onChange={(e) => upd({ kinder: Math.max(0, Math.round(num(e.target.value))) })} />
              <span className="hint">Kinder</span>
              <input className="input" style={{ width: 90 }} aria-label={`Gruppe ${i + 1}, Alter`} placeholder="z. B. 3–6 J." value={g.alter} onChange={(e) => upd({ alter: e.target.value })} />
              <button className="linkbtn" disabled={i === 0} onClick={() => move(-1)} aria-label={`Gruppe ${g.name} nach oben`}>↑</button>
              <button className="linkbtn" disabled={i === data.groups.length - 1} onClick={() => move(1)} aria-label={`Gruppe ${g.name} nach unten`}>↓</button>
              <button
                className="linkbtn danger"
                disabled={members > 0}
                title={members > 0 ? 'Nur leere Gruppen lassen sich entfernen' : undefined}
                onClick={() => setGroups(data.groups.filter((x) => x.id !== g.id))}
              >
                Entfernen
              </button>
              {members > 0 && <span className="hint">{members} Personen</span>}
            </div>
          );
        })}
        <button
          className="pill"
          style={{ marginTop: 6 }}
          onClick={() => {
            const id = uid('g');
            setGroups([...data.groups, { id, name: `Gruppe ${data.groups.length + 1}`, kinder: 0, alter: '' }]);
            setFocusGroup(id);
          }}
        >
          + Gruppe hinzufügen
        </button>
      </div>

      <div className="card">
        <h2>Regeln</h2>
        <p className="hint" style={{ marginTop: 0, maxWidth: 720 }}>
          Die Startwerte stammen aus dem Prototyp und sind <strong>beispielhaft</strong>. Bitte vor dem echten Einsatz fachlich prüfen (z. B.
          Mindestpersonal nach HessKiföG, Betreuungsschlüssel je Gruppe). Ob jemand als Fachkraft zählt, wird im Personalprofil festgelegt.
        </p>
        <div className="form-grid">
          <div>
            <label className="field-label" htmlFor={`${fid}-minfk`}>Mind. Fachkräfte in Betreuung</label>
            <input id={`${fid}-minfk`} className="input num" type="number" min={0} value={s.minFachkraefte} onChange={(e) => set({ minFachkraefte: Math.max(0, Math.round(num(e.target.value))) })} />
          </div>
          <div>
            <label className="field-label" htmlFor={`${fid}-stueck`}>Max. Stunden am Stück ohne Pause</label>
            <input id={`${fid}-stueck`} className="input num" type="number" min={1} step={0.25} value={s.maxAmStueck} onChange={(e) => set({ maxAmStueck: Math.max(0.25, num(e.target.value, 6)) })} />
          </div>
          <div>
            <label className="field-label" htmlFor={`${fid}-az`}>Hinweis ab Stunden pro Tag</label>
            <input id={`${fid}-az`} className="input num" type="number" min={1} step={0.25} value={s.hinweisArbeitszeit} onChange={(e) => set({ hinweisArbeitszeit: Math.max(0.25, num(e.target.value, 8)) })} />
          </div>
          <div>
            <label className="field-label" htmlFor={`${fid}-bt`}>Tag der Dienstbesprechung</label>
            <select id={`${fid}-bt`} className="input" value={s.besprechungsTag} onChange={(e) => set({ besprechungsTag: e.target.value as Day | '' })}>
              <option value="">— kein Hinweis —</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <h3>Randzeiten (Früh-/Spätdienst)</h3>
        {s.randzeiten.map((r, i) => {
          const upd = (patch: Partial<typeof r>) => set({ randzeiten: s.randzeiten.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div className="list-row" key={i}>
              <TimeSelect label={`Randzeit ${i + 1}, Beginn`} value={r.start} min={s.open} max={s.close} onChange={(v) => upd({ start: v })} />–
              <TimeSelect label={`Randzeit ${i + 1}, Ende`} value={r.end} min={s.open} max={s.close} onChange={(v) => upd({ end: v })} />
              <span>mind.</span>
              <input className="input num" type="number" min={1} aria-label={`Randzeit ${i + 1}, Mindestpersonen`} value={r.minPersonen} onChange={(e) => upd({ minPersonen: Math.max(1, Math.round(num(e.target.value, 2))) })} />
              <span>Personen in Betreuung</span>
              <button className="linkbtn danger" onClick={() => set({ randzeiten: s.randzeiten.filter((_, j) => j !== i) })}>Entfernen</button>
            </div>
          );
        })}
        <button className="linkbtn" onClick={() => set({ randzeiten: [...s.randzeiten, { start: s.open, end: s.open + 0.5, minPersonen: 2 }] })}>+ Randzeit</button>

        <h3>Pausenstaffel (Volljährige)</h3>
        {s.pausen.map((p, i) => {
          const upd = (patch: Partial<typeof p>) => set({ pausen: s.pausen.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div className="list-row" key={i}>
              <span>Arbeitszeit über</span>
              <input className="input num" type="number" min={0} step={0.25} aria-label={`Pausenstufe ${i + 1}, ab Stunden`} value={p.abStunden} onChange={(e) => upd({ abStunden: Math.max(0, num(e.target.value)) })} />
              <span>h → mind.</span>
              <input className="input num" type="number" min={0} step={15} aria-label={`Pausenstufe ${i + 1}, Minuten`} value={p.minuten} onChange={(e) => upd({ minuten: Math.max(0, Math.round(num(e.target.value))) })} />
              <span>Minuten Pause</span>
              <button className="linkbtn danger" onClick={() => set({ pausen: s.pausen.filter((_, j) => j !== i) })}>Entfernen</button>
            </div>
          );
        })}
        <button className="linkbtn" onClick={() => set({ pausen: [...s.pausen, { abStunden: 9, minuten: 45 }] })}>+ Stufe</button>

        <div style={{ marginTop: 16 }}>
          <label className="check">
            <input type="checkbox" checked={s.showPausenstaffel} onChange={() => set({ showPausenstaffel: !s.showPausenstaffel })} />
            Pausenstaffel-Tabelle im Rahmenplan anzeigen
          </label>
        </div>
      </div>

      <div className="card">
        <h2>Daten</h2>
        {storageKind === 'file' ? (
          <p className="hint" style={{ marginTop: 0, maxWidth: 720 }}>
            Gespeichert wird automatisch in <strong>{storageLabel}</strong>. Im selben Ordner liegt „Sicherungen“ mit einer Kopie pro Tag (die
            letzten 30 Tage). Wer mitarbeiten soll, öffnet die App und wählt denselben Ordner. Ändern zwei Personen gleichzeitig, fragt die App nach,
            statt still zu überschreiben.
          </p>
        ) : storageKind === 'demo' ? (
          <p className="hint" style={{ marginTop: 0, maxWidth: 720 }}>Beispielmodus: Es wird nichts gespeichert.</p>
        ) : (
          <p className="hint" style={{ marginTop: 0, maxWidth: 720 }}>
            Die Daten liegen nur in diesem Browser. Sie gehen verloren, wenn die Browserdaten gelöscht werden oder ein anderer Browser genutzt wird.
            Exportiere regelmäßig eine Sicherung. Letzte Sicherung: <strong>{fmtDate(data.meta.lastBackup)}</strong>.
          </p>
        )}
        <div className="list-row">
          {onChangeStorage && (
            <button className="pill" onClick={onChangeStorage}>
              {storageKind === 'file' ? 'Anderen Datenordner wählen …' : 'Zum Start (Ordner wählen) …'}
            </button>
          )}
          <button className={storageKind === 'browser' ? 'cta' : 'pill'} onClick={onBackup}>Kopie exportieren (.json)</button>
          <button className="pill" onClick={onImport}>Sicherung importieren …</button>
        </div>
        <div className="list-row" style={{ marginTop: 10 }}>
          <button className="pill" onClick={onLoadSample}>Beispieldaten laden …</button>
          <button className="pill danger" onClick={onStartEmpty}>Leer beginnen …</button>
        </div>
      </div>
    </div>
  );
}
