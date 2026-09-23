# Handoff: Rahmenplan-Editor (Kita-Personalplanung)

## Überblick
Ein Werkzeug für die Kita-Leitung, um den **Rahmenplan** zu pflegen. Der Rahmenplan ist der wiederkehrende Wochen-Standardplan: Wer arbeitet wann, in welcher Tätigkeit. Die Leitung legt Testfassungen an, verschiebt Zeitblöcke und ändert ihre Länge, sieht sofort Abdeckung und Regelverstöße und übernimmt eine Testfassung als geltenden Plan. Dazu kommen Personalprofile mit Qualifikation, Arbeitstagen, Normalarbeitszeiten und Verbindlichkeit.

Nicht Teil des Rahmenplans ist die **konkrete Woche** mit Krankheit, Urlaub und Ausfällen. Sie ist ein eigener, späterer Baustein.

## Über die Design-Dateien
Die Dateien in diesem Paket sind **Design-Referenzen in HTML**. Es sind Prototypen, die Aussehen und Verhalten zeigen, kein Produktionscode. Aufgabe ist, sie **im Ziel-Stack nachzubauen**, mit dessen etablierten Mustern. Gibt es noch keinen Stack, wähle einen passenden. Empfehlung: React + TypeScript, Regel-Engine als reines TS-Modul mit Unit-Tests.

`Rahmenplan-Editor.dc.html` lässt sich direkt im Browser öffnen (`support.js` muss daneben liegen). Die gesamte Logik steht im `<script data-dc-script>`-Block am Dateiende. Datenstrukturen, Regeln und Drag-Logik kann man dort 1:1 nachlesen.

## Fidelity
**High-fidelity.** Farben, Typografie, Radien, Schatten, Blockmuster und Interaktionen sind final und sollen pixelgenau übernommen werden. Die visuelle Richtung ist **„Warm & freundlich“** (Variante A). Das Profil-Panel übernimmt Schriften und Farben dieser Richtung. Sein Formular-Layout ist funktional, visuell aber noch nicht voll ausgearbeitet (mittlere Fidelity).

---

## Ansichten

Seitenhintergrund `#f7f1e8` (Creme). Inhalt zentriert, `max-width:1320px`, `padding:28px 28px 80px`. Grundschrift Figtree 14px/1.5, Tinte `#2a2622`.

### 1. Kopf
- Kicker „Kita Sonnenblume“: 13px/700, `#9a5a2c`
- H1 „Rahmenplan“: Bricolage Grotesque 800, 36px/1.05, letter-spacing −.015em
- Untertitel: 13.5px, `#5f564c`
- Rechts ein Segment-Schalter „Rahmenplan | Personal“: Pill-Container `#efe4d4`, padding 4px, radius 999px. Aktiv: weiß, Schatten `0 1px 3px rgba(60,40,20,.18)`. Inaktiv: transparent, `#5f564c`. 13px/600, padding 8px 16px.

### 2. Rahmenplan
**a) Fassung:** Segment-Schalter „Geltender Plan | Testfassung 1“ im gleichen Stil. Rechts der Hinweis „Verschieben geht nur in der Testfassung“ und der Primär-Button „Als geltend übernehmen“: Pill in `#c2552a`, weiß, 13px/700, padding 10px 18px, Schatten `0 4px 12px rgba(194,85,42,.3)`. Deaktiviert: `#efe6da` / `#7d7163`.

**b) Tageskarten:** Grid mit 5 gleich breiten Spalten, gap 10px. Karte: radius 18px, padding 14px 16px.
- Inaktiv: `#fffaf3`, Rand 2px `#efe4d4`
- Aktiv: weiß, Rand 2px `#2a2622`, Schatten `0 8px 20px rgba(80,50,20,.12)`

Inhalt: Tagesname voll ausgeschrieben (Bricolage 700, clamp 14–19px) und darunter ein Status-Chip (Pill, 12.5px/600, Punkt 8px):
- Verstoß: „5 Probleme“, bg `#fbe6df`, Text `#9c2f1c`, Punkt `#c8432b`
- Hinweis: „1 Hinweis“, bg `#fbeed6`, Text `#7a520f`, Punkt `#d49a2a`
- OK: „Alles gut“, bg `#e3f0df`, Text `#2d6536`, Punkt `#3f8f4c`

`aria-label` z. B. „Di: 5 Verstöße, 1 Hinweis“.

**c) Status-Banner** (`aria-live="polite"`): radius 22px, padding 20px 24px, Hintergrund und Text in der Tonfarbe des Tages (siehe oben).
- Links ein Kreis 64px in der Punktfarbe mit Zahl, „!“ oder „✓“ (Bricolage 800, 28px, weiß)
- Rechts: Zeile „Dienstag · Testfassung 1“ (13px/700), Titel „5 Probleme“, „Keine Probleme“ oder „Alles gut besetzt“ (Bricolage 800, 28px) und ein Satz in Klartext (14px)

**d) Planungskarte:** weiß, radius 24px, padding 20px 22px 16px, Schatten `0 1px 2px rgba(80,50,20,.06), 0 12px 32px rgba(80,50,20,.07)`. Innen horizontal scrollbar (`min-width:780px`, `overflow-y:hidden`, 24px Luft oben für das Zeit-Badge).
- Grid `220px | 1fr`. Stundenticks 12px/600, `#8a7e70`.
- **Gruppenkopf:** Punkt 12px in Gruppenfarbe, Name (Bricolage 700, 18px), Zusatz „25 Kinder, 3–6 J.“ (13px, `#5f564c`). Darunter ein Problem-Streifen 6px, `#d9553b`, radius 3px.
- **Personenzeile:** Trennlinie oben 1px `#f4ede3`.
  - Avatar 36px rund mit Initialen (Bricolage 700, 13px) in Gruppen-Soft- und Gruppen-Farbe
  - Name als Button (14.5px/700, Unterstreichung bei Hover), öffnet das Profil
  - „FK“-Pill (10.5px/700, `#7a520f` auf `#fbeed6`) bei Fachkräften
  - Meta-Zeile 12px, `#5f564c`
- **Spur:** 52px hoch, Stundenlinien 1px `#f4ede3` alle 1/9.5 der Breite (10.5263 %).
- **Block:** `top:9px; height:34px; radius:9px; font 12px; line-height 31px`. Betreuung in **Gruppenfarbe**: Soft-Fläche plus Rand 1.5px in Gruppenfarbe.
- **Besetzung** (unter den Gruppen, Trennlinie 2px `#f4ede3`): Titel „Besetzung“ mit Erklärsatz, rechts ein Säulendiagramm mit 76px Höhe, einer Säule je 15 Minuten und gap 2px.
  - Säulenhöhe = Personen / max. Säulenfläche `#ecdcc3`
  - Unterer, dunkler Anteil = Fachkräfte, `#a8753d`
  - Unterschreitung: Fläche `#f2b9aa`, Fachkraft-Anteil `#c8432b`
  - Darunter zur halben Stunde „Personen / Fachkräfte“ (11px), dann eine Legende
- **Legende der Blocktypen** am Kartenfuß (12px, `#5f564c`)

**e) Auswahlleiste:** `position:sticky; bottom:16px`, dunkel `#2a2622`, radius 20px, Schatten `0 12px 30px rgba(30,20,10,.28)`.
- Inhalt: Label (fett), Bedienhinweis (12px, `#e3d9cc`)
- Pill-Buttons `#4a4038`: „◂ 15 Min“, „15 Min ▸“, „Ende −15“, „Ende +15“
- „Fertig“ (Link-Stil) hebt die Auswahl auf

**f) „Was am Dienstag auffällt“:** H2 in Bricolage 700, 20px. Darunter ein Karten-Grid (`auto-fill, minmax(300px,1fr)`, gap 12px). Karte: radius 16px, padding 14px 16px, Hintergrund in Tonfarbe, Punkt 10px, Titel 600 in Tonfarbe, Beschreibung 13px `#4a433c`.

**g) Aufklappbar (`<details>`):** „Wochenübersicht“ und „Pausenregeln“. Weiß, radius 18px, Tabellenlinien `#f1e8dc`, Kopf `#faf5ee`.

**h) Fußnote:** 12.5px, max. 760px breit.

### 3. Personal
Liste pro Gruppe. Karten weiß, Rand `#efe4d4`, radius 14px, padding 12px 16px, mit Name, Qualifikation, Soll und Fachkraft-Badge. Ein Klick öffnet das Profil.

### 4. Profil-Panel (Drawer rechts)
`position:fixed`, 400px breit (max. 92vw), Hintergrund `#fffaf3`, Overlay `rgba(32,31,29,.35)`. Titel in Bricolage 800, 26px. Felder:
- „Zählt als Fachkraft“ (Checkbox)
- Qualifikation, Gruppe, Soll h/Wo
- Arbeitstage (5 Checkboxen)
- Normalarbeitszeiten: Blöcke mit Start/Ende (0.25er-Raster), Typ, **Verbindlichkeit hart/weich** und „Entfernen“; „+ Block“
- Dienstag-Sonderfall (optional eigene Blockliste)
- Praxisanleitung (angeleitet von / leitet an)
- Bemerkungen

Änderungen wirken sofort überall.

---

## Blocktypen (visuell eindeutig, nicht nur über Farbe)
| Typ | Darstellung |
|---|---|
| betreuung | Fläche in Gruppen-Soft-Farbe, Rand 1.5px Gruppenfarbe, Text 600 |
| verfuegung | Punktraster: `radial-gradient(#c9a463 1.3px, transparent 1.6px)` 8×8px auf `#f8f4f4`, Rand `#b68235` |
| besprechung | Diagonalstreifen 45°: `#d9bd85 0 2px, transparent 2px 9px` |
| anleitung | Kreuzschraffur ±45°: `#d9bd85 0 1.5px, transparent 1.5px 9px` |
| pause | `#f8f4f4`, Rand 2px dotted `#d7d3d3`, Text `#605d5d`, keine Kurzbeschriftung |

**Gruppenfarben:** Frosch `#4f8a3f` / soft `#e4efda` · Libellen `#2f78a3` / soft `#dcebf6` · Flamingo `#c2537a` / soft `#f9e2eb`

---

## Interaktionen

### Auswählen
Klick oder Fokus auf einen Block wählt ihn aus: Outline 2px `#201f1d`, Offset 1px, z-index 3. Über dem Block erscheint ein **Zeit-Badge** (`#201f1d` / `#f8f4f4`, 11px/600) mit „07:15–09:00 · 1:45 h“. So bleibt die Zeit auch bei sehr kurzen Blöcken lesbar.

### Verschieben und Länge ändern (nur in der Testfassung, nur `betreuung` und `verfuegung`)
- **Block ziehen:** verschiebt Beginn und Ende gemeinsam
- **Linken oder rechten Rand ziehen:** ändert Beginn oder Ende. Die Griffzone ist 10px breit, Cursor `ew-resize`, sichtbarer Griff 2×12px in `#7d5411`.
- Raster: 15 Minuten (`Math.round(dh/0.25)*0.25`). Mindestdauer 15 Minuten. Grenzen: OPEN und CLOSE.
- Pointer-Events: `pointerdown` am Block oder Griff, `pointermove`/`pointerup` auf `window`. `touch-action:none`, `user-select:none`.

**Regeln für Nachbarblöcke** (verhindern Überlappungen; siehe `snapshot()` / `applyDelta()`):
- Liegt ein Nachbar **bündig** an und ist anpassbar (`betreuung`, `verfuegung`, `pause`), wandert die gemeinsame Kante mit. Der Nachbar wird kürzer oder länger, mindestens 15 Minuten.
- Liegt ein Nachbar bündig an, ist aber **nicht anpassbar** (z. B. Dienstbesprechung, Anleitergespräch): Die Kante stoppt am Nachbarn.
- Gibt es eine **Lücke**, kann die Kante sich bis zum Nachbarn bewegen, nicht darüber hinaus.
- Die Grenzen `[lo, hi]` werden beim Drag-Start einmal berechnet. Jede Bewegung setzt dann `delta` = geklemmter Wert relativ zum Startzustand, deterministisch und ohne Drift.

### Tastatur
Verschiebbare Blöcke sind fokussierbar (`tabIndex=0`, `role="button"`, beschreibendes `aria-label`):
- `←` / `→`: 15 Minuten verschieben
- `Alt + ←/→`: Beginn ändern
- `Umschalt + ←/→`: Ende ändern
- `Esc`: Auswahl aufheben

Nicht verschiebbare Blöcke haben `role="img"` mit `aria-label`.

### Beschriftung im Block (abhängig von der Breite)
Die Breite der Timeline wird per ResizeObserver gemessen. Die verfügbare Pixelbreite eines Blocks entscheidet über die Beschriftung:
1. lang „08:00–09:00“
2. kurz „8–9“ bzw. „8–9:30“
3. nur Beginn „8“
4. leer (die Zeit steht dann im Badge oder Tooltip)

Faustregel: etwa 7px pro Zeichen bei 12px Schrift. Pausen erhalten keine Kurzbeschriftung.

### Fassungen
- „Geltender Plan“ ist schreibgeschützt.
- „Testfassung 1“ speichert nur **Abweichungen** pro Block: `testNudges[personId|tag|blockIndex] = {s, e}` (Delta in Stunden für Beginn und Ende).
- „Als geltend übernehmen“ setzt im Prototyp nur zurück. **In Produktion:** Deltas in den Rahmenplan schreiben, Version historisieren.

---

## Regeln (Regel-Engine, pro Tag und Fassung)
Grundlage: Slots zu je 15 Minuten von OPEN bis CLOSE. Pro Slot wird gezählt: `tot` = Personen in `betreuung`, `fk` = davon Fachkräfte.

**Verstöße:**
1. Keine Fachkraft im Haus (`fk < 1`), für jeden zusammenhängenden Zeitraum
2. Früh- und Spätdienst (7:00–7:30, 15:00–16:30) mit weniger als 2 Personen
3. Pflichtpause fehlt: Arbeitszeit über 6 h braucht 30 Minuten, über 9 h 45 Minuten (§4 ArbZG). Arbeitszeit = alle Blöcke außer Pause.
4. Mehr als 6 h am Stück ohne Pause, unabhängig davon, wo die Pflichtpause liegt

**Hinweise:**
5. Arbeitszeit über 8 h (§3 ArbZG, Ausgleich nötig)
6. Dienstag: X von Y anwesenden Personen nehmen an der Dienstbesprechung teil

Ohne Befund: „OK – Keine Verstöße“.

⚠️ Die Regeln sind **beispielhaft** hinterlegt. Vor der Umsetzung fachlich validieren (siehe offene Fragen). Unter-18-Regeln (§11 JArbSchG) stehen nur in der Info-Tabelle und werden noch nicht geprüft.

---

## Datenmodell (aus dem Prototyp)
```ts
type BlockType = 'betreuung'|'verfuegung'|'pause'|'besprechung'|'anleitung';
type Verbindlichkeit = 'hart'|'weich';  // hart = unverrückbar (z. B. muss 14:00 gehen), weich = verhandelbar
interface Block { start: number; end: number; type: BlockType; verb: Verbindlichkeit } // Stunden dezimal, 0.25er-Raster
interface Profile {
  qual: string; fk: boolean; grp: string; soll: number;       // Soll h/Woche
  workdays: ('Mo'|'Di'|'Mi'|'Do'|'Fr')[];
  normBlocks: Block[];            // Standard-Tag
  tueBlocks: Block[] | null;      // Dienstag-Sonderfall (Besprechung/Anleitung)
  mentorOf: string;               // Person-ID der Praxisanleitung (wird angeleitet von)
  notiz: string;
}
// Fassung (Test): Record<`${personId}|${day}|${blockIdx}`, {s:number; e:number}>
```
Empfehlung für Produktion: Blöcke mit stabiler ID statt Index. Fassungen als eigene Entität (Status: Entwurf, geltend, archiviert) mit Blocklisten oder Diff. Die Verbindlichkeit „hart“ sollte das Verschieben sperren oder warnen. Im Prototyp ist das **noch nicht umgesetzt**.

## State (Prototyp)
`variant` ('geltend'|'test'), `day`, `selected {id,day,idx}`, `testNudges`, `dragging {key,mode:'move'|'l'|'r',startX,rectWidth,snap}`, `view` ('plan'|'personal'), `profileOpen`, `profiles` (Overrides), `tlW` (gemessene Timeline-Breite).

---

## Design-Tokens
**Farben**
- Seite `#f7f1e8` · Karte `#fff` · Karte warm `#fffaf3` · Segment-Track `#efe4d4` · Linien `#f4ede3` / `#efe4d4`
- Tinte `#2a2622` · Sekundärtext `#5f564c` · Ticks `#8a7e70` · Kicker `#9a5a2c`
- Primär (CTA) `#c2552a` · Auswahlleiste `#2a2622`, Buttons darin `#4a4038`
- Status Verstoß: Text `#9c2f1c`, bg `#fbe6df`, Punkt `#c8432b`, Streifen `#d9553b`
- Status Hinweis: Text `#7a520f`, bg `#fbeed6`, Punkt `#d49a2a`
- Status OK: Text `#2d6536`, bg `#e3f0df`, Punkt `#3f8f4c`
- Besetzung: Fläche `#ecdcc3`, Fachkräfte `#a8753d`, zu wenig `#f2b9aa` / `#c8432b`
- Muster: Rand `#b68235`, `#c9a463`, `#d9bd85`
- Gruppenfarben: siehe Blocktypen

**Typografie**
- Headlines: **Bricolage Grotesque** 700/800 (Google Fonts)
- Text und UI: **Figtree** 400–700
- Größen: 36 (H1) · 28 (Status-Titel) · 20 (H2) · 18–19 (Gruppe, Tag) · 14.5 · 14 · 13.5 · 13 · 12.5 · 12 · 11 (Minimum)

**Radien:** Seiten-Karte 24 · Status 22 · Tageskarte, Auswahlleiste 18–20 · Regelkarte 16 · Personenkarte 14 · Block 9 · Säulen 4 · Pills 999
**Schatten:** Karte `0 1px 2px rgba(80,50,20,.06), 0 12px 32px rgba(80,50,20,.07)` · aktive Tageskarte `0 8px 20px rgba(80,50,20,.12)` · Drag `0 3px 8px rgba(45,43,43,.28)` · Auswahlleiste `0 12px 30px rgba(30,20,10,.28)`
**Abstände:** Seite 28px · Karten-Padding 20–24px · Gaps 10 / 12 / 16 / 18px

## Barrierefreiheit (bereits berücksichtigt / noch offen)
- ✅ Kontraste der Labels auf AA angehoben, Status nie nur über Farbe (Zahl, „!“ oder „✓“ plus Muster), Tastaturbedienung der Blöcke, `aria-pressed` bei Toggles, `aria-live` in der Auswahlleiste, Fokus-Outline
- ⬜ Drawer: Fokus beim Öffnen hineinsetzen, Fokus-Falle, Esc schließt, Fokus beim Schließen zurückgeben
- ⬜ Formularfelder im Profil: echte `<label for>` statt Div-Labels
- ⬜ Die Timeline könnte für Screenreader zusätzlich als Tabelle bzw. Liste pro Person angeboten werden
- ⬜ Mindestgröße der Touch-Ziele auf Tablets (Griffzonen 10px sind nur für Desktop ausgelegt)

## Offene Fragen vor der Umsetzung
1. Wer nutzt das Tool (nur Leitung oder auch das Team), und auf welchen Geräten (Desktop, Tablet)?
2. Ziel-Stack und Hosting? Gibt es ein bestehendes System (Login, Personalstamm)?
3. Welche Regeln sind verbindlich: Fachkraftquote, Landesrecht, Betreuungsschlüssel pro Gruppe? Zählen PiVA-Auszubildende als Fachkraft (im Prototyp: nein)?
4. Wie genau soll „hart/weich“ wirken: sperren, warnen oder nur anzeigen?
5. Mehrere Testfassungen: Vergleichsansicht nötig? Historie oder Freigabe-Workflow?
6. Anbindung an die „konkrete Woche“ (Ausfälle, Vertretung)

## Dateien
- `Rahmenplan-Editor.dc.html`: vollständiger Prototyp in der finalen Richtung „Warm & freundlich“ (Template + Logik in einer Datei). Die visuellen Anpassungen stehen gebündelt in der Methode `decorate()` am Ende der Logik.
- `support.js`: Runtime, damit der Prototyp lokal im Browser läuft (nicht übernehmen)

## Assets
Keine Bilder oder Icons. Fonts über Google Fonts (Bricolage Grotesque, Figtree). Alle Muster sind reine CSS-Gradients.
