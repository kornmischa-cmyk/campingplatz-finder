# Handoff: Rahmenplan-Editor (Kita-Personalplanung)

## Überblick
Ein Werkzeug für die Kita-Leitung, um den **Rahmenplan** zu pflegen. Der Rahmenplan ist der wiederkehrende Wochen-Standardplan: Wer arbeitet wann, in welcher Tätigkeit. Die Leitung legt Testfassungen an, verschiebt Zeitblöcke und ändert ihre Länge, sieht sofort Abdeckung und Regelverstöße und übernimmt eine Testfassung als geltenden Plan. Dazu kommen Personalprofile mit Qualifikation, Arbeitstagen, Normalarbeitszeiten und Verbindlichkeit.

Nicht Teil des Rahmenplans ist die **konkrete Woche** mit Krankheit, Urlaub und Ausfällen. Sie ist ein eigener, späterer Baustein.

## Über die Design-Dateien
Die Dateien in diesem Paket sind **Design-Referenzen in HTML**. Es sind Prototypen, die Aussehen und Verhalten zeigen, kein Produktionscode. Aufgabe ist, sie **im Ziel-Stack nachzubauen**, mit dessen etablierten Mustern. Gibt es noch keinen Stack, wähle einen passenden. Empfehlung: React + TypeScript, Regel-Engine als reines TS-Modul mit Unit-Tests.

`Rahmenplan-Editor.dc.html` lässt sich direkt im Browser öffnen (`support.js` muss daneben liegen). Die gesamte Logik steht im `<script data-dc-script>`-Block am Dateiende. Datenstrukturen, Regeln und Drag-Logik kann man dort 1:1 nachlesen.

## Fidelity
**High-fidelity** bei Farben, Typografie, Blockmustern und Interaktionen. Abstände und Größen sind final genug, um sie zu übernehmen. Das Profil-Panel ist funktional vollständig, visuell aber weniger ausgearbeitet (mittlere Fidelity).

---

## Ansichten

### 1. Kopf + Ansichtsumschalter
- H1 „Rahmenplan bearbeiten“: Cormorant Garamond italic 600, 21px
- Untertitel: 11.5px, #605d5d (Kita, Öffnungszeit, Kinder, Personen, Wochenstunden)
- Umschalter „Rahmenplan | Personal“: Toggle-Buttons mit `aria-pressed`

### 2. Rahmenplan (Hauptansicht)
Leisten von oben nach unten, jeweils `padding:10px 20px`, getrennt durch `border-bottom:1px solid #eae7e7`:

**a) Fassung:** „Geltender Plan“, „Testfassung 1“, „+ Neue Testfassung“ (deaktiviert, Platzhalter), „Als geltend übernehmen“ (nur in der Testfassung aktiv).

**b) Tag:** Mo–Fr als Toggle-Buttons. **Jeder Tag hat ein Status-Badge** (18px hoch, Pill mit radius 9px, 10.5px/600):
- rot `#8a1f14` auf weiß: Anzahl der Regelverstöße
- „!“ `#f2e6cf`, Text `#7d5411`, Rand `#b68235`: nur Hinweise
- „✓“ `#e3eee0`, Text `#2c6b2f`, Rand `#9cc09a`: alles in Ordnung

Daneben steht eine Legende für die drei Zustände. Der Button bekommt ein `aria-label` wie „Di: 5 Verstöße, 1 Hinweis“. Der Status wird für **jeden** Tag der aktiven Fassung live berechnet.

**c) Zeitleiste** (Container `min-width:720px`, horizontal scrollbar):
- Grid `160px | 1fr`. Links Name (als Button, öffnet das Profil) und Meta-Zeile (Qualifikation · Ist-h · Soll h/Wo), rechts die Timeline.
- Achse 7:00–16:30 (OPEN=7, CLOSE=16.5), Stundenticks, vertikales Raster alle 10 %
- Personen gruppiert nach Gruppe (Frosch, Libellen, Flamingo). Je Gruppe steht oben ein 7px hoher roter Streifen (`#8a1f14`) für Zeiträume mit Verstoß (keine Fachkraft, Früh-/Spätdienst unter 2 Personen).
- Zeile 38px hoch, Block `top:7px; height:24px; box-sizing:border-box; radius 2px; 10.5px`

**d) Abdeckung:** zwei Zeilen, „Personen gesamt“ und „davon Fachkräfte“, je 20px hoch, eine Zelle pro 15 Minuten, Zahl alle 30 Minuten. Zellen grau `#eae7e7`, bei Unterschreitung `#f3d9d6` mit Text `#6b1710`. Darüber ein Erklärsatz, darunter eine Legende. Es zählen nur Blöcke vom Typ `betreuung`.

**e) Auswahlleiste** (nur bei ausgewähltem Block, `aria-live="polite"`): Label, Bedienhinweis und die Buttons „◂ 15 Min früher“, „15 Min später ▸“, „Ende −15“, „Ende +15“, „Auswahl aufheben“.

**f) Legende der Blocktypen**, **g) Regelprüfung** des Tages als Liste mit Tag „Verstoß“, „Hinweis“ oder „OK“, **h) Pausenstaffel** (Info-Tabelle, per Prop `showPausenstaffel` ausblendbar), **i) Wochenübersicht** (Tabelle Person × Mo–Fr mit Zeitspanne, Ist-h, Soll-h), **j) Fußnote** mit fachlichen Annahmen.

### 3. Personal
Liste pro Gruppe: Karte je Person mit Name, Qualifikation, Soll-Stunden und dem Badge „Fachkraft“ oder „Nicht-Fachkraft“. Ein Klick öffnet das Profil.

### 4. Profil-Panel (Drawer rechts)
`position:fixed`, 400px breit (max. 92vw), Overlay `rgba(32,31,29,.35)`. Felder:
- „Zählt als Fachkraft“ (Checkbox)
- Qualifikation (Text), Gruppe (Select), Soll h/Wo (Zahl)
- Arbeitstage (5 Checkboxen)
- Normalarbeitszeiten: Liste von Blöcken, je Block Start/Ende (Schritt 0.25 h), Typ, **Verbindlichkeit hart/weich** und „Entfernen“; „+ Block“
- Dienstag-Sonderfall: optional eigene Blockliste (+ Sonderregel / entfernen)
- Praxisanleitung: „wird angeleitet von“ (Select) und „leitet an“ (abgeleitet, nur lesbar)
- Bemerkungen (Textarea)

Jede Änderung wirkt sofort auf Zeitleiste, Abdeckung, Regeln und Wochenübersicht.

---

## Blocktypen (visuell eindeutig, nicht nur über Farbe)
| Typ | Darstellung |
|---|---|
| betreuung | Fläche `#f2e6cf`, Rand 1px `#b68235`, Text 600 |
| verfuegung | Punktraster: `radial-gradient(#c9a463 1.3px, transparent 1.6px)` 8×8px auf `#f8f4f4` |
| besprechung | Diagonalstreifen 45°: `#d9bd85 0 2px, transparent 2px 9px` |
| anleitung | Kreuzschraffur ±45°: `#d9bd85 0 1.5px, transparent 1.5px 9px` |
| pause | `#f8f4f4`, Rand 2px dotted `#d7d3d3`, Text `#605d5d` |

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

Faustregel: etwa 6px pro Zeichen.

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
- Tinte `#201f1d` · Sekundärtext `#605d5d` · Label/Tertiär `#6b6767` (AA auf Hintergrund)
- Hintergrund `#f8f4f4` · Fläche hell `#f3f2f2` · Weiß `#fff`
- Linien `#eae7e7` (fein), `#d7d3d3` (stark)
- Akzent/Gold `#b68235` · Betreuung `#f2e6cf` · Muster `#c9a463`, `#d9bd85`
- Link/Hinweis `#7d5411` · Verstoß `#8a1f14` · Verstoß hell `#f3d9d6`, Text dunkel `#6b1710`
- OK `#2c6b2f` · OK hell `#e3eee0`, Rand `#9cc09a`

**Typografie**
- Headlines: Cormorant Garamond (600, italic)
- Text: Lora 400/500/600, Basis 13px/1.5
- Größen: 21 (H1) · 19 (H2 Plan) · 13 · 12.5 · 12 · 11.5 · 11 · 10.5 · 10 (Minimum)
- Section-Labels: 11px, uppercase, letter-spacing .05–.06em

**Radius** 2–3px (Pills 9px). **Schatten:** Drag `0 3px 8px rgba(45,43,43,.28)`, Drawer `-8px 0 24px rgba(32,31,29,.18)`.
**Abstände:** Leisten `10px 20px`, Sektionen `14px 20px`, Gaps 6 / 10 / 14px.

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
- `Rahmenplan-Editor.dc.html`: vollständiger Prototyp (Template + Logik in einer Datei)
- `support.js`: Runtime, damit der Prototyp lokal im Browser läuft (nicht übernehmen)

## Assets
Keine Bilder oder Icons. Fonts über Google Fonts (Cormorant Garamond, Lora). Alle Muster sind reine CSS-Gradients.
