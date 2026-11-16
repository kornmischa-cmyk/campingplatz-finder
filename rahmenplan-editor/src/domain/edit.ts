// Freie Bearbeitung einer Zeile (Person × Tag) in der Testfassung:
// Zeitfenster aufziehen, Pause einziehen, Art ändern, löschen. Alle Funktionen sind rein.
import type { Block, BlockType, Variant } from './types';
import { EPS, STEP } from './time';
import { isLocked } from './drag';
import { isTerminBlock, missingPause } from './pause';
import type { Settings } from './types';
import { sortBlocks } from './plan';

/** Arten, die man frei einzeichnen bzw. umschalten kann (Termine kommen aus dem Rahmenplan) */
export const EDIT_TYPES: BlockType[] = ['betreuung', 'verfuegung', 'pause'];

/** Darf der Block bearbeitet (Art ändern, löschen) werden? */
export function canEdit(b: Block, variant: Variant): boolean {
  return variant === 'test' && !isLocked(b) && !isTerminBlock(b);
}

export const snapQ = (h: number) => Math.round(h / STEP) * STEP;

/** Freie Lücke um den Zeitpunkt h (null, wenn h in einem Block liegt) */
export function gapAt(blocks: Block[], h: number, open: number, close: number): { lo: number; hi: number } | null {
  if (h < open - EPS || h > close + EPS) return null;
  if (blocks.some((b) => h > b.start + EPS && h < b.end - EPS)) return null;
  let lo = open;
  let hi = close;
  for (const b of blocks) {
    if (b.end <= h + EPS) lo = Math.max(lo, b.end);
    if (b.start >= h - EPS) hi = Math.min(hi, b.start);
  }
  return hi - lo >= STEP - EPS ? { lo, hi } : null;
}

/** Neues Zeitfenster zwischen Anker und aktueller Position, begrenzt auf die Lücke */
export function drawBlock(blocks: Block[], anchor: number, cur: number, gap: { lo: number; hi: number }, id: string, type: BlockType = 'betreuung'): Block[] {
  const a = Math.min(Math.max(snapQ(anchor), gap.lo), gap.hi);
  const c = Math.min(Math.max(snapQ(cur), gap.lo), gap.hi);
  const start = Math.min(a, c);
  const end = Math.max(a, c);
  if (end - start < STEP - EPS) return blocks;
  return sortBlocks([...blocks, { id, start, end, type, verb: 'weich' }]);
}

/** Neues Zeitfenster per Knopf: in die erste passende Lücke ab `from`, bis zu `len` Stunden */
export function addBlockAfter(blocks: Block[], from: number, open: number, close: number, id: string, len = 2): Block[] | null {
  const bs = sortBlocks(blocks);
  const gaps: { lo: number; hi: number }[] = [];
  let t = open;
  for (const b of bs) {
    if (b.start - t >= STEP - EPS) gaps.push({ lo: t, hi: b.start });
    t = Math.max(t, b.end);
  }
  if (close - t >= STEP - EPS) gaps.push({ lo: t, hi: close });
  const g = gaps.find((x) => x.hi > from + EPS) ?? gaps[gaps.length - 1];
  if (!g) return null;
  const start = Math.max(g.lo, Math.min(from, g.hi - STEP));
  return drawBlock(blocks, start, Math.min(g.hi, start + len), g, id);
}

/**
 * Block löschen. Eine Pause zwischen zwei gleichartigen Blöcken wird wieder zu durchgehender Arbeitszeit
 * (die Nachbarn verschmelzen); andere Lücken bleiben frei.
 */
export function deleteBlock(blocks: Block[], id: string): Block[] {
  const bs = sortBlocks(blocks);
  const i = bs.findIndex((b) => b.id === id);
  if (i < 0) return blocks;
  const me = bs[i];
  const prev = bs[i - 1];
  const next = bs[i + 1];
  const flushPrev = prev && Math.abs(prev.end - me.start) < EPS && !isLocked(prev) && !isTerminBlock(prev);
  const flushNext = next && Math.abs(next.start - me.end) < EPS && !isLocked(next) && !isTerminBlock(next);
  if (me.type === 'pause') {
    if (flushPrev && flushNext && prev.type === next.type && prev.verb === next.verb && prev.type !== 'pause') {
      return [...bs.slice(0, i - 1), { ...prev, end: next.end }, ...bs.slice(i + 2)];
    }
    if (flushPrev && prev.type !== 'pause') return [...bs.slice(0, i - 1), { ...prev, end: me.end }, ...bs.slice(i + 1)];
    if (flushNext && next.type !== 'pause') return [...bs.slice(0, i), { ...next, start: me.start }, ...bs.slice(i + 2)];
  }
  return [...bs.slice(0, i), ...bs.slice(i + 1)];
}

/** Art eines Blocks ändern; benachbarte gleichartige Blöcke bleiben getrennt (Zeiten ändern sich nicht). */
export function setBlockType(blocks: Block[], id: string, type: BlockType): Block[] {
  return blocks.map((b) => (b.id === id ? { ...b, type } : b));
}

/** Vorgeschlagene Pausenlänge (h): gesetzlich fehlende Pause, sonst Wunsch aus dem Profil, sonst 30 Minuten */
export function suggestedPause(blocks: Block[], settings: Settings, wunschMinuten = 0): number {
  const raw = missingPause(blocks, settings, wunschMinuten);
  const h = raw > EPS ? raw : wunschMinuten > 0 ? wunschMinuten / 60 : 0.5;
  return Math.max(STEP, Math.ceil(h / STEP - EPS) * STEP);
}

/**
 * Pause in einen Arbeitsblock einziehen (um `at` zentriert, sonst in der Mitte).
 * Der Block wird geteilt; passt die Pause nicht ganz hinein, wird sie gekürzt.
 * Liefert null, wenn es nicht geht (gesperrt, Termin, schon Pause, zu kurz).
 */
export function insertPauseIn(blocks: Block[], id: string, len: number, pauseId: string, at?: number): { blocks: Block[]; pauseId: string } | null {
  const i = blocks.findIndex((b) => b.id === id);
  if (i < 0) return null;
  const b = blocks[i];
  if (b.type === 'pause' || isLocked(b) || isTerminBlock(b)) return null;
  const dur = b.end - b.start;
  if (dur < STEP - EPS) return null;
  // Etwas Arbeitszeit soll stehen bleiben, wenn der Block lang genug ist
  const l = Math.min(len, dur >= len + STEP ? len : Math.max(STEP, dur - STEP));
  const mid = at ?? (b.start + b.end) / 2;
  let s = snapQ(mid - l / 2);
  s = Math.max(b.start, Math.min(b.end - l, s));
  const parts: Block[] = [];
  if (s - b.start > EPS) parts.push({ ...b, id: b.id + ':a', end: s });
  parts.push({ id: pauseId, start: s, end: s + l, type: 'pause', verb: 'weich' });
  if (b.end - (s + l) > EPS) parts.push({ ...b, id: b.id + ':b', start: s + l });
  return { blocks: sortBlocks([...blocks.slice(0, i), ...parts, ...blocks.slice(i + 1)]), pauseId };
}
