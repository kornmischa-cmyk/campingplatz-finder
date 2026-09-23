import type { AppData, Group, Person } from './types';

export const NO_GROUP: Group = { id: '__ohne', name: 'ohne Zuordnung', kinder: 0, alter: '' };

/** Personen je Gruppe in Gruppenreihenfolge; Personen ohne gültige Gruppe landen am Ende. */
export function groupedPersons(data: Pick<AppData, 'groups' | 'persons'>): { group: Group; members: Person[] }[] {
  const ids = new Set(data.groups.map((g) => g.id));
  const out = data.groups.map((group) => ({ group, members: data.persons.filter((p) => p.groupId === group.id) }));
  const orphans = data.persons.filter((p) => !ids.has(p.groupId));
  if (orphans.length) out.push({ group: NO_GROUP, members: orphans });
  return out;
}

export function groupLabel(g: Group): string {
  return g.name + (g.kinder ? ` · ${g.kinder} Kinder` : '') + (g.alter ? `, ${g.alter}` : '');
}
