import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import type { AppData, Block, Day, Plan, Variant } from '../domain/types';
import { DAYS, TYPE_LABEL } from '../domain/types';
import { applyDrag, canDrag, isLocked, planDrag, pxToDelta, type DragMode, type DragPlan } from '../domain/drag';
import { blocksOf } from '../domain/plan';
import type { DayResult, Finding } from '../domain/rules';
import { workHours } from '../domain/rules';
import { fmt, fmtDuration, fmtShort, STEP, uid } from '../domain/time';
import { fmtHours, fmtSollDiff } from '../domain/soll';
import { addBlockAfter, canEdit, deleteBlock, drawBlock, gapAt } from '../domain/edit';
import type { Action } from '../state/store';
import { LockIcon } from './Icons';
import { groupColor, groupedPersons, initials } from '../domain/groups';

/** Kurz hervorgehobene Stelle („Im Plan zeigen“) */
export interface Flash {
  personId?: string;
  span?: { start: number; end: number };
}

export interface Selection {
  personId: string;
  day: Day;
  blockId: string;
}

interface Props {
  data: AppData;
  plan: Plan;
  variant: Variant;
  day: Day;
  result: DayResult;
  selected: Selection | null;
  onSelect: (s: Selection | null) => void;
  dispatch: (a: Action) => void;
  onOpenProfile: (personId: string, opener: HTMLElement) => void;
  /** Befunde je Person (Tag + Woche) für das Abzeichen am Namen */
  personFindings: Record<string, Finding[]>;
  renderActions: (f: Finding) => ReactNode;
  /** Klick auf einen Wochentag-Punkt am Zähler */
  onDay?: (d: Day) => void;
  flash?: Flash | null;
}

interface DragState {
  personId: string;
  blockId: string;
  mode: DragMode;
  startX: number;
  width: number;
  start: Block[];
  plan: DragPlan;
  last: number;
}

/** Neues Zeitfenster aufziehen */
interface DrawState {
  personId: string;
  laneLeft: number;
  width: number;
  anchor: number;
  gap: { lo: number; hi: number };
  start: Block[];
  id: string;
  created: boolean;
}

/** Überlappende Zeiträume zusammenfassen (für die rote Fläche über alle Zeilen) */
function mergeSpans(spans: { start: number; end: number }[]): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const x of [...spans].sort((a, b) => a.start - b.start)) {
    const last = out[out.length - 1];
    if (last && x.start <= last.end + 1e-9) last.end = Math.max(last.end, x.end);
    else out.push({ start: x.start, end: x.end });
  }
  return out;
}

const CH = 7; // ca. Pixel pro Zeichen bei 12px Schrift

/** Beschriftung abhängig von der verfügbaren Pixelbreite; Pausen ohne Kurzbeschriftung */
/** Kurzname der Blockart im Block (Betreuung ohne, weil Standard und in Gruppenfarbe) */
const SHORT_TYPE: Record<Block['type'], string> = { betreuung: '', verfuegung: 'Verfügung', besprechung: 'Bespr.', anleitung: 'Anl.', pause: 'Pause' };
/** Blockarten mit Muster: Beschriftung sitzt auf einem hellen Etikett, damit das Muster nicht durch die Schrift läuft */
export const PATTERNED = new Set<Block['type']>(['verfuegung', 'besprechung', 'anleitung']);

/** Beschriftung abhängig von der verfügbaren Pixelbreite; bei Platz mit Blockart, sonst zuerst die Uhrzeit */
export function blockLabel(b: Block, px: number): string {
  const full = `${fmt(b.start)}–${fmt(b.end)}`;
  const short = `${fmtShort(b.start)}–${fmtShort(b.end)}`;
  const st = fmtShort(b.start);
  const k = SHORT_TYPE[b.type];
  const pad = PATTERNED.has(b.type) ? 12 : 0;
  const cands =
    b.type === 'betreuung'
      ? [full, short, st]
      : b.type === 'pause'
        ? [`Pause ${short}`, 'Pause']
        : // Uhrzeit vor Name: reicht der Platz nicht für beides, steht die Zeit im Block (Art bleibt am Muster erkennbar)
          [`${TYPE_LABEL[b.type]} ${full}`, `${k} ${full}`, full, st, k, k.slice(0, 1)];
  return cands.find((c) => px >= c.length * CH + pad) ?? '';
}

export function Timeline({ data, plan, variant, day, result, selected, onSelect, dispatch, onOpenProfile, personFindings, renderActions, onDay, flash }: Props) {
  const [openBadge, setOpenBadge] = useState<string | null>(null);
  useEffect(() => {
    if (!openBadge) return;
    // Fokus ins Popover, damit die Aktionen direkt per Tab erreichbar sind
    document.querySelector<HTMLElement>('.p-pop')?.focus();
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as globalThis.KeyboardEvent).key !== 'Escape') return;
      if (e.type === 'mousedown' && (e.target as HTMLElement).closest('.p-pop, .p-badge')) return;
      if (e.type === 'keydown') document.querySelector<HTMLElement>(`[data-badge="${CSS.escape(openBadge)}"]`)?.focus();
      setOpenBadge(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [openBadge]);
  const { settings } = data;
  const { open, close } = settings;
  const span = close - open;
  const pct = (h: number) => ((h - open) / span) * 100;

  const [laneW, setLaneW] = useState(560);
  const measureRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      if (w) setLaneW((old) => (Math.abs(old - w) > 1 ? w : old));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const delta = pxToDelta(e.clientX - d.startX, d.width, span);
      if (delta === d.last) return;
      d.last = delta;
      dispatch({ type: 'setTestDay', personId: d.personId, day, blocks: applyDrag(d.start, d.plan, delta) });
    };
    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    // nur beim Start/Ende eines Drags neu binden
  }, [drag !== null]);

  const [draw, setDraw] = useState<DrawState | null>(null);
  const drawRef = useRef<DrawState | null>(null);
  drawRef.current = draw;
  const hourAt = (clientX: number, left: number, width: number) => open + ((clientX - left) / width) * span;

  useEffect(() => {
    if (!draw) return;
    const onMove = (e: PointerEvent) => {
      const d = drawRef.current;
      if (!d) return;
      const next = drawBlock(d.start, d.anchor, hourAt(e.clientX, d.laneLeft, d.width), d.gap, d.id);
      d.created = next !== d.start;
      dispatch({ type: 'setTestDay', personId: d.personId, day, blocks: next });
    };
    const onUp = () => {
      const d = drawRef.current;
      if (d?.created) onSelect({ personId: d.personId, day, blockId: d.id });
      setDraw(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [draw !== null]);

  const startDraw = (e: RPointerEvent<HTMLDivElement>, personId: string, blocks: Block[]) => {
    if (e.target !== e.currentTarget || e.button !== 0) return;
    onSelect(null);
    if (variant !== 'test') return;
    const r = e.currentTarget.getBoundingClientRect();
    const h = hourAt(e.clientX, r.left, r.width);
    const gap = gapAt(blocks, h, open, close);
    if (!gap) return;
    e.preventDefault();
    setDraw({ personId, laneLeft: r.left, width: r.width, anchor: h, gap, start: blocks, id: uid('b'), created: false });
  };

  const startDrag = (e: RPointerEvent, personId: string, blocks: Block[], idx: number, mode: DragMode, blockEl: HTMLElement) => {
    e.stopPropagation();
    e.preventDefault();
    blockEl.focus({ preventScroll: true });
    const lane = blockEl.parentElement!;
    setDrag({
      personId,
      blockId: blocks[idx].id,
      mode,
      startX: e.clientX,
      width: lane.getBoundingClientRect().width,
      start: blocks,
      plan: planDrag(blocks, idx, mode, open, close),
      last: 0,
    });
  };

  const onKey = (e: KeyboardEvent, personId: string, blocks: Block[], idx: number, draggable: boolean) => {
    if (e.key === 'Escape') {
      onSelect(null);
      (e.currentTarget as HTMLElement).blur();
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && canEdit(blocks[idx], variant)) {
      e.preventDefault();
      dispatch({ type: 'setTestDay', personId, day, blocks: deleteBlock(blocks, blocks[idx].id), step: true });
      onSelect(null);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect({ personId, day, blockId: blocks[idx].id });
      return;
    }
    if (!draggable || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    onSelect({ personId, day, blockId: blocks[idx].id });
    const mode: DragMode = e.shiftKey ? 'r' : e.altKey ? 'l' : 'move';
    const p = planDrag(blocks, idx, mode, open, close);
    dispatch({ type: 'setTestDay', personId, day, blocks: applyDrag(blocks, p, e.key === 'ArrowLeft' ? -STEP : STEP) });
  };

  const ticks: number[] = [];
  for (let h = Math.ceil(open); h <= close; h++) ticks.push(h);
  if (ticks[0] !== open) ticks.unshift(open);
  if (ticks[ticks.length - 1] !== close) {
    // Volle Stunde direkt vor dem Schluss weglassen, wenn die Beschriftungen sonst kollidieren
    const pxPerH = laneW / span;
    if ((close - ticks[ticks.length - 1]) * pxPerH < 46) ticks.pop();
    ticks.push(close);
  }

  return (
    <>
      <div className="row">
        <div className="tl-legend" aria-hidden="true">
          <span><i className="wd wd-plan" /> geplant</span>
          <span><i className="wd wd-missing" /> fehlt</span>
          <span><i className="wd wd-off" /> frei</span>
        </div>
        <div className="ticks" ref={measureRef} aria-hidden="true">
          {ticks.map((h) => (
            <span key={h} style={{ left: `${pct(h)}%` }}>
              {fmt(h)}
            </span>
          ))}
        </div>
      </div>
      <span id="blk-help-edit" hidden>
        Pfeiltasten verschieben, Alt plus Pfeil ändert den Beginn, Umschalt plus Pfeil das Ende, Entf entfernt.
      </span>
      <span id="blk-help-locked" hidden>
        Harte Zeit laut Profil. Zum Entsperren auswählen.
      </span>
      {result.violationSpans.length > 0 && (
        <div className="row vrow">
          <div className="vrow-label">
            Unterbesetzt
            <span className="visually-hidden">
              : {result.violationSpans.map((v) => `${v.label} ${fmt(v.start)} bis ${fmt(v.end)}`).join('; ')}
            </span>
          </div>
          <div className="vstripe" aria-hidden="true">
            {result.violationSpans.map((s, i) => {
              const hl = flash?.span && flash.span.start < s.end && flash.span.end > s.start;
              return (
                <div
                  key={i}
                  className={hl ? 'flash' : undefined}
                  style={{ left: `${pct(s.start)}%`, width: `${((s.end - s.start) / span) * 100}%` }}
                  title={`${s.label} · ${fmt(s.start)}–${fmt(s.end)}`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="tl-body">
      {mergeSpans(result.violationSpans).map((s, i) => (
        <div
          key={i}
          className={`vband${flash?.span && flash.span.start < s.end && flash.span.end > s.start ? ' flash' : ''}`}
          aria-hidden="true"
          style={{
            left: `calc(var(--label-w) + (100% - var(--label-w)) * ${pct(s.start) / 100})`,
            width: `calc((100% - var(--label-w)) * ${(s.end - s.start) / span})`,
          }}
        />
      ))}
      {groupedPersons(data).map(({ group: g, members }) => {
        if (!members.length && g.id === '__ohne') return null;
        const gc = groupColor(data.groups, g.id);
        return (
          <section key={g.id} aria-label={`Gruppe ${g.name}`}>
            <div className="group-head">
              <span className="group-dot" style={{ background: gc.c }} />
              <h3>{g.name}</h3>
              <span className="muted">
                {[g.kinder ? `${g.kinder} Kinder` : '', g.alter].filter(Boolean).join(', ')}
              </span>
            </div>
            {members.length === 0 && (
              <div className="person-row empty-group">
                <div className="person-cell hint">Noch niemand in dieser Gruppe</div>
                <div className="hint">Personen legst du unter „Personal“ an.</div>
              </div>
            )}
            {members.map((p) => {
              const blocks = blocksOf(plan, p.id, day);
              const az = workHours(blocks);
              const ist = DAYS.reduce((a, d) => a + workHours(blocksOf(plan, p.id, d)), 0);
              const sd = fmtSollDiff(ist, p.soll);
              const week = DAYS.map((d) => {
                const bl = blocksOf(plan, p.id, d);
                const soll = p.workdays.includes(d);
                const state = bl.length ? (soll ? 'plan' : 'extra') : soll ? 'missing' : 'off';
                const text =
                  state === 'plan' || state === 'extra'
                    ? `${d}: ${fmt(Math.min(...bl.map((b) => b.start)))}–${fmt(Math.max(...bl.map((b) => b.end)))}, ${fmtDuration(workHours(bl))} h${state === 'extra' ? ' (laut Profil kein Arbeitstag)' : ''}`
                    : state === 'missing'
                      ? `${d}: Arbeitstag, noch nicht eingeplant`
                      : `${d}: frei`;
                return { d, state, text };
              });
              const missingDays = week.filter((w) => w.state === 'missing').map((w) => w.d);
              const meta = `${p.qual} · heute ${blocks.length ? `${fmtDuration(az)} h` : 'frei'} · Woche ${fmtHours(ist)} von ${fmtHours(p.soll)} h verplant, ${sd.spoken}${missingDays.length ? ` · noch nicht eingeplant: ${missingDays.join(', ')}` : ''}`;
              return (
                <div className={`person-row${flash?.personId === p.id ? ' flash' : ''}`} key={p.id} data-person-row={p.id}>
                  <div className="person-cell">
                    <span className="avatar" aria-hidden="true" style={{ background: gc.s, color: gc.t }}>
                      {initials(p.name)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="person-name-row">
                        <button className="person-name" onClick={(e) => onOpenProfile(p.id, e.currentTarget)}>
                          {p.name}
                        </button>
                        {p.fk && <span className="fk-pill" title="Fachkraft">FK</span>}
                        {(() => {
                          const fs = personFindings[p.id] ?? [];
                          if (!fs.length) return null;
                          const nv = fs.filter((f) => f.kind === 'v').length;
                          const nq = fs.filter((f) => f.quiet).length;
                          const nh = fs.length - nv - nq;
                          const parts = [
                            nv ? `${nv} ${nv === 1 ? 'Problem' : 'Probleme'}` : '',
                            nh ? `${nh} ${nh === 1 ? 'Hinweis' : 'Hinweise'}` : '',
                            nq ? 'weicht von der Normalzeit ab' : '',
                          ].filter(Boolean);
                          const label = `${p.name}: ${parts.join(', ')} – anzeigen`;
                          return (
                            <button
                              className={`p-badge tone-${nv ? 'v' : nh ? 'h' : 'i'}`}
                              aria-label={label}
                              title={label}
                              aria-expanded={openBadge === p.id}
                              data-badge={p.id}
                              onClick={() => setOpenBadge(openBadge === p.id ? null : p.id)}
                            >
                              {nv ? nv : nh ? '!' : '≠'}
                            </button>
                          );
                        })()}
                      </div>
                      <div className={`soll soll-${sd.tone}`} title={meta}>
                        <span className="soll-days" aria-hidden="true">
                          {week.map((w) => (
                            <span
                              key={w.d}
                              className={`wd wd-${w.state}${w.d === day ? ' wd-today' : ''}`}
                              title={w.text}
                              onClick={onDay ? () => onDay(w.d) : undefined}
                            />
                          ))}
                        </span>
                        <span className="soll-num" aria-hidden="true">
                          {fmtHours(ist)} / {fmtHours(p.soll)} h
                        </span>
                        <span className="soll-diff" aria-hidden="true">{sd.chip}</span>
                        <span className="visually-hidden">{meta}</span>
                      </div>
                    </div>
                    {openBadge === p.id && (
                      <div className="p-pop" role="dialog" aria-label={`Probleme bei ${p.name}`} tabIndex={-1}>
                        <strong>{p.name}</strong>
                        <ul>
                          {(personFindings[p.id] ?? []).map((f, i) => (
                            <li key={i} className={`tone-${f.quiet ? 'i' : f.kind}`}>
                              <span className="dot" />
                              <span>
                                {f.title.replace(`${p.name}: `, '')}
                                <small>{f.desc}</small>
                                {renderActions(f)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div
                    className={`lane${variant === 'test' ? ' editable' : ''}`}
                    title={variant === 'test' ? 'In eine freie Stelle ziehen, um ein Zeitfenster anzulegen' : undefined}
                    style={{ background: `repeating-linear-gradient(90deg, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${100 / span}%)` }}
                    onPointerDown={(e) => startDraw(e, p.id, blocks)}
                  >
                    {variant === 'test' && !blocks.length && draw?.personId !== p.id && (
                      <button
                        className="lane-add"
                        onClick={() => {
                          const id = uid('b');
                          const from = p.normBlocks.length ? Math.min(...p.normBlocks.map((b) => b.start)) : open;
                          const next = addBlockAfter([], from, open, close, id, 4);
                          if (!next) return;
                          dispatch({ type: 'setTestDay', personId: p.id, day, blocks: next, step: true });
                          onSelect({ personId: p.id, day, blockId: id });
                        }}
                      >
                        + Zeitfenster
                      </button>
                    )}
                    {blocks.map((b, idx) => {
                      const draggable = canDrag(b, variant);
                      const editable = canEdit(b, variant);
                      const locked = isLocked(b);
                      const hardLockedInTest = variant === 'test' && locked && (b.type === 'betreuung' || b.type === 'verfuegung');
                      const focusable = draggable || editable || hardLockedInTest;
                      const isSel = selected?.personId === p.id && selected.day === day && selected.blockId === b.id;
                      const isDrag = drag?.personId === p.id && drag.blockId === b.id;
                      const dur = b.end - b.start;
                      const px = (dur / span) * laneW - (draggable ? 24 : 14) - (b.verb === 'hart' ? 13 : 0);
                      const label = blockLabel(b, px);
                      const hartText = b.verb === 'hart' ? (b.unlocked ? ', harte Zeit, entsperrt' : ', harte Zeit, gesperrt') : '';
                      const aria = `${p.name}, ${TYPE_LABEL[b.type]}, ${fmt(b.start)} bis ${fmt(b.end)}${hartText}`;
                      const help = draggable ? 'blk-help-edit' : hardLockedInTest ? 'blk-help-locked' : undefined;
                      const cls = ['blk', `t-${b.type}`, draggable && 'draggable', isSel && 'selected', isDrag && 'dragging'].filter(Boolean).join(' ');
                      return (
                        <div
                          key={b.id}
                          className={cls}
                          style={{
                            // 1 px Fuge zu jedem Nachbarn: aneinanderstoßende Ränder liegen nicht mehr aufeinander
                            left: `calc(${pct(b.start)}% + 1px)`,
                            width: `calc(${(dur / span) * 100}% - 2px)`,
                            ...(b.type === 'betreuung' ? { background: gc.s, borderColor: gc.c } : {}),
                            cursor: isDrag ? (drag!.mode === 'move' ? 'grabbing' : 'ew-resize') : undefined,
                          }}
                          tabIndex={focusable ? 0 : -1}
                          role={focusable ? 'button' : 'img'}
                          aria-label={aria}
                          aria-describedby={help}
                          aria-pressed={focusable ? isSel : undefined}
                          title={`${p.name} · ${TYPE_LABEL[b.type]} · ${fmt(b.start)}–${fmt(b.end)}${hartText}`}
                          onFocus={() => {
                            if (focusable && !isSel) onSelect({ personId: p.id, day, blockId: b.id });
                          }}
                          onKeyDown={(e) => onKey(e, p.id, blocks, idx, draggable)}
                          onPointerDown={(e) => {
                            onSelect({ personId: p.id, day, blockId: b.id });
                            if (draggable && e.button === 0) startDrag(e, p.id, blocks, idx, 'move', e.currentTarget);
                          }}
                        >
                          <span className={`blk-label${PATTERNED.has(b.type) ? ' on-pattern' : ''}`}>
                            {b.verb === 'hart' && <LockIcon open={!!b.unlocked} />}
                            <span>{label}</span>
                          </span>
                          {/* Griffe nur, wenn Platz ist – bei sehr kurzen Blöcken würden sie sich überdecken (Ende dann per Leiste/Tastatur) */}
                          {draggable && (dur / span) * laneW >= 36 && (
                            <>
                              <div
                                className="grip l"
                                title="Beginn ziehen"
                                aria-hidden="true"
                                onPointerDown={(e) => {
                                  onSelect({ personId: p.id, day, blockId: b.id });
                                  startDrag(e, p.id, blocks, idx, 'l', e.currentTarget.parentElement!);
                                }}
                              />
                              <div
                                className="grip r"
                                title="Ende ziehen"
                                aria-hidden="true"
                                onPointerDown={(e) => {
                                  onSelect({ personId: p.id, day, blockId: b.id });
                                  startDrag(e, p.id, blocks, idx, 'r', e.currentTarget.parentElement!);
                                }}
                              />
                            </>
                          )}
                          {(isSel || isDrag) && (
                            <div className="time-badge" aria-hidden="true">
                              {fmt(b.start)}–{fmt(b.end)} · {fmtDuration(dur)} h
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
      </div>
    </>
  );
}
