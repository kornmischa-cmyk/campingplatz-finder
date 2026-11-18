// Datenmodell des Rahmenplan-Editors.
// Zeiten sind dezimale Stunden im 0,25-Raster (7.5 = 07:30).

export const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'] as const;
export type Day = (typeof DAYS)[number];

export type BlockType = 'betreuung' | 'verfuegung' | 'pause' | 'besprechung' | 'anleitung';
/** hart = unverrückbar (z. B. muss 14:00 gehen), weich = verhandelbar */
export type Verbindlichkeit = 'hart' | 'weich';

export interface Block {
  id: string;
  start: number;
  end: number;
  type: BlockType;
  verb: Verbindlichkeit;
  /** Nur in der Testfassung: harter Block wurde bewusst entsperrt. */
  unlocked?: boolean;
}

export interface Group {
  id: string;
  name: string;
  kinder: number;
  alter: string;
}

/** Früh- bzw. Spätdienst-Vorgaben einer Person */
export interface DienstVorgabe {
  /** mindestens … pro Woche (0 = keine Vorgabe) */
  min: number;
  /** höchstens … pro Woche; null = unbegrenzt, 0 = darf nicht */
  max: number | null;
  /** an diesen Tagen möglich */
  days: Day[];
}

export type DienstArt = 'frueh' | 'spaet';

/**
 * Personalprofil = Stammdaten + Normalarbeitszeiten.
 * Die Normalzeiten sind die Vorlage für den Plan, wirken aber NICHT direkt auf ihn
 * (siehe ENTSCHEIDUNGEN.md, Punkt „Profil vs. Plan“).
 */
export interface Person {
  id: string;
  name: string;
  qual: string;
  fk: boolean;
  groupId: string;
  soll: number;
  workdays: Day[];
  normBlocks: Block[];
  /** Veraltet (früher „Dienstag-Sonderfall“); wird beim Laden in Termine umgewandelt */
  tueBlocks?: Block[] | null;
  /** Gewünschte Pausenlänge in Minuten, wenn eine Pause nötig ist; fehlt/0 = gesetzliches Minimum */
  pauseMinuten?: number;
  /** Person-ID der Praxisanleitung („wird angeleitet von“) */
  mentorId: string;
  notiz: string;
  /** Früh-/Spätdienst-Vorgaben; fehlt = keine Vorgaben */
  dienste?: Record<DienstArt, DienstVorgabe>;
}

/** Blöcke je Person und Tag. Fehlender Eintrag = an dem Tag nicht eingeplant. */
export type PlanBlocks = Record<string, Partial<Record<Day, Block[]>>>;

export interface Plan {
  blocks: PlanBlocks;
  /** ISO-Zeitpunkt, seit dem die Fassung existiert bzw. gilt */
  since: string;
}

export interface Randzeit {
  start: number;
  end: number;
  minPersonen: number;
}

export interface PausenStufe {
  /** Arbeitszeit über … Stunden */
  abStunden: number;
  minuten: number;
}

export interface Settings {
  kitaName: string;
  open: number;
  close: number;
  /** Mindestanzahl Fachkräfte in Betreuung, durchgehend */
  minFachkraefte: number;
  randzeiten: Randzeit[];
  pausen: PausenStufe[];
  /** Maximale Arbeitszeit am Stück ohne Pause (h) */
  maxAmStueck: number;
  /** Hinweis ab dieser Tagesarbeitszeit (h) */
  hinweisArbeitszeit: number;
  /** Veraltet, wird nicht mehr genutzt (Besprechungen sind jetzt Termine) */
  besprechungsTag?: Day | '';
  /** Pausenstaffel-Tabelle im Plan zeigen */
  showPausenstaffel: boolean;
}

/** Termin im Rahmenplan, z. B. Dienstbesprechung oder Anleitergespräch */
export type TerminTyp = 'besprechung' | 'anleitung' | 'verfuegung';

export interface Termin {
  id: string;
  name: string;
  type: TerminTyp;
  day: Day;
  start: number;
  end: number;
  /** 'alle' = alle, die an dem Tag arbeiten; sonst Personen-IDs */
  teilnehmer: 'alle' | string[];
}

/** Art einer Abwesenheit (bei „krank“ bewusst ohne Notiz – keine Gesundheitsdaten in der Plandatei) */
export type AbwesenheitArt = 'urlaub' | 'krank' | 'fortbildung' | 'sonstiges';

export const ABWESENHEIT_LABEL: Record<AbwesenheitArt, string> = {
  urlaub: 'Urlaub',
  krank: 'Krank',
  fortbildung: 'Fortbildung',
  sonstiges: 'Abwesend',
};

/** Abwesenheit mit festem Datum (ISO „JJJJ-MM-TT“, beide Tage einschließlich) */
export interface Abwesenheit {
  id: string;
  personId: string;
  art: AbwesenheitArt;
  von: string;
  bis: string;
  /** nur bei eintägiger Abwesenheit: Uhrzeit von–bis (sonst ganztägig) */
  start?: number;
  end?: number;
  notiz?: string;
}

export interface AppData {
  version: 1;
  settings: Settings;
  groups: Group[];
  persons: Person[];
  termine: Termin[];
  /** Abwesenheiten mit Datum (Urlaub, Krank, Fortbildung …) – wirken in der Wochenansicht */
  abwesenheiten: Abwesenheit[];
  plans: { geltend: Plan; test: Plan | null };
  meta: { lastBackup: string | null; beispieldaten: boolean };
}

export type Variant = 'geltend' | 'test';

export const TYPE_LABEL: Record<BlockType, string> = {
  betreuung: 'Betreuung',
  verfuegung: 'Verfügungszeit',
  besprechung: 'Dienstbesprechung',
  anleitung: 'Anleitergespräch',
  pause: 'Pause',
};

export const BLOCK_TYPES: BlockType[] = ['betreuung', 'verfuegung', 'pause', 'besprechung', 'anleitung'];

/** Blocktypen, die in der Testfassung gezogen werden dürfen */
export const NUDGEABLE: Record<BlockType, boolean> = {
  betreuung: true,
  verfuegung: true,
  pause: true,
  besprechung: false,
  anleitung: false,
};
