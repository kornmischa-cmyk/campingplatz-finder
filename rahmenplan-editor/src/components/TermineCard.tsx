import { useId, useState } from 'react';
import type { AppData, Day, Termin, TerminTyp } from '../domain/types';
import { DAYS, TYPE_LABEL } from '../domain/types';
import { fmt, STEP, uid } from '../domain/time';
import { groupedPersons } from '../domain/groups';
import type { Action } from '../state/store';
import type { ConfirmRequest } from './ConfirmDialog';

const DAY_FULL: Record<Day, string> = { Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag', Fr: 'Freitag' };
const TYPEN: TerminTyp[] = ['besprechung', 'anleitung', 'verfuegung'];

interface Props {
  data: AppData;
  day: Day;
  dispatch: (a: Action) => void;
  confirm: (r: ConfirmRequest) => void;
  /** nach dem Speichern/Löschen: zur Testfassung wechseln und Bescheid geben */
  onApplied: (msg: string) => void;
}

export function teilnehmerText(t: Termin, data: AppData): string {
  if (t.teilnehmer === 'alle') return 'alle, die an dem Tag arbeiten';
  const names = t.teilnehmer.map((id) => data.persons.find((p) => p.id === id)?.name).filter(Boolean);
  return names.length ? names.join(', ') : 'niemand ausgewählt';
}

function TerminForm({ data, initial, onSave, onCancel }: { data: AppData; initial: Termin; onSave: (t: Termin) => void; onCancel: () => void }) {
  const [t, setT] = useState<Termin>(initial);
  const [tried, setTried] = useState(false);
  const id = useId();
  const { open, close } = data.settings;
  const times: number[] = [];
  for (let h = open; h <= close + 1e-9; h += STEP) times.push(Math.round(h * 4) / 4);
  const auswahl = t.teilnehmer === 'alle' ? null : t.teilnehmer;
  const errors = [
    !t.name.trim() && 'Bitte eine Bezeichnung eingeben.',
    t.end <= t.start && 'Das Ende muss nach dem Beginn liegen.',
    auswahl && !auswahl.length && 'Bitte mindestens eine Person auswählen.',
  ].filter(Boolean) as string[];

  return (
    <form
      className="termin-form"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!errors.length) onSave({ ...t, name: t.name.trim() });
      }}
    >
      <div className="form-grid">
        <div>
          <label className="field-label" htmlFor={`${id}-name`}>Bezeichnung</label>
          <input id={`${id}-name`} className="input" autoFocus placeholder="z. B. Dienstbesprechung" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
        </div>
        <div>
          <label className="field-label" htmlFor={`${id}-typ`}>Art</label>
          <select id={`${id}-typ`} className="input" value={t.type} onChange={(e) => setT({ ...t, type: e.target.value as TerminTyp })}>
            {TYPEN.map((x) => <option key={x} value={x}>{TYPE_LABEL[x]}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor={`${id}-tag`}>Tag</label>
          <select id={`${id}-tag`} className="input" value={t.day} onChange={(e) => setT({ ...t, day: e.target.value as Day })}>
            {DAYS.map((d) => <option key={d} value={d}>{DAY_FULL[d]}</option>)}
          </select>
        </div>
        <div>
          <span className="field-label">Uhrzeit</span>
          <div className="list-row" style={{ margin: 0 }}>
            <select className="input sm" aria-label="Beginn" value={t.start} onChange={(e) => setT({ ...t, start: Number(e.target.value) })}>
              {times.map((h) => <option key={h} value={h}>{fmt(h)}</option>)}
            </select>
            –
            <select className="input sm" aria-label="Ende" value={t.end} onChange={(e) => setT({ ...t, end: Number(e.target.value) })}>
              {times.map((h) => <option key={h} value={h}>{fmt(h)}</option>)}
            </select>
          </div>
        </div>
      </div>

      <fieldset className="teilnehmer">
        <legend className="field-label">Wer nimmt teil?</legend>
        <label className="check">
          <input type="radio" name={`${id}-tn`} checked={!auswahl} onChange={() => setT({ ...t, teilnehmer: 'alle' })} />
          Alle, die an dem Tag arbeiten
        </label>
        <label className="check">
          <input type="radio" name={`${id}-tn`} checked={!!auswahl} onChange={() => setT({ ...t, teilnehmer: [] })} />
          Nur ausgewählte Personen (z. B. Anleitergespräch)
        </label>
        {auswahl && (
          <div className="tn-list">
            {groupedPersons(data).map(({ group, members }) =>
              members.length ? (
                <div key={group.id} className="tn-group">
                  <span className="hint">{group.name}</span>
                  {members.map((p) => {
                    const frei = !p.workdays.includes(t.day);
                    return (
                      <label key={p.id} className="check" title={frei ? `${p.name} arbeitet ${DAY_FULL[t.day]}s nicht – der Termin gilt dann nicht.` : undefined}>
                        <input
                          type="checkbox"
                          checked={auswahl.includes(p.id)}
                          onChange={() => setT({ ...t, teilnehmer: auswahl.includes(p.id) ? auswahl.filter((x) => x !== p.id) : [...auswahl, p.id] })}
                        />
                        {p.name}
                        {frei && <span className="hint"> (arbeitet {t.day} nicht)</span>}
                      </label>
                    );
                  })}
                </div>
              ) : null,
            )}
          </div>
        )}
      </fieldset>

      {tried && errors.length > 0 && (
        <div className="issues" role="alert">
          {errors.map((e) => <p key={e}>{e}</p>)}
        </div>
      )}
      <div className="list-row" style={{ marginTop: 12, marginBottom: 0 }}>
        <button type="submit" className="cta">Termin speichern</button>
        <button type="button" className="pill" onClick={onCancel}>Abbrechen</button>
        <span className="hint">Wird sofort in die Testfassung eingetragen, als zusätzlicher Block – Dienste werden nicht verlängert.</span>
      </div>
    </form>
  );
}

export function TermineCard({ data, day, dispatch, confirm, onApplied }: Props) {
  const [editing, setEditing] = useState<Termin | null>(null);
  const [open, setOpen] = useState(false);
  const heute = data.termine.filter((t) => t.day === day).sort((a, b) => a.start - b.start);
  const neu = (): Termin => ({ id: uid('t'), name: '', type: 'besprechung', day, start: 14, end: 15, teilnehmer: 'alle' });
  const listId = useId();

  return (
    <section className="termine-strip" aria-labelledby={`${listId}-t`}>
      <div className="termine-row">
        <h3 id={`${listId}-t`}>Termine am {DAY_FULL[day]}</h3>
        {heute.length === 0 ? (
          <span className="hint">keine – z. B. Dienstbesprechung für alle oder ein Anleitergespräch</span>
        ) : (
          <ul className="termin-chips">
            {heute.map((t) => (
              <li key={t.id} title={`${t.name} · ${fmt(t.start)}–${fmt(t.end)} · ${teilnehmerText(t, data)}`}>
                <i className={`sw t-${t.type}`} aria-hidden="true" />
                <span className="termin-time">{fmt(t.start)}</span> {t.name}
              </li>
            ))}
          </ul>
        )}
        <span className="spacer" />
        {heute.length > 0 && !editing && (
          <button className="linkbtn" aria-expanded={open} aria-controls={`${listId}-l`} onClick={() => setOpen(!open)}>
            {open ? 'Einklappen' : 'Bearbeiten'}
          </button>
        )}
        {!editing && (
          <button className="pill sm" onClick={() => setEditing(neu())}>
            + Termin
          </button>
        )}
      </div>
      {open && !editing && heute.length > 0 && (
        <ul className="termin-list" id={`${listId}-l`}>
          {heute.map((t) => (
            <li key={t.id}>
              <i className={`sw t-${t.type}`} aria-hidden="true" />
              <span className="termin-time">{fmt(t.start)}–{fmt(t.end)}</span>
              <strong>{t.name}</strong>
              <span className="hint">· {teilnehmerText(t, data)}</span>
              <span className="spacer" />
              <button className="linkbtn" onClick={() => setEditing(t)}>Bearbeiten</button>
              <button
                className="linkbtn danger"
                onClick={() =>
                  confirm({
                    title: `„${t.name}“ entfernen?`,
                    body: <p>Der Termin wird aus dem Rahmenplan und aus der Testfassung entfernt. Der geltende Plan ändert sich erst beim Übernehmen.</p>,
                    confirmLabel: 'Entfernen',
                    danger: true,
                    onConfirm: () => {
                      dispatch({ type: 'deleteTermin', id: t.id });
                      onApplied(`„${t.name}“ entfernt – in der Testfassung.`);
                    },
                  })
                }
              >
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <TerminForm
          key={editing.id}
          data={data}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(t) => {
            dispatch({ type: 'saveTermin', termin: t });
            setEditing(null);
            onApplied(`„${t.name}“ gespeichert und in die Testfassung eingetragen.`);
          }}
        />
      )}
    </section>
  );
}
