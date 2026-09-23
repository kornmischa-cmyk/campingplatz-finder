import { useMemo, useState } from 'react';
import type { AppData, Day, Variant } from '../domain/types';
import { DAYS, TYPE_LABEL } from '../domain/types';
import { evaluateDay, fkShort, totShort, weekTable, type DayResult } from '../domain/rules';
import { blocksOf } from '../domain/plan';
import { applyDrag, canDrag, isLocked, planDrag, type DragMode } from '../domain/drag';
import { fmt, fmtDecimal, STEP } from '../domain/time';
import type { Action } from '../state/store';
import { fmtDate } from '../lib/download';
import { Timeline, type Selection } from './Timeline';
import type { ConfirmRequest } from './ConfirmDialog';

interface Props {
  data: AppData;
  dispatch: (a: Action) => void;
  variant: Variant;
  setVariant: (v: Variant) => void;
  day: Day;
  setDay: (d: Day) => void;
  onOpenProfile: (personId: string, opener: HTMLElement) => void;
  confirm: (r: ConfirmRequest) => void;
}

const TYPE_ORDER = ['betreuung', 'verfuegung', 'besprechung', 'anleitung', 'pause'] as const;
const TYPE_NOTE: Record<string, string> = {
  betreuung: ' (zählt auf Schlüssel)',
  pause: ' (weder Arbeits- noch Betreuungszeit)',
};

export function PlanView({ data, dispatch, variant, setVariant, day, setDay, onOpenProfile, confirm }: Props) {
  const { settings, persons } = data;
  const hasTest = !!data.plans.test;
  const effVariant: Variant = variant === 'test' && hasTest ? 'test' : 'geltend';
  const plan = effVariant === 'test' ? data.plans.test! : data.plans.geltend;
  const [selected, setSelected] = useState<Selection | null>(null);
  const [confirmUnlock, setConfirmUnlock] = useState(false);

  const results = useMemo(() => {
    const r = {} as Record<Day, DayResult>;
    for (const d of DAYS) r[d] = evaluateDay(persons, plan, d, settings);
    return r;
  }, [persons, plan, settings]);
  const result = results[day];

  const select = (s: Selection | null) => {
    if (s?.blockId !== selected?.blockId) setConfirmUnlock(false);
    setSelected(s);
  };

  // Auswahl auflösen
  const selPerson = selected && persons.find((p) => p.id === selected.personId);
  const selBlocks = selected ? blocksOf(plan, selected.personId, selected.day) : [];
  const selIdx = selected ? selBlocks.findIndex((b) => b.id === selected.blockId) : -1;
  const selBlock = selIdx >= 0 ? selBlocks[selIdx] : null;
  const selDraggable = !!selBlock && canDrag(selBlock, effVariant);

  const nudge = (delta: number, mode: DragMode) => {
    if (!selected || !selBlock || !selDraggable) return;
    const p = planDrag(selBlocks, selIdx, mode, settings.open, settings.close);
    dispatch({ type: 'setTestDay', personId: selected.personId, day: selected.day, blocks: applyDrag(selBlocks, p, delta) });
  };

  const weekCounts = (v: 'test' | 'geltend') => {
    const pl = v === 'test' ? data.plans.test : data.plans.geltend;
    if (!pl) return { v: 0, h: 0 };
    return DAYS.reduce(
      (acc, d) => {
        const c = evaluateDay(persons, pl, d, settings).counts;
        return { v: acc.v + c.v, h: acc.h + c.h };
      },
      { v: 0, h: 0 },
    );
  };

  const onAdopt = () => {
    const t = weekCounts('test');
    const g = weekCounts('geltend');
    confirm({
      title: 'Testfassung als geltend übernehmen?',
      body: (
        <>
          <p>
            Der bisher geltende Plan wird ersetzt. Eine Historie gibt es noch nicht. Wenn du den alten Stand behalten willst, exportiere vorher eine
            Sicherung.
          </p>
          <p>
            Woche geltend: <strong>{g.v} Verstöße</strong>, {g.h} Hinweise
            <br />
            Woche Testfassung: <strong>{t.v} Verstöße</strong>, {t.h} Hinweise
          </p>
        </>
      ),
      confirmLabel: 'Übernehmen',
      onConfirm: () => {
        dispatch({ type: 'adoptTest' });
        setVariant('geltend');
        select(null);
      },
    });
  };

  const onDiscard = () =>
    confirm({
      title: 'Testfassung verwerfen?',
      body: <p>Alle Änderungen in der Testfassung gehen verloren. Der geltende Plan bleibt unverändert.</p>,
      confirmLabel: 'Verwerfen',
      danger: true,
      onConfirm: () => {
        dispatch({ type: 'discardTest' });
        setVariant('geltend');
        select(null);
      },
    });

  const variantLabel = effVariant === 'test' ? 'Testfassung' : `Geltender Plan · seit ${fmtDate(data.plans.geltend.since)}`;
  const week = weekTable(persons, plan);
  const randText = settings.randzeiten.map((r) => `${fmt(r.start)}–${fmt(r.end)} mind. ${r.minPersonen}`).join(', ');

  return (
    <>
      <div className="bar">
        <span className="bar-label">Fassung</span>
        <button className="btn" aria-pressed={effVariant === 'geltend'} onClick={() => { setVariant('geltend'); select(null); }}>
          Geltender Plan
        </button>
        {hasTest ? (
          <button className="btn" aria-pressed={effVariant === 'test'} onClick={() => setVariant('test')}>
            Testfassung
          </button>
        ) : (
          <button
            className="btn dashed"
            onClick={() => {
              dispatch({ type: 'createTest' });
              setVariant('test');
            }}
          >
            + Neue Testfassung
          </button>
        )}
        {hasTest && (
          <>
            <button className="btn primary" onClick={onAdopt} disabled={effVariant !== 'test'}>
              Als geltend übernehmen
            </button>
            <button className="linkbtn danger" onClick={onDiscard}>
              Testfassung verwerfen
            </button>
          </>
        )}
        {effVariant === 'geltend' && <span className="hint">Der geltende Plan ist schreibgeschützt. Änderungen erfolgen in der Testfassung.</span>}
      </div>

      <div className="bar" role="group" aria-label="Wochentag">
        <span className="bar-label">Tag</span>
        {DAYS.map((d) => {
          const c = results[d].counts;
          const aria = `${d}: ${c.v ? c.v + (c.v === 1 ? ' Verstoß' : ' Verstöße') : 'keine Verstöße'}${c.h ? ', ' + c.h + (c.h === 1 ? ' Hinweis' : ' Hinweise') : ''}`;
          return (
            <button key={d} className="btn" aria-pressed={day === d} aria-label={aria} title={aria} onClick={() => { setDay(d); select(null); }}>
              <span className="day-btn-inner">
                {d}
                <span aria-hidden="true" className={`mark ${c.v ? 'v' : c.h ? 'h' : 'ok'}`}>
                  {c.v ? c.v : c.h ? '!' : '✓'}
                </span>
              </span>
            </button>
          );
        })}
        <span aria-hidden="true" className="legend-inline">
          <span><span className="mark v">3</span>Anzahl Regelverstöße</span>
          <span><span className="mark h">!</span>nur Hinweise</span>
          <span><span className="mark ok">✓</span>alles in Ordnung</span>
        </span>
      </div>

      <div className="scroll-x">
        <div className="tl-wrap">
          <div className="tl-title">
            <h2>Rahmenplan · {day}</h2>
            <span className="variant-label">{variantLabel}</span>
          </div>

          <Timeline
            data={data}
            plan={plan}
            variant={effVariant}
            day={day}
            result={result}
            selected={selected}
            onSelect={select}
            dispatch={dispatch}
            onOpenProfile={onOpenProfile}
          />

          <div className="coverage">
            <div className="row" style={{ marginBottom: 6 }}>
              <h3>Abdeckung</h3>
              <div className="cov-explain">
                Wie viele Personen in der Betreuung eingeplant sind, je Viertelstunde (Zahl alle 30 Min.). Pausen, Besprechungen und Verfügungszeit
                zählen nicht mit.
              </div>
            </div>
            <div className="row" style={{ alignItems: 'center' }}>
              <div className="cov-label">Personen gesamt</div>
              <div className="cov-row" role="img" aria-label="Betreuende Personen je Zeitabschnitt">
                {result.slots.map((s, i) => (
                  <div key={s.h} className={totShort(s, settings) ? 'bad' : ''} title={`${fmt(s.h)} · ${s.tot} Personen`}>
                    {i % 2 === 0 ? s.tot : ''}
                  </div>
                ))}
              </div>
            </div>
            <div className="row" style={{ alignItems: 'center', marginTop: 2 }}>
              <div className="cov-label">davon Fachkräfte</div>
              <div className="cov-row" role="img" aria-label="Davon Fachkräfte je Zeitabschnitt">
                {result.slots.map((s, i) => (
                  <div key={s.h} className={fkShort(s, settings) ? 'bad' : ''} title={`${fmt(s.h)} · ${s.fk} Fachkräfte`}>
                    {i % 2 === 0 ? s.fk : ''}
                  </div>
                ))}
              </div>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <div />
              <div className="cov-legend">
                <span><i className="swatch" style={{ background: 'var(--line)' }} />Mindestbesetzung erfüllt</span>
                <span>
                  <i className="swatch" style={{ background: 'var(--bad-light)', border: '1px solid var(--bad)' }} />
                  unterschritten: mind. {settings.minFachkraefte} Fachkraft durchgehend
                  {randText && ` · Randzeiten ${randText} Personen`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selected && selBlock && selPerson && (
        <div className="selbar">
          <span className="selbar-text" aria-live="polite">
            Ausgewählt:{' '}
            <strong>
              {selPerson.name} · {TYPE_LABEL[selBlock.type]} · {fmt(selBlock.start)}–{fmt(selBlock.end)}
              {selBlock.verb === 'hart' && (selBlock.unlocked ? ' · harte Zeit (entsperrt)' : ' · harte Zeit (gesperrt)')}
            </strong>
            <br />
            {effVariant === 'geltend'
              ? 'Der geltende Plan ist schreibgeschützt. Wechsle zur Testfassung, um Zeiten zu ändern.'
              : selDraggable
                ? 'Block ziehen verschiebt, Ränder ziehen ändert die Dauer · Tastatur: ←/→ verschieben, Alt+←/→ Beginn, Umschalt+←/→ Ende'
                : isLocked(selBlock)
                  ? 'Laut Profil unverrückbar. Zum Ändern bewusst entsperren.'
                  : 'Dieser Blocktyp lässt sich nicht verschieben.'}
          </span>
          {effVariant === 'test' && isLocked(selBlock) && (selBlock.type === 'betreuung' || selBlock.type === 'verfuegung') ? (
            confirmUnlock ? (
              <span className="confirm" role="group" aria-label="Entsperren bestätigen">
                Harte Zeit wirklich ändern? Die Abweichung bleibt als Hinweis sichtbar.
                <button className="btn" onClick={() => { dispatch({ type: 'setUnlocked', personId: selected.personId, day: selected.day, blockId: selBlock.id, unlocked: true }); setConfirmUnlock(false); }}>
                  Ja, entsperren
                </button>
                <button className="linkbtn muted" onClick={() => setConfirmUnlock(false)}>Abbrechen</button>
              </span>
            ) : (
              <button className="btn" onClick={() => setConfirmUnlock(true)}>Entsperren …</button>
            )
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label="Block anpassen">
              <button className="btn" onClick={() => nudge(-STEP, 'move')} disabled={!selDraggable}>◂ 15 Min früher</button>
              <button className="btn" onClick={() => nudge(STEP, 'move')} disabled={!selDraggable}>15 Min später ▸</button>
              <button className="btn" onClick={() => nudge(-STEP, 'r')} disabled={!selDraggable}>Ende −15</button>
              <button className="btn" onClick={() => nudge(STEP, 'r')} disabled={!selDraggable}>Ende +15</button>
              {effVariant === 'test' && selBlock.verb === 'hart' && selBlock.unlocked && (
                <button className="btn" onClick={() => dispatch({ type: 'setUnlocked', personId: selected.personId, day: selected.day, blockId: selBlock.id, unlocked: false })}>
                  Wieder sperren
                </button>
              )}
            </div>
          )}
          <button className="linkbtn muted" onClick={() => select(null)}>Auswahl aufheben</button>
        </div>
      )}

      <div className="type-legend">
        {TYPE_ORDER.map((t) => (
          <span key={t}>
            <i className={`swatch t-${t}`} />
            {TYPE_LABEL[t]}
            {TYPE_NOTE[t] ?? ''}
          </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg width="9" height="10" viewBox="0 0 9 10" aria-hidden="true"><rect x="0.5" y="4.5" width="8" height="5" rx="0.8" fill="currentColor" /><path d="M2.3 4.5V2.8a2.2 2.2 0 0 1 4.4 0v1.7" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
          harte Zeit (laut Profil unverrückbar)
        </span>
      </div>

      <div className="section">
        <h2 className="section-title">Regelprüfung · {day}</h2>
        {result.findings.map((f, i) => (
          <div className="finding" key={i}>
            <span className={`tag ${f.kind}`}>{f.kind === 'v' ? 'Verstoß' : f.kind === 'h' ? 'Hinweis' : 'OK'}</span>
            <span className="finding-body">
              {f.title}
              <em>{f.desc}</em>
            </span>
            {f.canResetFromProfile && f.personId && effVariant === 'test' && (
              <button className="linkbtn" onClick={() => dispatch({ type: 'resetDayFromProfile', personId: f.personId!, day })}>
                Normalzeit übernehmen
              </button>
            )}
          </div>
        ))}
      </div>

      {settings.showPausenstaffel && (
        <div className="section">
          <h2 className="section-title">Pausenstaffel · hinterlegte Regel</h2>
          <table className="tbl" style={{ maxWidth: 520 }}>
            <thead>
              <tr><th>Arbeitszeit</th><th>Volljährig · §4 ArbZG</th><th>Unter 18 · §11 JArbSchG</th></tr>
            </thead>
            <tbody>
              <tr><td>bis 4,5 h</td><td>keine</td><td>keine</td></tr>
              <tr><td>über 4,5 bis 6 h</td><td>keine</td><td className="warn">30 min</td></tr>
              <tr><td>über 6 bis 9 h</td><td>30 min</td><td className="warn">60 min</td></tr>
              <tr><td>über 9 h</td><td>45 min</td><td className="warn">60 min</td></tr>
            </tbody>
          </table>
          <div className="hint" style={{ marginTop: 8 }}>
            <strong>Zusätzlich, unabhängig von der Staffel:</strong> länger als {fmtDecimal(settings.maxAmStueck, settings.maxAmStueck % 1 ? 2 : 0)} Stunden
            am Stück ohne Ruhepause ist unzulässig, unabhängig davon, wo die Pflichtpause im Tag liegt. Geprüft wird die Spalte „Volljährig“ mit den Werten
            aus den Einstellungen. Die Regeln für unter 18-Jährige werden noch nicht geprüft.
          </div>
        </div>
      )}

      <div className="section">
        <h2 className="section-title">Wochenübersicht · {effVariant === 'test' ? 'Testfassung' : 'Geltender Plan'}</h2>
        <div className="scroll-x">
          <table className="tbl compact">
            <thead>
              <tr>
                <th>Person</th>
                {DAYS.map((d) => <th key={d}>{d}</th>)}
                <th>Ist</th>
                <th>Soll</th>
              </tr>
            </thead>
            <tbody>
              {week.map((r) => (
                <tr key={r.person.id}>
                  <td><strong>{r.person.name}</strong></td>
                  {r.cells.map((c, i) =>
                    c ? <td key={i}>{fmt(c.start)}–{fmt(c.end)}</td> : <td key={i} className="off">—</td>,
                  )}
                  <td className="strong">
                    {fmtDecimal(r.ist, 1)}
                    {Math.abs(r.ist - r.person.soll) > 0.01 && (
                      <span className="hint" style={{ fontWeight: 400 }}>
                        {' '}({r.ist > r.person.soll ? '+' : '−'}{fmtDecimal(Math.abs(r.ist - r.person.soll), 1)})
                      </span>
                    )}
                  </td>
                  <td>{r.person.soll}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="footnote">
        Fachkraft ist, wer im Personalprofil als „zählt als Fachkraft“ markiert ist. PiVA-Auszubildende sind in den Beispieldaten nicht als Fachkraft
        markiert (offener fachlicher Punkt). Der Rahmenplan zeigt den Normalzustand; Krankheit, Urlaub und Ausfälle gehören in die „konkrete Woche“.
        Blöcke sind auswählbar. In der Testfassung lassen sie sich per Ziehen oder mit den 15-Minuten-Tasten verschieben; Abdeckung und Regelprüfung
        rechnen sofort neu. Die Regeln sind beispielhaft hinterlegt und in den Einstellungen anpassbar, sie ersetzen keine fachliche oder rechtliche
        Prüfung.
      </div>
    </>
  );
}
