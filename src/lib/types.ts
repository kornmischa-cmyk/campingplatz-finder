export type Uebernachtungsart = "zelt" | "wowa" | "haus" | "trek";
export type Strom = "ja" | "nein" | "unklar";
export type Status = "besucht" | "wunsch";

export interface Place {
  id: number;
  name: string;
  region: string;
  status: Status;
  types: Uebernachtungsart[];
  hours: number;
  bearing: number;
  eco: 0 | 1 | 2 | 3;
  strom: Strom;
  stromException?: boolean;
  anlass: string[];
  rating: number | null;
  link: string;
  note?: string;
  price: string;
  season: string;
  amenities: string[];
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface TypeFilter {
  zelt: boolean;
  wowa: boolean;
  haus: boolean;
  trek: boolean;
}

export type ViewMode = "radar" | "karte";
export type PhotoView = "fotos" | "maps";
export type StatusFilter = "alle" | "besucht" | "wunsch";

export interface NewPlaceDraft {
  name: string;
  region: string;
  types: TypeFilter;
  strom: Strom;
  eco: 1 | 2 | 3;
  anlass: string[];
}
