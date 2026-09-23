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
  /** Dienstag-Sonderfall; null = wie normBlocks */
  tueBlocks: Block[] | null;
  /** Person-ID der Praxisanleitung („wird angeleitet von“) */
  mentorId: string;
  notiz: string;
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
  /** Tag, an dem die Dienstbesprechung stattfindet (für den Teilnahme-Hinweis); leer = aus */
  besprechungsTag: Day | '';
  /** Pausenstaffel-Tabelle im Plan zeigen */
  showPausenstaffel: boolean;
}

export interface AppData {
  version: 1;
  settings: Settings;
  groups: Group[];
  persons: Person[];
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
  pause: false,
  besprechung: false,
  anleitung: false,
};
