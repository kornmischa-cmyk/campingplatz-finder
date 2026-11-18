// Eine konkrete Kalenderwoche – gemeinsam genutzt von Wochenansicht, Druck und CSV.
import type { Abwesenheit, AppData, Day, Plan } from './types';
import { DAYS } from './types';
import { abwesenheitenAm, weekDates, wochenPlan } from './abwesenheit';
import { geschlossenAm, type Geschlossen } from './kalender';

export interface Woche {
  monday: string;
  dates: Record<Day, string>;
  /** geltender Plan minus Abwesenheiten; geschlossene Tage ohne Blöcke */
  plan: Plan;
  geschlossen: Record<Day, Geschlossen | null>;
  /** Abwesenheiten je Tag und Person (nur an offenen Tagen) */
  abwesend: Record<Day, Record<string, Abwesenheit[]>>;
}

export function berechneWoche(data: AppData, monday: string): Woche {
  const dates = weekDates(monday);
  const geschlossen = {} as Record<Day, Geschlossen | null>;
  const abwesend = {} as Record<Day, Record<string, Abwesenheit[]>>;
  for (const d of DAYS) {
    geschlossen[d] = geschlossenAm(dates[d], data.settings);
    abwesend[d] = {};
    if (geschlossen[d]) continue;
    for (const p of data.persons) {
      const l = abwesenheitenAm(p.id, dates[d], data.abwesenheiten);
      if (l.length) abwesend[d][p.id] = l;
    }
  }
  const basis = wochenPlan(data.plans.geltend, monday, data.abwesenheiten);
  const blocks: Plan['blocks'] = {};
  for (const [pid, days] of Object.entries(basis.blocks)) {
    blocks[pid] = {};
    for (const d of DAYS) if (days[d] && !geschlossen[d]) blocks[pid][d] = days[d];
  }
  return { monday, dates, plan: { since: basis.since, blocks }, geschlossen, abwesend };
}
