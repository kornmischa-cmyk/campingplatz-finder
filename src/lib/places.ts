import { Place } from "./types";

export const ANLASS_ALL = [
  "Familie",
  "Wassersport",
  "Winter",
  "Öko",
  "Sport",
  "Strand",
  "Trekking",
  "Gruppe",
  "Auszeit",
  "Wellness",
  "Alpen",
] as const;

export const RADAR_MAX_H = 7;

export const INITIAL_PLACES: Place[] = [
  { id: 1, name: "Wohnmobilstellplatz Wildflecken", region: "Rhön, Bayern", status: "besucht", types: ["wowa"], hours: 1.1, bearing: 100, eco: 2, strom: "ja", anlass: ["Auszeit"], rating: 4, link: "https://www.alpacacamping.de/properties/1553", note: "Ruhiger Aussichtsplatz, eigenes WC nötig.", price: "12–15 €/Nacht", season: "Mai–Sep", amenities: ["Sanitär", "Hunde erlaubt"] },
  { id: 2, name: "Campingplatz Mainufer (TSV Lohr)", region: "Lohr am Main, Bayern", status: "besucht", types: ["zelt", "wowa"], hours: 1.0, bearing: 135, eco: 1, strom: "ja", anlass: ["Familie", "Wassersport"], rating: 5, link: "https://www.tsv-lohr.de/de/campingplatz/", note: "Freibad & Main-Strand direkt am Platz.", price: "18–22 €/Nacht", season: "Apr–Okt", amenities: ["Sanitär", "Restaurant", "Kinderspielplatz", "Bootssteg"] },
  { id: 3, name: "Wäller Camp", region: "Westerwald, Hessen", status: "besucht", types: ["wowa"], hours: 1.3, bearing: 300, eco: 2, strom: "ja", anlass: ["Familie", "Wassersport"], rating: 4, link: "https://www.waeller-camp.de/", note: "Badesee direkt am Platz, Strom als Zubuchung.", price: "16–20 €/Nacht", season: "Apr–Okt", amenities: ["Sanitär", "Badesee", "Hunde erlaubt"] },
  { id: 4, name: "Stellplatz am Hof – Fladungen", region: "Rhön, Bayern", status: "besucht", types: ["zelt", "wowa"], hours: 1.8, bearing: 95, eco: 3, strom: "ja", anlass: ["Familie", "Öko"], rating: 5, link: "https://www.alpacacamping.de/properties/329", note: "Alpakas, Biogas, Hofladen — stärkstes Öko-Profil der Nah-Plätze.", price: "14–18 €/Nacht", season: "ganzjährig", amenities: ["Sanitär", "Hofladen", "Hunde erlaubt"] },
  { id: 5, name: "Freizeitanlage Strutt", region: "Wasserkuppe, Rhön", status: "besucht", types: ["trek"], hours: 1.5, bearing: 100, eco: 3, strom: "nein", stromException: true, anlass: ["Gruppe", "Trekking"], rating: 4, link: "https://www.poppenhausen-wasserkuppe.de/", note: "Strom-Ausnahme: nur Trekking + Gruppe. Solar-Gemeinschaftssteckdosen, kein Parzellenstrom.", price: "10–14 €/Nacht", season: "Apr–Okt", amenities: ["Trockentoiletten", "Solarstrom", "Feuerstelle"] },
  { id: 6, name: "Holschbacher Höhe", region: "Westerwald, Rheinland-Pfalz", status: "wunsch", types: ["zelt", "wowa", "haus"], hours: 1.6, bearing: 290, eco: 3, strom: "ja", anlass: ["Familie"], rating: null, link: "https://www.holschbacherhoehe.de/", note: "Nur wenige Plätze — früh anfragen.", price: "16–20 €/Nacht", season: "Mai–Sep", amenities: ["Sanitär", "Kinderspielplatz"] },
  { id: 7, name: "Campingpark Münsterland Eichenhof", region: "Sassenberg, Münsterland", status: "wunsch", types: ["zelt", "wowa", "haus"], hours: 2.9, bearing: 330, eco: 1, strom: "ja", anlass: ["Familie", "Strand"], rating: null, link: "https://www.campmuensterland.de/", note: "100 m zum Feldmarksee.", price: "20–26 €/Nacht", season: "Apr–Okt", amenities: ["Sanitär", "Restaurant", "Badesee", "Kinderspielplatz"] },
  { id: 8, name: "Schwarzwaldcamp", region: "Schluchsee, Baden-Württemberg", status: "besucht", types: ["trek"], hours: 3.8, bearing: 220, eco: 3, strom: "nein", stromException: true, anlass: ["Auszeit", "Trekking"], rating: 5, link: "https://www.schwarzwaldcamp.com/", note: "Strom-Ausnahme: nur Trekking. Baumzelte & Tipis.", price: "vsl. 60–90 €/Nacht (Baumzelt)", season: "Apr–Okt", amenities: ["Sanitär", "Baumzelte", "Trekking-Route"] },
  { id: 9, name: "Wirthshof Resort", region: "Markdorf, Bodensee", status: "besucht", types: ["zelt", "wowa", "haus"], hours: 3.8, bearing: 200, eco: 1, strom: "ja", anlass: ["Wellness", "Familie", "Winter"], rating: 4, link: "https://www.wirthshof.de/", note: "Komfort-/Wellness-Profil, ganzjährig.", price: "28–38 €/Nacht", season: "ganzjährig", amenities: ["Sanitär", "Wellness", "Restaurant", "WLAN"] },
  { id: 10, name: "Zugspitz Resort", region: "Ehrwald, Tirol (AT)", status: "besucht", types: ["wowa", "haus"], hours: 4.2, bearing: 175, eco: 1, strom: "ja", anlass: ["Winter", "Familie"], rating: 5, link: "https://www.zugspitz-resort.at/", note: "5★-Wintercamping, winterlich erprobt.", price: "30–42 €/Nacht", season: "ganzjährig", amenities: ["Sanitär", "Restaurant", "WLAN", "Winterbetrieb"] },
  { id: 11, name: "Alpsee Camping", region: "Immenstadt, Allgäu", status: "wunsch", types: ["wowa"], hours: 4.2, bearing: 185, eco: 1, strom: "ja", anlass: ["Winter", "Familie"], rating: null, link: "https://www.alpsee-camping.de/de/", note: "Silvester-Betrieb vor Buchung bestätigen.", price: "24–30 €/Nacht", season: "ganzjährig", amenities: ["Sanitär", "Seezugang", "WLAN"] },
  { id: 12, name: "Naturcamping Kuprian", region: "Ötztal, Tirol (AT)", status: "besucht", types: ["zelt", "wowa", "haus"], hours: 5.7, bearing: 180, eco: 2, strom: "ja", anlass: ["Alpen", "Sport", "Wellness"], rating: 5, link: "https://www.naturcamping.tirol/", note: "Alpen-Urlaub, kein reines Wochenende.", price: "22–28 €/Nacht", season: "Mai–Sep", amenities: ["Sanitär", "Bergpanorama", "Restaurant"] },
  { id: 13, name: "Camping de Lakens", region: "Bloemendaal aan Zee, NL", status: "besucht", types: ["zelt"], hours: 4.7, bearing: 305, eco: 3, strom: "ja", anlass: ["Strand", "Familie"], rating: 5, link: "https://www.campingdelakens.de/", note: "Green-Key-zertifiziert, Nationalpark-Lage.", price: "26–34 €/Nacht", season: "Apr–Okt", amenities: ["Sanitär", "Green Key", "Strandzugang", "Hunde erlaubt"] },
  { id: 14, name: "Strandcamping Groede", region: "Zeeuws-Vlaanderen, NL", status: "besucht", types: ["zelt", "wowa"], hours: 5.2, bearing: 295, eco: 1, strom: "ja", anlass: ["Strand", "Familie"], rating: 4, link: "https://www.strandcampinggroede.nl/de", note: "Großer Familien-Ferienplatz, 888 Plätze.", price: "24–32 €/Nacht", season: "Apr–Sep", amenities: ["Sanitär", "Strandzugang", "Restaurant", "Kinderspielplatz"] },
  { id: 15, name: "Alpencamp Kärnten", region: "Kötschach-Mauthen, Kärnten (AT)", status: "wunsch", types: ["zelt", "wowa", "haus"], hours: 6.7, bearing: 155, eco: 3, strom: "ja", anlass: ["Alpen", "Winter", "Öko"], rating: null, link: "https://www.alpencamp.at/", note: "Weitester Platz — Reise, kein Wochenende.", price: "20–26 €/Nacht", season: "Mai–Sep, Dez–Mär", amenities: ["Sanitär", "Bergpanorama", "Winterbetrieb"] },
];

export function fmtH(h: number) {
  return h.toFixed(h % 1 === 0 ? 0 : 1).replace(".", ",");
}
