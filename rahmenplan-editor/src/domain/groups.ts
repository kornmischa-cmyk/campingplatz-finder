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

export interface GroupColor {
  c: string;
  s: string;
}

/** Erste drei Farben aus dem Handoff (Frosch, Libellen, Flamingo), danach Ergänzungen im selben Stil. */
export const GROUP_COLORS: GroupColor[] = [
  { c: '#4f8a3f', s: '#e4efda' },
  { c: '#2f78a3', s: '#dcebf6' },
  { c: '#c2537a', s: '#f9e2eb' },
  { c: '#b3701f', s: '#f8e8d2' },
  { c: '#6d5aa8', s: '#e8e3f5' },
  { c: '#2f8a86', s: '#d9efed' },
];
const NEUTRAL: GroupColor = { c: '#8a7e70', s: '#efe9e1' };

export function groupColor(groups: Group[], groupId: string): GroupColor {
  const i = groups.findIndex((g) => g.id === groupId);
  return i < 0 ? NEUTRAL : GROUP_COLORS[i % GROUP_COLORS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? '?').slice(0, 2);
}
