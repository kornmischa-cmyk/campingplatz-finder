// Konkrete Kalenderwoche: geltender Rahmenplan minus Abwesenheiten (Urlaub, Krank, Fortbildung …).
import { useId, useMemo, useState } from 'react';
import type { Abwesenheit, AbwesenheitArt, AppData, Day } from '../domain/types';
import { ABWESENHEIT_LABEL, DAYS } from '../domain/types';
import { evaluateDay, type DayResult } from '../domain/rules';
import { viewRange, TERMIN_MAX, TERMIN_MIN } from '../domain/plan';
import {
  abwesenheitFehler,
  abwesenheitenAm,
  addDays,
  fmtDatum,
  fmtTag,
  isoDate,
  istGanztaegig,
  kalenderwoche,
  mondayOf,
  weekDates,
  wochenPlan,
} from '../domain/abwesenheit';
import { fmt, STEP, uid } from '../domain/time';
import { groupedPersons } from '../domain/groups';
import { fmtDate } from '../lib/download';
import type { Action } from '../state/store';
import type { ConfirmRequest } from './ConfirmDialog';
import { Timeline } from './Timeline';
import { ChevronLeft, ChevronRight } from './Icons';

const DAY_FULL: Record<Day, string> = { Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag', Fr: 'Freitag' };
const ARTEN: AbwesenheitArt[] = ['urlaub', 'krank', 'fortbildung', 'sonstiges'];

interface Props {
  data: AppData;
  dispatch: (a: Action) => void;
  confirm: (r: ConfirmRequest) => void;
  onOpenProfile: (personId: string, opener: HTMLElement) => void;
  notify: (msg: string) => void;
}

function AbwesenheitForm({ data, initial, onSave, onCancel }: { data: AppData; initial: Abwesenheit; onSave: (a: Abwesenheit) => void; onCancel: () => void }) {
  const [a, setA] = useState<Abwesenheit>(initial);
  const [tried, setTried] = useState(false);
  const id = useId();
  const zeitweise = a.start !== undefined && a.end !== undefined;
  const eintaegig = a.von && a.von === a.bis;
  const times: number[] = [];
  for (let h = TERMIN_MIN; h <= TERMIN_MAX + 1e-9; h += STEP) times.push(Math.round(h * 4) / 4);
  const errors = abwesenheitFehler(a);

  return (
    <form
      className="card abw-form"
      aria-label="Abwesenheit eintragen"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!errors.length) onSave({ ...a, notiz: a.art === 'krank' ? undefined : a.notiz?.trim() || undefined });
      }}
    >
      <div className="form-grid">
        <div>
          <label className="field-label" htmlFor={`${id}-p`}>Person</label>
          <select id={`${id}-p`} className="input" value={a.personId} onChange={(e) => setA({ ...a, personId: e.target.value })} autoFocus>
            <option value="">– bitte wählen –</option>
            {groupedPersons(data).map(({ group, members }) =>
              members.length ? (
                <optgroup key={group.id} label={group.name}>
                  {members.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              ) : null,
            )}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor={`${id}-art`}>Art</label>
          <select id={`${id}-art`} className="input" value={a.art} onChange={(e) => setA({ ...a, art: e.target.value as AbwesenheitArt })}>
            {ARTEN.map((x) => (
              <option key={x} value={x}>{x === 'sonstiges' ? 'Sonstiges (abwesend)' : ABWESENHEIT_LABEL[x]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor={`${id}-von`}>Von</label>
          <input
            id={`${id}-von`}
            type="date"
            className="input"
            value={a.von}
            onChange={(e) => {
              const von = e.target.value;
              // „bis“ mitziehen, solange es davor läge oder leer ist
              const bis = !a.bis || a.bis < von ? von : a.bis;
              setA({ ...a, von, bis, ...(von !== bis ? { start: undefined, end: undefined } : {}) });
            }}
          />
        </div>
        <div>
          <label className="field-label" htmlFor={`${id}-bis`}>Bis (einschließlich)</label>
          <input
            id={`${id}-bis`}
            type="date"
            className="input"
            value={a.bis}
            min={a.von || undefined}
            onChange={(e) => setA({ ...a, bis: e.target.value, ...(e.target.value !== a.von ? { start: undefined, end: undefined } : {}) })}
          />
        </div>
      </div>

      <div className="abw-row">
        <label className="check">
          <input
            type="checkbox"
            checked={zeitweise}
            disabled={!eintaegig}
            onChange={(e) => setA(e.target.checked ? { ...a, start: 9, end: 12 } : { ...a, start: undefined, end: undefined })}
          />
          Nur zeitweise
        </label>
        {zeitweise ? (
          <span className="list-row" style={{ margin: 0 }}>
            <select className="input sm" aria-label="Abwesend von (Uhrzeit)" value={a.start} onChange={(e) => setA({ ...a, start: Number(e.target.value) })}>
              {times.map((h) => <option key={h} value={h}>{fmt(h)}</option>)}
            </select>
            –
            <select className="input sm" aria-label="Abwesend bis (Uhrzeit)" value={a.end} onChange={(e) => setA({ ...a, end: Number(e.target.value) })}>
              {times.map((h) => <option key={h} value={h}>{fmt(h)}</option>)}
            </select>
          </span>
        ) : (
          <span className="hint">{eintaegig ? 'Sonst ganztägig.' : 'Uhrzeiten nur bei einem einzelnen Tag; mehrere Tage gelten ganztägig.'}</span>
        )}
      </div>

      {a.art === 'krank' ? (
        <p className="hint abw-privacy">Bei Krankheit werden keine Gründe gespeichert – Gesundheitsdaten gehören nicht in die Plandatei.</p>
      ) : (
        <div style={{ marginTop: 12 }}>
          <label className="field-label" htmlFor={`${id}-n`}>Notiz (optional)</label>
          <input id={`${id}-n`} className="input" placeholder={a.art === 'fortbildung' ? 'z. B. Sprachförderung, Frankfurt' : 'z. B. Umzug'} value={a.notiz ?? ''} onChange={(e) => setA({ ...a, notiz: e.target.value })} />
        </div>
      )}

      {tried && errors.length > 0 && (
        <div className="issues" role="alert">
          {errors.map((e) => <p key={e}>{e}</p>)}
        </div>
      )}
      <div className="list-row" style={{ marginTop: 16, marginBottom: 0 }}>
        <button type="submit" className="cta">Abwesenheit speichern</button>
        <button type="button" className="pill" onClick={onCancel}>Abbrechen</button>
      </div>
    </form>
  );
}

export function abwesenheitText(a: Abwesenheit): string {
  const zeit = a.von === a.bis ? fmtDatum(a.von) : `${fmtTag(a.von)}–${fmtDatum(a.bis)}`;
  return `${ABWESENHEIT_LABEL[a.art]} · ${zeit}${istGanztaegig(a) ? '' : `, ${fmt(a.start!)}–${fmt(a.end!)}`}`;
}

export function WeekView({ data, dispatch, confirm, onOpenProfile, notify }: Props) {
  const heute = isoDate(new Date());
  const [monday, setMonday] = useState(() => mondayOf(heute));
  const dates = weekDates(monday);
  const heuteDay = DAYS.find((d) => dates[d] === heute);
  const [day, setDay] = useState<Day>(heuteDay ?? 'Mo');
  const [editing, setEditing] = useState<Abwesenheit | null>(null);
  const { persons, settings } = data;

  const plan = useMemo(() => wochenPlan(data.plans.geltend, monday, data.abwesenheiten), [data.plans.geltend, monday, data.abwesenheiten]);
  const results = useMemo(() => {
    const r = {} as Record<Day, DayResult>;
    for (const d of DAYS) r[d] = evaluateDay(persons, plan, d, settings, data.termine, { ohneAbweichung: true });
    return r;
  }, [persons, plan, settings, data.termine]);
  const result = results[day];

  const abwesendHeute = useMemo(() => {
    const m: Record<string, Abwesenheit[]> = {};
    for (const p of persons) {
      const l = abwesenheitenAm(p.id, dates[day], data.abwesenheiten);
      if (l.length) m[p.id] = l;
    }
    return m;
  }, [persons, dates, day, data.abwesenheiten]);
  const wocheAbwesend = useMemo(() => {
    const m: Record<string, Day[]> = {};
    for (const p of persons) {
      const tage = DAYS.filter((d) => abwesenheitenAm(p.id, dates[d], data.abwesenheiten).some(istGanztaegig));
      if (tage.length) m[p.id] = tage;
    }
    return m;
  }, [persons, dates, data.abwesenheiten]);

  const personFindings = useMemo(() => {
    const m: Record<string, typeof result.findings> = {};
    for (const f of result.findings) if (f.personId) (m[f.personId] ??= []).push(f);
    return m;
  }, [result]);

  const view = viewRange(settings.open, settings.close, plan, day, data.termine);
  const nameOf = (id: string) => persons.find((p) => p.id === id)?.name ?? 'Unbekannt';
  const c = result.counts;
  const tone = (x: { v: number; h: number }) => (x.v ? 'v' : x.h ? 'h' : 'ok');
  const statusShort = (x: { v: number; h: number }) =>
    x.v ? (x.v === 1 ? '1 Problem' : `${x.v} Probleme`) : x.h ? (x.h === 1 ? '1 Hinweis' : `${x.h} Hinweise`) : 'Alles gut';

  const aktuell = data.abwesenheiten.filter((a) => a.bis >= heute).sort((x, y) => x.von.localeCompare(y.von) || nameOf(x.personId).localeCompare(nameOf(y.personId)));
  const vergangen = data.abwesenheiten.filter((a) => a.bis < heute);
  const neu = (): Abwesenheit => ({ id: uid('abw'), personId: '', art: 'urlaub', von: dates[day], bis: dates[day] });
  const goWeek = (n: number) => {
    const m = addDays(monday, 7 * n);
    setMonday(m);
    const t = DAYS.find((d) => weekDates(m)[d] === heute);
    setDay(t ?? 'Mo');
  };

  return (
    <>
      <div className="woche-head">
        <div className="woche-nav">
          <button className="icon-btn" onClick={() => goWeek(-1)} aria-label="Vorige Woche" title="Vorige Woche"><ChevronLeft /></button>
          <h2>
            KW {kalenderwoche(monday)} <span className="woche-range">{fmtTag(dates.Mo)}–{fmtDatum(dates.Fr)}</span>
          </h2>
          <button className="icon-btn" onClick={() => goWeek(1)} aria-label="Nächste Woche" title="Nächste Woche"><ChevronRight /></button>
          {monday !== mondayOf(heute) && (
            <button className="linkbtn" onClick={() => { setMonday(mondayOf(heute)); setDay(DAYS.find((d) => weekDates(mondayOf(heute))[d] === heute) ?? 'Mo'); }}>
              Zur aktuellen Woche
            </button>
          )}
        </div>
        {!editing && (
          <button className="cta" onClick={() => setEditing(neu())}>+ Abwesenheit eintragen</button>
        )}
      </div>
      <p className="hint woche-hint">
        Grundlage ist der geltende Rahmenplan (seit {fmtDate(data.plans.geltend.since)}). Abwesenheiten gelten nur für ihre Tage – der Rahmenplan selbst bleibt unverändert.
      </p>

      {editing && (
        <AbwesenheitForm
          key={editing.id}
          data={data}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(a) => {
            dispatch({ type: 'saveAbwesenheit', abwesenheit: a });
            setEditing(null);
            // zur Woche springen, in der die Abwesenheit beginnt
            const m = mondayOf(a.von);
            if (a.bis < dates.Mo || a.von > dates.Fr) {
              setMonday(m);
              setDay(DAYS.find((d) => weekDates(m)[d] === a.von) ?? 'Mo');
            }
            notify(`${nameOf(a.personId)}: ${abwesenheitText(a)} eingetragen.`);
          }}
        />
      )}

      <div className="days" role="group" aria-label="Wochentag">
        {DAYS.map((d) => {
          const dc = results[d].counts;
          const n = persons.filter((p) => abwesenheitenAm(p.id, dates[d], data.abwesenheiten).length).length;
          return (
            <button
              key={d}
              className="day-card"
              aria-pressed={day === d}
              aria-label={`${DAY_FULL[d]}, ${fmtDatum(dates[d])}: ${statusShort(dc)}${n ? `, ${n} abwesend` : ''}`}
              onClick={() => setDay(d)}
            >
              <span className="day-name">
                {d} {fmtTag(dates[d])}
                {dates[d] === heute && <span className="today-tag">heute</span>}
              </span>
              <span className={`chip tone-${tone(dc)}`}>
                <span className="dot" />
                {statusShort(dc)}
              </span>
              {n > 0 && <span className="abs-count">{n} abwesend</span>}
            </button>
          );
        })}
      </div>

      <section className="card plan-card" aria-labelledby="woche-title">
        <h2 id="woche-title" className="visually-hidden">Besetzung am {DAY_FULL[day]}, {fmtDatum(dates[day])}</h2>
        <div className="plan-toolbar">
          <div className={`status-pill tone-${tone(c)}`} aria-live="polite">
            <span className="status-num" aria-hidden="true">{c.v ? c.v : c.h ? '!' : '✓'}</span>
            <span className="status-text">
              <strong>{c.v ? statusShort(c) : c.h ? 'Keine Probleme' : 'Alles gut besetzt'}</strong>
              {c.v > 0 && c.h > 0 && <span className="status-sub"> · {c.h === 1 ? '1 Hinweis' : `${c.h} Hinweise`}</span>}
            </span>
          </div>
          <span className="plan-where">{DAY_FULL[day]}, {fmtDatum(dates[day])} · mit Abwesenheiten</span>
        </div>
        <div className="abs-summary">
          <h3>Abwesend</h3>
          {Object.keys(abwesendHeute).length === 0 ? (
            <span className="hint">niemand</span>
          ) : (
            <ul>
              {Object.entries(abwesendHeute).map(([pid, l]) =>
                l.map((a) => (
                  <li key={a.id}>
                    <strong>{nameOf(pid)}</strong> {ABWESENHEIT_LABEL[a.art]}
                    {!istGanztaegig(a) && ` ${fmt(a.start!)}–${fmt(a.end!)}`}
                  </li>
                )),
              )}
            </ul>
          )}
        </div>
        <div className="scroll-x">
          <div className="tl-inner">
            <Timeline
              data={data}
              plan={plan}
              variant="geltend"
              day={day}
              result={result}
              selected={null}
              onSelect={() => {}}
              dispatch={dispatch}
              onOpenProfile={onOpenProfile}
              personFindings={personFindings}
              renderActions={() => null}
              view={view}
              abwesend={abwesendHeute}
              wocheAbwesend={wocheAbwesend}
              hideSoll
            />
          </div>
        </div>
      </section>

      <h2 className="h2">Was am {DAY_FULL[day]}, {fmtTag(dates[day])} auffällt</h2>
      <div className="findings">
        {result.findings.filter((f) => !f.quiet).map((f, i) => (
          <div className={`finding tone-${f.kind}`} key={i}>
            <span className="dot" />
            <div>
              <div className="finding-title">
                <span className="visually-hidden">{f.kind === 'v' ? 'Problem: ' : f.kind === 'h' ? 'Hinweis: ' : ''}</span>
                {f.title}
              </div>
              <div className="finding-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="h2">Abwesenheiten</h2>
      {aktuell.length === 0 ? (
        <p className="hint">Keine aktuellen oder geplanten Abwesenheiten.</p>
      ) : (
        <ul className="abw-list">
          {aktuell.map((a) => (
            <li key={a.id}>
              <span className={`abw-tag abs-${a.art}`}>{ABWESENHEIT_LABEL[a.art]}</span>
              <strong>{nameOf(a.personId)}</strong>
              <span className="abw-zeit">
                {a.von === a.bis ? fmtDatum(a.von) : `${fmtTag(a.von)}–${fmtDatum(a.bis)}`}
                {!istGanztaegig(a) && `, ${fmt(a.start!)}–${fmt(a.end!)}`}
              </span>
              {a.notiz && <span className="hint">· {a.notiz}</span>}
              <span className="spacer" />
              <button className="linkbtn" onClick={() => setMonday(mondayOf(a.von))}>Woche zeigen</button>
              <button className="linkbtn" onClick={() => setEditing(a)}>Bearbeiten</button>
              <button
                className="linkbtn danger"
                onClick={() =>
                  confirm({
                    title: 'Abwesenheit entfernen?',
                    body: <p>{nameOf(a.personId)}: {abwesenheitText(a)}</p>,
                    confirmLabel: 'Entfernen',
                    danger: true,
                    onConfirm: () => dispatch({ type: 'deleteAbwesenheit', id: a.id }),
                  })
                }
              >
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      )}
      {vergangen.length > 0 && (
        <p className="hint">
          {vergangen.length === 1 ? '1 vergangene Abwesenheit ist' : `${vergangen.length} vergangene Abwesenheiten sind`} noch gespeichert.{' '}
          <button
            className="linkbtn"
            onClick={() =>
              confirm({
                title: 'Vergangene Abwesenheiten löschen?',
                body: <p>Alle Einträge, die vor heute geendet haben, werden gelöscht. Das hält die Plandatei schlank und speichert keine alten (Krankheits-)Daten.</p>,
                confirmLabel: 'Löschen',
                danger: true,
                onConfirm: () => dispatch({ type: 'purgeAbwesenheiten', vor: heute }),
              })
            }
          >
            Vergangene löschen
          </button>
        </p>
      )}
    </>
  );
}
