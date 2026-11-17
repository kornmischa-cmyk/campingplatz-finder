import { useMemo, useState } from 'react';
import type { AppData, Day, Variant } from '../domain/types';
import { DAYS, TYPE_LABEL, type Block, type BlockType } from '../domain/types';
import { evaluateDay, fkShort, totShort, weekTable, type DayResult, type Finding } from '../domain/rules';
import { blocksOf, templateFor } from '../domain/plan';
import { applyDrag, canDrag, isLocked, planDrag, type DragMode } from '../domain/drag';
import { fmt, fmtDecimal, fmtDuration, fmtShort, STEP, uid } from '../domain/time';
import { addBlockAfter, canEdit, deleteBlock, EDIT_TYPES, insertPauseIn, setBlockType, suggestedPause } from '../domain/edit';
import { missingCount, type Action } from '../state/store';
import { dienstTage, dienstWochenFindings } from '../domain/dienste';
import { fmtDate } from '../lib/download';
import { Timeline, type Selection } from './Timeline';
import type { ConfirmRequest } from './ConfirmDialog';
import { LockIcon } from './Icons';
import { TermineCard } from './TermineCard';
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
  goTo: (view: 'personal' | 'settings') => void;
  notify: (msg: string) => void;
}

const DAY_FULL: Record<Day, string> = { Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag', Fr: 'Freitag' };

export function PlanView({ data, dispatch, variant, setVariant, day, setDay, onOpenProfile, confirm, goTo, notify }: Props) {
  const { settings, persons } = data;
  const hasTest = !!data.plans.test;
  const effVariant: Variant = variant === 'test' && hasTest ? 'test' : 'geltend';
  const plan = effVariant === 'test' ? data.plans.test! : data.plans.geltend;
  const [selected, setSelected] = useState<Selection | null>(null);
  const [confirmUnlock, setConfirmUnlock] = useState(false);

  const results = useMemo(() => {
    const r = {} as Record<Day, DayResult>;
    for (const d of DAYS) r[d] = evaluateDay(persons, plan, d, settings, data.termine);
    return r;
  }, [persons, plan, settings, data.termine]);
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

  const selEditable = !!selBlock && canEdit(selBlock, effVariant);
  const setSelDay = (blocks: Block[], blockId: string | null) => {
    if (!selected) return;
    dispatch({ type: 'setTestDay', personId: selected.personId, day: selected.day, blocks });
    select(blockId ? { ...selected, blockId } : null);
  };
  const pauseLen = selPerson && selBlock ? suggestedPause(selBlocks, settings, selPerson.pauseMinuten ?? 0) : 0;
  const canPauseHere = selEditable && !!selBlock && (selBlock.type === 'betreuung' || selBlock.type === 'verfuegung') && selBlock.end - selBlock.start >= STEP * 2 - 1e-9;
  const onInsertPause = () => {
    if (!selBlock) return;
    const r = insertPauseIn(selBlocks, selBlock.id, pauseLen, uid('pause'));
    if (r) setSelDay(r.blocks, r.pauseId);
  };
  const onAddAfter = () => {
    if (!selBlock) return;
    const id = uid('b');
    const next = addBlockAfter(selBlocks, selBlock.end, settings.open, settings.close, id);
    if (next) setSelDay(next, id);
    else notify('Kein freier Platz mehr an diesem Tag.');
  };
  const hasRoomAfter = !!selBlock && !!addBlockAfter(selBlocks, selBlock.end, settings.open, settings.close, 'x');

  const weekCounts = (v: 'test' | 'geltend') => {
    const pl = v === 'test' ? data.plans.test : data.plans.geltend;
    if (!pl) return { v: 0, h: 0, i: 0, soll: 0 };
    const wf = dienstWochenFindings(persons, pl, settings);
    const soll = weekTable(persons, pl).filter((r) => Math.abs(r.ist - r.person.soll) > 0.01).length;
    return DAYS.reduce(
      (acc, d) => {
        const c = evaluateDay(persons, pl, d, settings, data.termine).counts;
        return { ...acc, v: acc.v + c.v, h: acc.h + c.h, i: acc.i + c.i };
      },
      { v: wf.filter((f) => f.kind === 'v').length, h: wf.filter((f) => f.kind === 'h').length, i: 0, soll },
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
          {(t.i > 0 || t.soll > 0) && (
            <p className="hint">
              Zur Kontrolle (kein Problem):{' '}
              {[
                t.i ? `${t.i} ${t.i === 1 ? 'Tag weicht' : 'Tage weichen'} von der Normalarbeitszeit ab` : '',
                t.soll ? `${t.soll} ${t.soll === 1 ? 'Person ist' : 'Personen sind'} nicht genau auf ihrem Wochen-Soll` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
              .
            </p>
          )}
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
  const wochenFindings = useMemo(() => dienstWochenFindings(persons, plan, settings), [persons, plan, settings]);
  const personFindings = useMemo(() => {
    const m: Record<string, Finding[]> = {};
    for (const f of [...result.findings, ...wochenFindings]) if (f.personId) (m[f.personId] ??= []).push(f);
    return m;
  }, [result, wochenFindings]);
  const actionsFor = (f: Finding) =>
    f.personId && effVariant === 'test' && (f.canInsertPause || f.canResetFromProfile) ? (
      <span className="finding-actions">
        {f.canInsertPause && (
          <button className="linkbtn" onClick={() => dispatch({ type: 'insertPause', personId: f.personId!, day })}>
            Pause einfügen
          </button>
        )}
        {f.canResetFromProfile && (
          <button className="linkbtn" onClick={() => dispatch({ type: 'resetDayFromProfile', personId: f.personId!, day })}>
            Normalzeit übernehmen
          </button>
        )}
      </span>
    ) : null;
  const span = settings.close - settings.open;
  const pct = (h: number) => ((h - settings.open) / span) * 100;
  const randText = settings.randzeiten.map((r) => `${fmtShort(r.start)}–${fmtShort(r.end)} mind. ${r.minPersonen}`).join(', ');

  const tone = (c: { v: number; h: number }) => (c.v ? 'v' : c.h ? 'h' : 'ok');
  const statusShort = (c: { v: number; h: number }) =>
    c.v ? (c.v === 1 ? '1 Problem' : `${c.v} Probleme`) : c.h ? (c.h === 1 ? '1 Hinweis' : `${c.h} Hinweise`) : 'Alles gut';
  const c = result.counts;
  const t = tone(c);
  const statusTitle = c.v ? statusShort(c) : c.h ? 'Keine Probleme' : 'Alles gut besetzt';
  const abwText = c.i ? (c.i === 1 ? '1 Person weicht' : `${c.i} Personen weichen`) + ' bewusst von der Normalzeit ab.' : '';
  const statusSub = c.v
    ? 'Diese Punkte sollten gelöst sein, bevor der Plan gilt.'
    : c.h
      ? `${statusShort(c)} zum Prüfen – sonst ist alles in Ordnung.`
      : `Alle Regeln für diesen Tag sind erfüllt.${abwText && ' ' + abwText}`;
  const lautFindings = result.findings.filter((f) => !f.quiet);
  const leiseFindings = result.findings.filter((f) => f.quiet);

  // Besetzung: Säulenhöhe = Personen / max; dunkler Anteil = Fachkräfte
  const maxT = Math.max(4, ...result.slots.map((s) => s.tot));
  const covHours: { h: number; label: string }[] = [];
  for (let h = Math.ceil(settings.open); h < settings.close - 0.5 + 1e-9; h++) {
    const s = result.slots.find((x) => Math.abs(x.h - h - 0.5) < 1e-9) ?? result.slots.find((x) => Math.abs(x.h - h) < 1e-9);
    if (s) covHours.push({ h, label: `${s.tot} / ${s.fk}` });
  }
  const missing = missingCount(data, plan);
  const missingNames = persons
    .filter((p) => DAYS.some((d) => !blocksOf(plan, p.id, d).length && templateFor(p, d, data).length))
    .map((p) => p.name)
    .join(', ');
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
            {effVariant === 'geltend' ? `Gilt seit ${fmtDate(data.plans.geltend.since)} · Bearbeiten geht nur in der Testfassung` : 'Zeitfenster aufziehen, verschieben, Pausen einziehen'}
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

      {persons.length === 0 ? (
        <div className="card onboarding">
          <h2>So geht’s los</h2>
          <ol>
            <li>
              <strong>Kita einrichten:</strong> Name, Öffnungszeit und Gruppen (mit Kinderzahl und Alter).{' '}
              <button className="linkbtn" onClick={() => goTo('settings')}>Zu den Einstellungen</button>
            </li>
            <li>
              <strong>Personal anlegen:</strong> pro Person Qualifikation, „zählt als Fachkraft“, Soll-Stunden, Arbeitstage und Normalarbeitszeiten.{' '}
              <button className="linkbtn" onClick={() => goTo('personal')}>Zum Personal</button>
            </li>
            <li>
              <strong>Einplanen:</strong> Zurück im Rahmenplan „Testfassung“ anlegen, „Fehlende Personen einplanen“, Zeiten verschieben und prüfen, dann
              „Als geltend übernehmen“.
            </li>
          </ol>
        </div>
      ) : (
        missing > 0 && (
          <div className="banner warn">
            <span style={{ flex: '1 1 320px' }}>
              <strong>
                {missing === 1 ? '1 Arbeitstag ist' : `${missing} Arbeitstage sind`} laut Personalprofil noch nicht eingeplant
              </strong>{' '}
              ({missingNames}).
            </span>
            {effVariant === 'test' ? (
              <button className="pill sm" onClick={() => dispatch({ type: 'fillMissingFromProfiles' })}>Fehlende Personen einplanen</button>
            ) : hasTest ? (
              <button className="pill sm" onClick={() => setVariant('test')}>In der Testfassung einplanen</button>
            ) : (
              <button
                className="pill sm"
                onClick={() => {
                  dispatch({ type: 'createTest' });
                  dispatch({ type: 'fillMissingFromProfiles' });
                  setVariant('test');
                }}
              >
                Testfassung anlegen und einplanen
              </button>
            )}
          </div>
        )
      )}

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

      <TermineCard
        data={data}
        day={day}
        dispatch={dispatch}
        confirm={confirm}
        onApplied={(msg) => {
          setVariant('test');
          notify(msg);
        }}
      />

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
              personFindings={personFindings}
              renderActions={actionsFor}
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
                  ? 'Ziehen verschiebt, Ränder ändern die Dauer · Tasten: ←/→, Alt = Beginn, Umschalt = Ende, Entf = löschen · Neues Zeitfenster: in der Zeile auf eine freie Stelle ziehen'
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
              {selEditable && EDIT_TYPES.includes(selBlock.type) && (
                <label className="dsel">
                  <span className="visually-hidden">Art</span>
                  <select
                    value={selBlock.type}
                    aria-label="Art des Zeitfensters"
                    onChange={(e) => setSelDay(setBlockType(selBlocks, selBlock.id, e.target.value as BlockType), selBlock.id)}
                  >
                    {EDIT_TYPES.map((ty) => (
                      <option key={ty} value={ty}>{TYPE_LABEL[ty]}</option>
                    ))}
                  </select>
                </label>
              )}
              {canPauseHere && (
                <button className="dbtn" onClick={onInsertPause} title="Teilt das Zeitfenster; die Pause lässt sich danach entlang der Zeitleiste ziehen">
                  Pause einziehen ({fmtDuration(pauseLen)} h)
                </button>
              )}
              {effVariant === 'test' && hasRoomAfter && (
                <button className="dbtn" onClick={onAddAfter}>+ Zeitfenster danach</button>
              )}
              {selEditable && (
                <button className="dbtn" onClick={() => setSelDay(deleteBlock(selBlocks, selBlock.id), null)}>
                  {selBlock.type === 'pause' ? 'Pause entfernen' : 'Löschen'}
                </button>
              )}
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
        {lautFindings.map((f, i) => (
          <div className={`finding tone-${f.kind}`} key={i}>
            <span className="dot" />
            <div>
              <div className="finding-title">
                <span className="visually-hidden">{f.kind === 'v' ? 'Verstoß: ' : f.kind === 'h' ? 'Hinweis: ' : ''}</span>
                {f.title}
              </div>
              <div className="finding-desc">{f.desc}</div>
              {actionsFor(f)}
            </div>
          </div>
        ))}
      </div>

      {leiseFindings.length > 0 && (
        <div className="quiet-list">
          <div className="quiet-head">
            <strong>Abweichungen von der Normalarbeitszeit</strong>
            <span>Erlaubt – nur zur Kontrolle, ob das so gewollt ist.</span>
          </div>
          <ul>
            {leiseFindings.map((f, i) => {
              const p = persons.find((x) => x.id === f.personId);
              return (
                <li key={i}>
                  <span className="visually-hidden">Abweichung: </span>
                  {p?.name ?? f.title}
                  {actionsFor(f)}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {wochenFindings.length > 0 && (
        <>
          <h2 className="h2">In der Woche: Früh- und Spätdienste</h2>
          <div className="findings">
            {wochenFindings.map((f, i) => (
              <div className={`finding tone-${f.kind}`} key={i}>
                <span className="dot" />
                <div>
                  <div className="finding-title">
                    <span className="visually-hidden">{f.kind === 'v' ? 'Verstoß: ' : 'Hinweis: '}</span>
                    {f.title}
                  </div>
                  <div className="finding-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <details className="fold">
        <summary>Wochenübersicht · {variantLabel}</summary>
        <div className="fold-body scroll-x" style={{ paddingTop: 0, marginTop: 12 }}>
          <table className="tbl compact">
            <thead>
              <tr>
                <th>Person</th>
                {DAYS.map((d) => <th key={d}>{d}</th>)}
                <th title="Frühdienste pro Woche">Früh</th>
                <th title="Spätdienste pro Woche">Spät</th>
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
                  <td>{dienstTage(r.person, plan, settings, 'frueh').length}</td>
                  <td>{dienstTage(r.person, plan, settings, 'spaet').length}</td>
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
