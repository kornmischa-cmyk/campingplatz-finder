import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react';
import type { AppData, Block, Day, Plan, Variant } from '../domain/types';
import { TYPE_LABEL } from '../domain/types';
import { applyDrag, canDrag, isLocked, planDrag, pxToDelta, type DragMode, type DragPlan } from '../domain/drag';
import { blocksOf } from '../domain/plan';
import type { DayResult } from '../domain/rules';
import { workHours } from '../domain/rules';
import { fmt, fmtDecimal, fmtDuration, fmtShort, STEP } from '../domain/time';
import type { Action } from '../state/store';
import { LockIcon } from './Icons';
import { groupColor, groupedPersons, initials } from '../domain/groups';

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

const CH = 7; // ca. Pixel pro Zeichen bei 12px Schrift

/** Beschriftung abhängig von der verfügbaren Pixelbreite; Pausen ohne Kurzbeschriftung */
function blockLabel(b: Block, px: number): string {
  const full = `${fmt(b.start)}–${fmt(b.end)}`;
  if (px >= full.length * CH) return full;
  const short = `${fmtShort(b.start)}–${fmtShort(b.end)}`;
  if (px >= short.length * CH) return short;
  const s = fmtShort(b.start);
  return b.type !== 'pause' && px >= s.length * CH ? s : '';
}

export function Timeline({ data, plan, variant, day, result, selected, onSelect, dispatch, onOpenProfile }: Props) {
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
  if (ticks[ticks.length - 1] !== close) ticks.push(close);

  return (
    <>
      <div className="row">
        <div />
        <div className="ticks" ref={measureRef} aria-hidden="true">
          {ticks.map((h) => (
            <span key={h} style={{ left: `${pct(h)}%` }}>
              {fmt(h)}
            </span>
          ))}
        </div>
      </div>

      {groupedPersons(data).map(({ group: g, members }) => {
        if (!members.length) return null;
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
            <div className="row">
              <div />
              <div className="vstripe">
                {result.violationSpans.map((s, i) => (
                  <div key={i} style={{ left: `${pct(s.start)}%`, width: `${((s.end - s.start) / span) * 100}%` }} title={`${s.label} · ${fmt(s.start)}–${fmt(s.end)}`} />
                ))}
              </div>
            </div>
            {members.map((p) => {
              const blocks = blocksOf(plan, p.id, day);
              const az = workHours(blocks);
              const meta = p.qual + (blocks.length ? ` · ${fmtDecimal(az)} h · Soll ${p.soll} h/Wo` : ' · frei');
              return (
                <div className="person-row" key={p.id}>
                  <div className="person-cell">
                    <span className="avatar" aria-hidden="true" style={{ background: gc.s, color: gc.c }}>
                      {initials(p.name)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="person-name-row">
                        <button className="person-name" onClick={(e) => onOpenProfile(p.id, e.currentTarget)}>
                          {p.name}
                        </button>
                        {p.fk && <span className="fk-pill" title="Fachkraft">FK</span>}
                      </div>
                      <div className="person-meta" title={meta}>{meta}</div>
                    </div>
                  </div>
                  <div className="lane" style={{ background: `repeating-linear-gradient(90deg, var(--line) 0, var(--line) 1px, transparent 1px, transparent ${100 / span}%)` }}>
                    {blocks.map((b, idx) => {
                      const draggable = canDrag(b, variant);
                      const locked = isLocked(b);
                      const hardLockedInTest = variant === 'test' && locked && (b.type === 'betreuung' || b.type === 'verfuegung');
                      const focusable = draggable || hardLockedInTest;
                      const isSel = selected?.personId === p.id && selected.day === day && selected.blockId === b.id;
                      const isDrag = drag?.personId === p.id && drag.blockId === b.id;
                      const dur = b.end - b.start;
                      const px = (dur / span) * laneW - (draggable ? 24 : 14) - (b.verb === 'hart' ? 13 : 0);
                      const label = blockLabel(b, px);
                      const hartText = b.verb === 'hart' ? (b.unlocked ? ', harte Zeit, entsperrt' : ', harte Zeit, gesperrt') : '';
                      const aria =
                        `${p.name}, ${TYPE_LABEL[b.type]}, ${fmt(b.start)} bis ${fmt(b.end)}${hartText}` +
                        (draggable ? '. Pfeiltasten verschieben, Alt plus Pfeil ändert Beginn, Umschalt plus Pfeil ändert Ende.' : '') +
                        (hardLockedInTest ? '. Zum Entsperren auswählen.' : '');
                      const cls = ['blk', `t-${b.type}`, draggable && 'draggable', isSel && 'selected', isDrag && 'dragging'].filter(Boolean).join(' ');
                      return (
                        <div
                          key={b.id}
                          className={cls}
                          style={{
                            left: `${pct(b.start)}%`,
                            width: `${(dur / span) * 100}%`,
                            ...(b.type === 'betreuung' ? { background: gc.s, borderColor: gc.c } : {}),
                            cursor: isDrag ? (drag!.mode === 'move' ? 'grabbing' : 'ew-resize') : undefined,
                          }}
                          tabIndex={focusable ? 0 : -1}
                          role={focusable ? 'button' : 'img'}
                          aria-label={aria}
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
                          <span className="blk-label">
                            {b.verb === 'hart' && <LockIcon open={!!b.unlocked} />}
                            <span>{label}</span>
                          </span>
                          {draggable && (
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
    </>
  );
}
