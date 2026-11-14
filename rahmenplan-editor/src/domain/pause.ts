// Pausen: gesetzlich nötige Länge berechnen und automatisch in einen Dienst einplanen.
import type { Block, Settings } from './types';
import { EPS, STEP } from './time';

export function workHours(blocks: Block[]): number {
  return blocks.filter((b) => b.type !== 'pause').reduce((a, b) => a + (b.end - b.start), 0);
}

export function pauseHours(blocks: Block[]): number {
  return blocks.filter((b) => b.type === 'pause').reduce((a, b) => a + (b.end - b.start), 0);
}

/** Geforderte Pause (h) nach Pausenstaffel für eine Arbeitszeit */
export function requiredPause(az: number, settings: Settings): number {
  let req = 0;
  for (const s of settings.pausen) if (az > s.abStunden + EPS) req = Math.max(req, s.minuten / 60);
  return req;
}

/** Ist ein Block ein Termin-Block (Dienstbesprechung usw. aus dem Rahmenplan)? */
export const isTerminBlock = (b: Block) => b.id.startsWith('termin:');

/**
 * Wie viel Pause muss zusätzlich eingeplant werden?
 * Eine Pause verkürzt die Arbeitszeit – gesucht ist die kleinste zusätzliche Pause x,
 * mit der die Arbeitszeit (work - x) nicht mehr Pause verlangt als insgesamt vorhanden (pz + x).
 */
export function missingPause(blocks: Block[], settings: Settings, wunschMinuten = 0): number {
  const work = workHours(blocks);
  const pz = pauseHours(blocks);
  if (requiredPause(work, settings) <= pz + EPS) return 0;
  for (let x = STEP; x <= 4 + EPS; x += STEP) {
    if (requiredPause(work - x, settings) <= pz + x + EPS) {
      return Math.max(x, wunschMinuten / 60 - pz);
    }
  }
  return 0;
}

/**
 * Plant fehlende Pause in die Mitte des Dienstes ein (auf 15 Minuten gerastert),
 * und zwar nur in Betreuungs- oder Verfügungszeit, nie in einen Termin.
 * Liefert die Blöcke unverändert, wenn keine Pause nötig ist oder keine passende Stelle frei ist.
 */
export function withAutoPause(blocks: Block[], settings: Settings, wunschMinuten = 0, idPrefix = 'pause'): Block[] {
  if (!blocks.length) return blocks;
  const raw = missingPause(blocks, settings, wunschMinuten);
  if (raw <= EPS) return blocks;
  const len = Math.ceil(raw / STEP - EPS) * STEP;
  const from = Math.min(...blocks.map((b) => b.start));
  const to = Math.max(...blocks.map((b) => b.end));
  const mid = (from + to) / 2;

  let best: { idx: number; s: number; dist: number } | null = null;
  blocks.forEach((b, idx) => {
    if ((b.type !== 'betreuung' && b.type !== 'verfuegung') || isTerminBlock(b)) return;
    for (let s = b.start; s + len <= b.end + EPS; s += STEP) {
      const dist = Math.abs(s + len / 2 - mid);
      if (!best || dist < best.dist - EPS) best = { idx, s, dist };
    }
  });
  if (!best) return blocks;
  const { idx, s } = best as { idx: number; s: number };
  const b = blocks[idx];
  const parts: Block[] = [];
  if (s - b.start > EPS) parts.push({ ...b, id: b.id + ':a', end: s });
  parts.push({ id: `${idPrefix}@${b.id}`, start: s, end: s + len, type: 'pause', verb: 'weich' });
  if (b.end - (s + len) > EPS) parts.push({ ...b, id: b.id + ':b', start: s + len });
  return [...blocks.slice(0, idx), ...parts, ...blocks.slice(idx + 1)].sort((x, y) => x.start - y.start);
}
