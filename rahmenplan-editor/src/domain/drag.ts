// Verschieben / Länge ändern von Blöcken inkl. Nachbarregeln.
// Grenzen [lo, hi] werden einmal beim Start berechnet; jede Bewegung wendet ein geklemmtes
// Delta auf den STARTZUSTAND an – deterministisch, ohne Drift.
import type { Block, Variant } from './types';
import { NUDGEABLE } from './types';
import { EPS, STEP } from './time';

export type DragMode = 'move' | 'l' | 'r';

export function isLocked(b: Block): boolean {
  return b.verb === 'hart' && !b.unlocked;
}

/** Darf der Block in dieser Fassung gezogen werden? */
export function canDrag(b: Block, variant: Variant): boolean {
  return variant === 'test' && NUDGEABLE[b.type] && !isLocked(b);
}

/** Nachbar, dessen gemeinsame Kante mitwandern darf */
function adjustable(b: Block): boolean {
  return (NUDGEABLE[b.type] || b.type === 'pause') && !isLocked(b);
}

export interface DragPlan {
  mode: DragMode;
  idx: number;
  lo: number;
  hi: number;
  /** bündig anliegender, anpassbarer Vorgänger (Kante wandert mit) */
  prevIdx: number | null;
  nextIdx: number | null;
}

export function planDrag(blocks: Block[], idx: number, mode: DragMode, open: number, close: number): DragPlan {
  const me = blocks[idx];
  let prev: number | null = null;
  let next: number | null = null;
  blocks.forEach((b, i) => {
    if (i === idx) return;
    if (b.end <= me.start + EPS && (prev === null || b.end > blocks[prev].end)) prev = i;
    if (b.start >= me.end - EPS && (next === null || b.start < blocks[next].start)) next = i;
  });
  const p = prev !== null ? blocks[prev] : null;
  const n = next !== null ? blocks[next] : null;
  const lp = p && Math.abs(p.end - me.start) < EPS && adjustable(p) ? prev : null;
  const ln = n && Math.abs(n.start - me.end) < EPS && adjustable(n) ? next : null;

  let lo = -Infinity;
  let hi = Infinity;
  if (mode === 'l') hi = Math.min(hi, me.end - STEP - me.start);
  if (mode === 'r') lo = Math.max(lo, me.start + STEP - me.end);
  if (mode !== 'r') {
    lo = Math.max(lo, open - me.start);
    if (lp !== null) lo = Math.max(lo, blocks[lp].start + STEP - me.start);
    else if (p) lo = Math.max(lo, p.end - me.start);
  }
  if (mode !== 'l') {
    hi = Math.min(hi, close - me.end);
    if (ln !== null) hi = Math.min(hi, blocks[ln].end - STEP - me.end);
    else if (n) hi = Math.min(hi, n.start - me.end);
  }
  return {
    mode,
    idx,
    lo,
    hi,
    prevIdx: mode !== 'r' ? lp : null,
    nextIdx: mode !== 'l' ? ln : null,
  };
}

export function clampDelta(plan: DragPlan, delta: number): number {
  const d = Math.max(plan.lo, Math.min(plan.hi, delta));
  return Math.abs(d) < EPS ? 0 : d;
}

/** Wendet das (geklemmte) Delta auf die Startblöcke an. Reihenfolge bleibt erhalten. */
export function applyDrag(start: Block[], plan: DragPlan, delta: number): Block[] {
  const d = clampDelta(plan, delta);
  if (d === 0) return start;
  const ds = plan.mode !== 'r' ? d : 0;
  const de = plan.mode !== 'l' ? d : 0;
  return start.map((b, i) => {
    if (i === plan.idx) return { ...b, start: b.start + ds, end: b.end + de };
    if (i === plan.prevIdx) return { ...b, end: b.end + ds };
    if (i === plan.nextIdx) return { ...b, start: b.start + de };
    return b;
  });
}

/** Pixel-Verschiebung → gerastertes Stunden-Delta (15 Minuten) */
export function pxToDelta(dx: number, widthPx: number, span: number): number {
  if (widthPx <= 0) return 0;
  return Math.round((dx / widthPx) * span / STEP) * STEP;
}
