// CSV-Export des geltenden Plans – für Excel mit deutschen Ländereinstellungen:
// Semikolon als Trenner, Dezimalkomma, UTF-8 mit BOM, CRLF.
import type { AppData } from './types';
import { ABWESENHEIT_LABEL } from './types';
import { berechneWoche } from './woche';
import { fmtDatum, istGanztaegig, kalenderwoche } from './abwesenheit';
import { DAYS, TYPE_LABEL } from './types';
import { fmt, fmtDecimal } from './time';
import { blocksOf, sortBlocks } from './plan';
import { groupedPersons } from './groups';

function cell(v: string): string {
  // Formel-Injection verhindern (Excel wertet =, +, -, @ am Anfang aus)
  const safe = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
  return /[;"\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
}

export function planToCsv(data: AppData): string {
  const plan = data.plans.geltend;
  const rows: string[][] = [['Gruppe', 'Person', 'Qualifikation', 'Fachkraft', 'Tag', 'Beginn', 'Ende', 'Tätigkeit', 'Dauer (h)']];
  for (const { group: g, members } of groupedPersons(data)) {
    for (const p of members) {
      for (const d of DAYS) {
        for (const b of sortBlocks(blocksOf(plan, p.id, d))) {
          rows.push([g.name, p.name, p.qual, p.fk ? 'ja' : 'nein', d, fmt(b.start), fmt(b.end), TYPE_LABEL[b.type], fmtDecimal(b.end - b.start)]);
        }
      }
    }
  }
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

/** CSV einer konkreten Woche: eine Zeile je Block, dazu Abwesenheiten und geschlossene Tage */
export function wocheToCsv(data: AppData, monday: string): string {
  const w = berechneWoche(data, monday);
  const kw = kalenderwoche(monday);
  const rows: string[][] = [['KW', 'Datum', 'Tag', 'Gruppe', 'Person', 'Fachkraft', 'Beginn', 'Ende', 'Tätigkeit / Status', 'Dauer (h)']];
  for (const d of DAYS) {
    const datum = fmtDatum(w.dates[d]);
    const zu = w.geschlossen[d];
    if (zu) {
      rows.push([String(kw), datum, d, '', '', '', '', '', `Kita geschlossen: ${zu.name}`, '']);
      continue;
    }
    for (const { group: g, members } of groupedPersons(data)) {
      for (const p of members) {
        for (const a of w.abwesend[d][p.id] ?? []) {
          const ganz = istGanztaegig(a);
          rows.push([String(kw), datum, d, g.name, p.name, p.fk ? 'ja' : 'nein', ganz ? '' : fmt(a.start!), ganz ? '' : fmt(a.end!), `Abwesend: ${ABWESENHEIT_LABEL[a.art]}`, '']);
        }
        for (const b of sortBlocks(blocksOf(w.plan, p.id, d))) {
          rows.push([String(kw), datum, d, g.name, p.name, p.fk ? 'ja' : 'nein', fmt(b.start), fmt(b.end), TYPE_LABEL[b.type], fmtDecimal(b.end - b.start)]);
        }
      }
    }
  }
  return '\ufeff' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}
