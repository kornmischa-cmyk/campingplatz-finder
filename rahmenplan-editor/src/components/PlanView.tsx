import { useMemo, useState } from 'react';
import type { AppData, Day, Variant } from '../domain/types';
import { DAYS, TYPE_LABEL } from '../domain/types';
import { evaluateDay, fkShort, totShort, weekTable, type DayResult } from '../domain/rules';
import { blocksOf } from '../domain/plan';
import { applyDrag, canDrag, isLocked, planDrag, type DragMode } from '../domain/drag';
import { fmt, fmtDecimal, fmtShort, STEP } from '../domain/time';
import type { Action } from '../state/store';
import { fmtDate } from '../lib/download';
import { Timeline, type Selection } from './Timeline';
import type { ConfirmRequest } from './ConfirmDialog';
import { LockIcon } from './Icons';
import { groupColor } from '../domain/groups';

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

const DAY_FULL: Record<Day, string> = { Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag', Fr: 'Freitag' };

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

  const variantLabel = effVariant === 'test' ? 'Testfassung' : 'Geltender Plan';
  const week = weekTable(persons, plan);
  const span = settings.close - settings.open;
  const pct = (h: number) => ((h - settings.open) / span) * 100;
  const randText = settings.randzeiten.map((r) => `${fmtShort(r.start)}–${fmtShort(r.end)} mind. ${r.minPersonen}`).join(', ');

  const tone = (c: { v: number; h: number }) => (c.v ? 'v' : c.h ? 'h' : 'ok');
  const statusShort = (c: { v: number; h: number }) =>
    c.v ? (c.v === 1 ? '1 Problem' : `${c.v} Probleme`) : c.h ? (c.h === 1 ? '1 Hinweis' : `${c.h} Hinweise`) : 'Alles gut';
  const c = result.counts;
  const t = tone(c);
  const statusTitle = c.v ? statusShort(c) : c.h ? 'Keine Probleme' : 'Alles gut besetzt';
  const statusSub = c.v
    ? 'Diese Punkte sollten gelöst sein, bevor der Plan gilt.'
    : c.h
      ? `${statusShort(c)} zum Prüfen – sonst ist alles in Ordnung.`
      : 'Alle Regeln für diesen Tag sind erfüllt.';

  // Besetzung: Säulenhöhe = Personen / max; dunkler Anteil = Fachkräfte
  const maxT = Math.max(4, ...result.slots.map((s) => s.tot));
  const covHours: { h: number; label: string }[] = [];
  for (let h = Math.ceil(settings.open); h < settings.close - 0.5 + 1e-9; h++) {
    const s = result.slots.find((x) => Math.abs(x.h - h - 0.5) < 1e-9) ?? result.slots.find((x) => Math.abs(x.h - h) < 1e-9);
    if (s) covHours.push({ h, label: `${s.tot} / ${s.fk}` });
  }
  const unlockable = !!selBlock && effVariant === 'test' && isLocked(selBlock) && (selBlock.type === 'betreuung' || selBlock.type === 'verfuegung');

  return (
    <>
      <div className="fassung">
        <div className="seg" role="group" aria-label="Fassung">
          <button aria-pressed={effVariant === 'geltend'} onClick={() => { setVariant('geltend'); select(null); }}>
            Geltender Plan
          </button>
          {hasTest ? (
            <button aria-pressed={effVariant === 'test'} onClick={() => setVariant('test')}>
              Testfassung
            </button>
          ) : (
            <button
              className="add"
              onClick={() => {
                dispatch({ type: 'createTest' });
                setVariant('test');
              }}
            >
              + Neue Testfassung
            </button>
          )}
        </div>
        <div className="fassung-right">
          <span className="muted">
            {effVariant === 'geltend' ? `Gilt seit ${fmtDate(data.plans.geltend.since)} · Verschieben geht nur in der Testfassung` : 'Verschieben geht nur in der Testfassung'}
          </span>
          {hasTest && (
            <button className="linkbtn danger" onClick={onDiscard}>
              Testfassung verwerfen
            </button>
          )}
          <button className="cta" onClick={onAdopt} disabled={effVariant !== 'test'}>
            Als geltend übernehmen
          </button>
        </div>
      </div>

      <div className="days" role="group" aria-label="Wochentag">
        {DAYS.map((d) => {
          const dc = results[d].counts;
          const aria = `${d}: ${dc.v ? dc.v + (dc.v === 1 ? ' Verstoß' : ' Verstöße') : 'keine Verstöße'}${dc.h ? ', ' + dc.h + (dc.h === 1 ? ' Hinweis' : ' Hinweise') : ''}`;
          return (
            <button key={d} className="day-card" aria-pressed={day === d} aria-label={aria} onClick={() => { setDay(d); select(null); }}>
              <span className="day-name">{DAY_FULL[d]}</span>
              <span className={`chip tone-${tone(dc)}`}>
                <span className="dot" />
                {statusShort(dc)}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`status tone-${t}`} aria-live="polite">
        <span className="status-num" aria-hidden="true">{c.v ? c.v : c.h ? '!' : '✓'}</span>
        <div style={{ flex: '1 1 280px' }}>
          <div className="status-kicker">{DAY_FULL[day]} · {variantLabel}</div>
          <div className="status-title">{statusTitle}</div>
          <div className="status-sub">{statusSub}</div>
        </div>
      </div>

      <div className="card">
        <div className="scroll-x">
          <div className="tl-inner">
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
              <div>
                <h3>Besetzung</h3>
                <div className="cov-explain">Wie viele Personen gerade betreuen. Der dunkle Teil sind Fachkräfte.</div>
              </div>
              <div>
                <div className="bars" role="img" aria-label="Besetzung je Viertelstunde">
                  {result.slots.map((s) => {
                    const badT = totShort(s, settings);
                    const badF = fkShort(s, settings);
                    return (
                      <div className="bar-col" key={s.h} title={`${fmt(s.h)} · ${s.tot} Personen, davon ${s.fk} Fachkräfte`}>
                        <div className={`bar-outer${badT || badF ? ' bad' : ''}`} style={{ height: `${Math.max(3, (s.tot / maxT) * 100)}%` }}>
                          <div className={`bar-inner${badF ? ' bad' : ''}`} style={{ height: `${s.tot ? (s.fk / s.tot) * 100 : 0}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="cov-hours" aria-hidden="true">
                  {covHours.map((x) => (
                    <span key={x.h} style={{ left: `${pct(x.h)}%`, width: `${100 / span}%` }}>{x.label}</span>
                  ))}
                </div>
                <div className="legend" style={{ marginTop: 6 }}>
                  <span><i className="sw" style={{ background: 'var(--cov)' }} />Personen</span>
                  <span><i className="sw" style={{ background: 'var(--cov-fk)' }} />davon Fachkräfte</span>
                  <span>
                    <i className="sw" style={{ background: 'var(--cov-fk-bad)' }} />
                    zu wenig – mind. {settings.minFachkraefte} Fachkraft{randText && `, Randzeiten ${randText} Personen`}
                  </span>
                  <span>Zahlen: Personen / Fachkräfte zur halben Stunde</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="legend card-foot">
          <span>
            <span style={{ display: 'inline-flex', gap: 2 }}>
              {data.groups.slice(0, 6).map((g) => {
                const gc = groupColor(data.groups, g.id);
                return <i key={g.id} className="sw t-betreuung" style={{ background: gc.s, borderColor: gc.c }} />;
              })}
            </span>
            Betreuung (in Gruppenfarbe)
          </span>
          {(['verfuegung', 'besprechung', 'anleitung', 'pause'] as const).map((ty) => (
            <span key={ty}>
              <i className={`sw t-${ty}`} />
              {TYPE_LABEL[ty]}
            </span>
          ))}
          <span>
            <LockIcon /> harte Zeit (laut Profil unverrückbar)
          </span>
        </div>
      </div>

      {selected && selBlock && selPerson && (
        <div className="selbar">
          <div className="selbar-text" aria-live="polite">
            <strong>
              {selPerson.name} · {TYPE_LABEL[selBlock.type]} · {fmt(selBlock.start)}–{fmt(selBlock.end)}
              {selBlock.verb === 'hart' && (selBlock.unlocked ? ' · harte Zeit (entsperrt)' : ' · harte Zeit')}
            </strong>
            <div className="selbar-sub">
              {effVariant === 'geltend'
                ? 'Der geltende Plan ist schreibgeschützt. Zum Ändern in die Testfassung wechseln.'
                : selDraggable
                  ? 'Ziehen verschiebt · Ränder ziehen ändert die Dauer · Tastatur: ←/→, Alt = Beginn, Umschalt = Ende'
                  : unlockable
                    ? 'Laut Profil unverrückbar. Zum Ändern bewusst entsperren.'
                    : 'Dieser Blocktyp lässt sich nicht verschieben.'}
            </div>
          </div>
          {unlockable ? (
            confirmUnlock ? (
              <span className="confirm" role="group" aria-label="Entsperren bestätigen">
                Harte Zeit wirklich ändern? Die Abweichung bleibt als Hinweis sichtbar.
                <button className="dbtn warn" onClick={() => { dispatch({ type: 'setUnlocked', personId: selected.personId, day: selected.day, blockId: selBlock.id, unlocked: true }); setConfirmUnlock(false); }}>
                  Ja, entsperren
                </button>
                <button className="linkbtn" onClick={() => setConfirmUnlock(false)}>Abbrechen</button>
              </span>
            ) : (
              <button className="dbtn" onClick={() => setConfirmUnlock(true)}>Entsperren …</button>
            )
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label="Block anpassen">
              <button className="dbtn" onClick={() => nudge(-STEP, 'move')} disabled={!selDraggable} aria-label="15 Minuten früher">◂ 15 Min</button>
              <button className="dbtn" onClick={() => nudge(STEP, 'move')} disabled={!selDraggable} aria-label="15 Minuten später">15 Min ▸</button>
              <button className="dbtn" onClick={() => nudge(-STEP, 'r')} disabled={!selDraggable}>Ende −15</button>
              <button className="dbtn" onClick={() => nudge(STEP, 'r')} disabled={!selDraggable}>Ende +15</button>
              {effVariant === 'test' && selBlock.verb === 'hart' && selBlock.unlocked && (
                <button className="dbtn" onClick={() => dispatch({ type: 'setUnlocked', personId: selected.personId, day: selected.day, blockId: selBlock.id, unlocked: false })}>
                  Wieder sperren
                </button>
              )}
            </div>
          )}
          <button className="linkbtn" onClick={() => select(null)}>Fertig</button>
        </div>
      )}

      <h2 className="h2">Was am {DAY_FULL[day]} auffällt</h2>
      <div className="findings">
        {result.findings.map((f, i) => (
          <div className={`finding tone-${f.kind}`} key={i}>
            <span className="dot" />
            <div>
              <div className="finding-title">
                <span className="visually-hidden">{f.kind === 'v' ? 'Verstoß: ' : f.kind === 'h' ? 'Hinweis: ' : ''}</span>
                {f.title}
              </div>
              <div className="finding-desc">{f.desc}</div>
              {f.canResetFromProfile && f.personId && effVariant === 'test' && (
                <button className="linkbtn" onClick={() => dispatch({ type: 'resetDayFromProfile', personId: f.personId!, day })}>
                  Normalzeit übernehmen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <details className="fold">
        <summary>Wochenübersicht · {variantLabel}</summary>
        <div className="fold-body scroll-x" style={{ paddingTop: 0, marginTop: 12 }}>
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
                  {r.cells.map((cell, i) =>
                    cell ? <td key={i}>{fmt(cell.start)}–{fmt(cell.end)}</td> : <td key={i} className="off">—</td>,
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
      </details>

      {settings.showPausenstaffel && (
        <details className="fold">
          <summary>Pausenregeln</summary>
          <div className="fold-body">
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
            <div className="hint" style={{ marginTop: 8, fontSize: 12 }}>
              <strong>Zusätzlich, unabhängig von der Staffel:</strong> länger als {fmtDecimal(settings.maxAmStueck, settings.maxAmStueck % 1 ? 2 : 0)} Stunden
              am Stück ohne Ruhepause ist unzulässig, unabhängig davon, wo die Pflichtpause im Tag liegt. Geprüft wird die Spalte „Volljährig“ mit den
              Werten aus den Einstellungen. Die Regeln für unter 18-Jährige werden noch nicht geprüft.
            </div>
          </div>
        </details>
      )}

      <p className="footnote">
        Fachkraft ist, wer im Personalprofil als „zählt als Fachkraft“ markiert ist; PiVA-Auszubildende sind in den Beispieldaten nicht markiert. Die
        Leitung ist Reserve und steht nicht im Plan. Krankheit und Urlaub gehören in die konkrete Woche, nicht in den Rahmenplan. Die Regeln sind
        beispielhaft und in den Einstellungen anpassbar; sie ersetzen keine fachliche oder rechtliche Prüfung.
      </p>
    </>
  );
}
