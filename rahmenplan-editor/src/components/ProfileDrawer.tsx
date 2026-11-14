import { useEffect, useId, useRef, useState } from 'react';
import type { AppData, Block, Person } from '../domain/types';
import { BLOCK_TYPES, DAYS, TYPE_LABEL } from '../domain/types';
import { blockListIssues, sortBlocks } from '../domain/plan';
import { fmt, STEP, uid } from '../domain/time';
import type { Action } from '../state/store';
import type { ConfirmRequest } from './ConfirmDialog';

interface Props {
  data: AppData;
  /** Stand beim Öffnen (bei neuer Person: Vorlage, noch nicht in den Daten) */
  initial: Person;
  isNew: boolean;
  dispatch: (a: Action) => void;
  onSave: (p: Person) => void;
  onClose: () => void;
  confirm: (r: ConfirmRequest) => void;
}

function timeOptions(open: number, close: number): number[] {
  const out: number[] = [];
  for (let h = open; h <= close + 1e-9; h += STEP) out.push(Math.round(h * 4) / 4);
  return out;
}

function BlockEditor({
  label,
  blocks,
  onChange,
  open,
  close,
}: {
  label: string;
  blocks: Block[];
  onChange: (b: Block[]) => void;
  open: number;
  close: number;
}) {
  const base = timeOptions(open, close);
  // Werte außerhalb der Öffnungszeit (z. B. nach geänderten Einstellungen) trotzdem anzeigen
  const optsFor = (v: number) => (base.includes(v) ? base : [...base, v].sort((a, b) => a - b));
  const set = (i: number, patch: Partial<Block>) => onChange(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const issues = blockListIssues(blocks, open, close);
  return (
    <div role="group" aria-label={label}>
      {blocks.map((b, i) => (
        <div className="block-row" key={b.id}>
          <select className="input sm" aria-label={`${label}, Block ${i + 1}, Beginn`} value={b.start} onChange={(e) => set(i, { start: Number(e.target.value) })}>
            {optsFor(b.start).map((h) => <option key={h} value={h}>{fmt(h)}</option>)}
          </select>
          <span className="hint" aria-hidden="true">–</span>
          <select className="input sm" aria-label={`${label}, Block ${i + 1}, Ende`} value={b.end} onChange={(e) => set(i, { end: Number(e.target.value) })}>
            {optsFor(b.end).map((h) => <option key={h} value={h}>{fmt(h)}</option>)}
          </select>
          <select className="input sm grow" aria-label={`${label}, Block ${i + 1}, Tätigkeit`} value={b.type} onChange={(e) => set(i, { type: e.target.value as Block['type'] })}>
            {BLOCK_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
          <select className="input sm" aria-label={`${label}, Block ${i + 1}, Verbindlichkeit`} value={b.verb} onChange={(e) => set(i, { verb: e.target.value as Block['verb'] })}>
            <option value="weich">weich</option>
            <option value="hart">hart</option>
          </select>
          <button className="linkbtn danger" style={{ textDecoration: 'none', fontSize: 13 }} title="Block entfernen" onClick={() => onChange(blocks.filter((_, j) => j !== i))} aria-label={`${label}, Block ${i + 1} entfernen`}>
            ✕
          </button>
        </div>
      ))}
      {issues.length > 0 && (
        <div className="issues" role="alert">
          {issues.map((t) => <p key={t}>{t}</p>)}
        </div>
      )}
    </div>
  );
}

const same = (a: Person, b: Person) => JSON.stringify(a) === JSON.stringify(b);

export function ProfileDrawer({ data, initial, isNew, dispatch, onSave, onClose, confirm }: Props) {
  const [person, setPerson] = useState<Person>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const fid = useId();
  const dirty = isNew || !same(person, initial);

  const { open, close } = data.settings;
  const nameMissing = !person.name.trim();
  const blockErrors = [...blockListIssues(person.normBlocks, open, close), ...(person.tueBlocks ? blockListIssues(person.tueBlocks, open, close) : [])];
  const invalid = nameMissing || blockErrors.length > 0;

  const requestClose = () => {
    if (!dirty) {
      onClose();
      return;
    }
    confirm({
      title: isNew ? 'Neue Person verwerfen?' : 'Änderungen verwerfen?',
      body: <p>{isNew ? 'Die Person wurde noch nicht gespeichert und wird nicht angelegt.' : `Die Änderungen an „${initial.name}“ sind noch nicht gespeichert und gehen verloren.`}</p>,
      confirmLabel: 'Verwerfen',
      danger: true,
      onConfirm: onClose,
    });
  };
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;

  const save = () => {
    if (invalid) {
      setShowErrors(true);
      if (nameMissing) ref.current?.querySelector<HTMLInputElement>('input[data-autofocus]')?.focus();
      return;
    }
    onSave({ ...person, name: person.name.trim() });
  };

  // Fokus hineinsetzen, Fokus-Falle, Esc schließt (mit Rückfrage bei Änderungen)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelector<HTMLInputElement>('input[data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = Array.from(el.querySelectorAll<HTMLElement>('input, select, textarea, button, [tabindex="0"]')).filter((n) => !n.hasAttribute('disabled'));
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // nur beim Öffnen: sonst springt der Fokus bei jeder Eingabe zurück
  }, [initial.id]);

  // Fenster schließen mit ungespeichertem Profil verhindern
  useEffect(() => {
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);

  const upd = (patch: Partial<Person>) => setPerson((p) => ({ ...p, ...patch }));
  const leadsFor = data.persons.filter((p) => p.mentorId === person.id).map((p) => p.name);
  const hasTest = !!data.plans.test;
  const newBlock = (): Block => ({ id: uid('n'), start: 8, end: 9, type: 'betreuung', verb: 'weich' });

  return (
    <>
      <div className="overlay" onClick={requestClose} />
      <div className="drawer" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="drawer-head">
          <div>
            <h2 id={titleId}>{isNew ? 'Neue Person' : initial.name}</h2>
            <div className="hint">Personalprofil</div>
          </div>
          <button className="icon-btn" onClick={requestClose} aria-label="Schließen" title="Schließen">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="drawer-body">
        <div className="field">
          <label className="field-label" htmlFor={`${fid}-name`}>Name</label>
          <input
            id={`${fid}-name`}
            data-autofocus
            className={`input${showErrors && nameMissing ? ' invalid' : ''}`}
            value={person.name}
            placeholder="z. B. Anna Schmidt"
            aria-invalid={showErrors && nameMissing}
            aria-describedby={showErrors && nameMissing ? `${fid}-name-err` : undefined}
            onChange={(e) => upd({ name: e.target.value })}
          />
          {showErrors && nameMissing && <div id={`${fid}-name-err`} className="field-error">Bitte einen Namen eingeben.</div>}
        </div>
        <div className="field">
          <label className="check">
            <input type="checkbox" checked={person.fk} onChange={() => upd({ fk: !person.fk })} />
            Zählt als Fachkraft
          </label>
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${fid}-qual`}>Qualifikation</label>
          <input id={`${fid}-qual`} className="input" value={person.qual} onChange={(e) => upd({ qual: e.target.value })} />
        </div>

        <div style={{ display: 'flex', gap: 10 }} className="field">
          <div style={{ flex: 1 }}>
            <label className="field-label" htmlFor={`${fid}-grp`}>Gruppe</label>
            <select id={`${fid}-grp`} className="input" value={person.groupId} onChange={(e) => upd({ groupId: e.target.value })}>
              {!data.groups.some((g) => g.id === person.groupId) && <option value={person.groupId}>— ohne Zuordnung —</option>}
              {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div style={{ width: 110 }}>
            <label className="field-label" htmlFor={`${fid}-soll`}>Soll h/Wo</label>
            <input id={`${fid}-soll`} className="input" type="number" min={0} max={60} step={0.5} value={person.soll} onChange={(e) => upd({ soll: Math.max(0, parseFloat(e.target.value) || 0) })} />
          </div>
        </div>

        <fieldset className="field" style={{ border: 'none', padding: 0, margin: '0 0 16px' }}>
          <legend className="field-label">Arbeitstage</legend>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {DAYS.map((d) => (
              <label key={d} className="check">
                <input
                  type="checkbox"
                  checked={person.workdays.includes(d)}
                  onChange={() =>
                    upd({ workdays: person.workdays.includes(d) ? person.workdays.filter((x) => x !== d) : DAYS.filter((x) => x === d || person.workdays.includes(x)) })
                  }
                />
                {d}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="note">
          Normalarbeitszeiten sind die Vorlage für den Plan. Nach dem Speichern erscheinen Abweichungen im Rahmenplan als Hinweis und lassen sich in
          der Testfassung übernehmen.{' '}
          {!dirty && hasTest && (
            <button className="linkbtn" onClick={() => DAYS.forEach((d) => dispatch({ type: 'resetDayFromProfile', personId: person.id, day: d }))}>
              Alle Tage jetzt in die Testfassung übernehmen
            </button>
          )}
        </div>

        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="field-label">Normalarbeitszeiten{person.tueBlocks ? ' (Mo/Mi/Do/Fr)' : ''}</div>
          <button className="linkbtn" onClick={() => upd({ normBlocks: [...person.normBlocks, newBlock()] })}>+ Block</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <BlockEditor label="Normalarbeitszeiten" blocks={person.normBlocks} onChange={(b) => upd({ normBlocks: sortBlocks(b) })} open={open} close={close} />
        </div>

        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="field-label">Dienstag (Sonderfall)</div>
          {person.tueBlocks ? (
            <button className="linkbtn danger" onClick={() => upd({ tueBlocks: null })}>Sonderregel entfernen</button>
          ) : (
            <button className="linkbtn" onClick={() => upd({ tueBlocks: person.normBlocks.map((b) => ({ ...b, id: uid('t') })) })}>+ Sonderregel</button>
          )}
        </div>
        {person.tueBlocks && (
          <div style={{ marginBottom: 8 }}>
            <button className="linkbtn" style={{ marginBottom: 4, display: 'block' }} onClick={() => upd({ tueBlocks: [...(person.tueBlocks ?? []), { ...newBlock(), id: uid('t') }] })}>
              + Block
            </button>
            <BlockEditor label="Dienstag" blocks={person.tueBlocks} onChange={(b) => upd({ tueBlocks: sortBlocks(b) })} open={open} close={close} />
          </div>
        )}

        <div className="drawer-section">
          <div className="field-label">Praxisanleitung</div>
          <label className="hint" htmlFor={`${fid}-mentor`} style={{ display: 'block', marginBottom: 4 }}>Wird angeleitet von</label>
          <select id={`${fid}-mentor`} className="input" style={{ marginBottom: 10 }} value={person.mentorId} onChange={(e) => upd({ mentorId: e.target.value })}>
            <option value="">— niemand —</option>
            {data.persons.filter((p) => p.id !== person.id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="hint">
            Ist Anleiter:in für: <strong style={{ color: 'var(--ink)' }}>{leadsFor.length ? leadsFor.join(', ') : '—'}</strong>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${fid}-notiz`}>Bemerkungen</label>
          <textarea id={`${fid}-notiz`} className="input" rows={4} style={{ resize: 'vertical' }} value={person.notiz} onChange={(e) => upd({ notiz: e.target.value })} />
        </div>

        {!isNew && (
          <div className="drawer-section">
            <button
              className="pill danger"
              onClick={() =>
                confirm({
                  title: `${initial.name || 'Person'} entfernen?`,
                  body: <p>Das Profil wird gelöscht und die Person aus dem geltenden Plan und der Testfassung entfernt. Das lässt sich nicht rückgängig machen.</p>,
                  confirmLabel: 'Entfernen',
                  danger: true,
                  onConfirm: () => {
                    onClose();
                    dispatch({ type: 'removePerson', id: initial.id });
                  },
                })
              }
            >
              Person entfernen
            </button>
          </div>
        )}
        </div>

        <div className="drawer-foot">
          {showErrors && invalid ? (
            <span className="foot-msg error" role="alert">
              {nameMissing ? 'Name fehlt.' : 'Bitte die markierten Zeiten korrigieren.'}
            </span>
          ) : (
            <span className="foot-msg" aria-live="polite">{dirty ? (isNew ? 'Noch nicht angelegt' : 'Ungespeicherte Änderungen') : 'Alles gespeichert'}</span>
          )}
          <button className="pill" onClick={requestClose}>Abbrechen</button>
          <button className="cta" onClick={save} disabled={!dirty}>
            {isNew ? 'Person anlegen' : 'Speichern'}
          </button>
        </div>
      </div>
    </>
  );
}
