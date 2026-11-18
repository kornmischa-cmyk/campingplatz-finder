# Entscheidungen und offene Punkte

Stand: 23.09.2026. Grundlage: Design-Handoff in `design-handoff/`.

## Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| Ort | Übergangsweise Unterordner `rahmenplan-editor/` im Repo `campingplatz-finder`, technisch vollständig getrennt |
| Nutzung | Nur die Kita-Leitung, Desktop/Laptop (Windows + Edge/Chrome), kein Login |
| Auslieferung | Eine einzelne HTML-Datei, läuft offline per Doppelklick (kein Internet vor Ort) |
| Stack | Vite + React + TypeScript + Vitest (kein zweites Next.js, da kein Server nötig) |
| Daten | **Plandatei in einem gewählten Ordner** (File System Access API, Edge/Chrome), automatisch gespeichert, Tageskopien in `Sicherungen` (30 Tage). Rückfall für andere Browser: localStorage + JSON-Export |
| Mehrere Personen | Sie arbeiten nacheinander oder parallel mit derselben Datei. Änderungen anderer werden automatisch geladen (Prüfung alle 4 s und beim Fensterwechsel). Bei gleichzeitigen Änderungen gibt es einen Konflikt-Dialog, nie stilles Überschreiben. |
| Teilen im Team | Druck/PDF und CSV, **nur für den geltenden Plan** (Testfassungen ggf. später) |
| Fassungen | Geltender Plan + 1 Testfassung; „Übernehmen“ ersetzt den geltenden Plan (keine Historie) |
| Profil vs. Plan | **Getrennt.** Das Profil hält Stammdaten und Normalarbeitszeiten (Vorlage). Der Plan ist eine eigene Blockliste pro Fassung. Profiländerungen wirken nicht still auf den Plan, sondern erzeugen den Hinweis „weicht von der Normalarbeitszeit ab“; in der Testfassung per „Normalzeit übernehmen“ anwendbar. |
| hart/weich | Harte Blöcke sind gesperrt. In der Testfassung pro Block bewusst entsperrbar (mit Rückfrage). Eine Abweichung von der harten Zeit bleibt als Hinweis sichtbar. Bei Übernahme verfallen Entsperrungen. |
| Regeln | Schwellenwerte konfigurierbar (Einstellungen), Startwerte aus dem Prototyp |
| Datenmodell | Stabile Block-IDs statt Index. Rahmenplan als Vorlage, aus der später eine datierte „konkrete Woche“ abgeleitet werden kann |

## Schließzeiten, Feiertage, Druck/CSV der Woche (18.11.2026)

- **Schließzeiten** in den Einstellungen (Bezeichnung, von–bis mit Datum), z. B. Sommer- oder Weihnachtsschließung, Brückentage.
- **Gesetzliche Feiertage Hessen** automatisch (Neujahr, Karfreitag, Ostermontag, 1. Mai, Himmelfahrt, Pfingstmontag,
  Fronleichnam, 3. Oktober, 25./26.12.; Ostern nach Gauß), abschaltbar; Vorschau der nächsten Feiertage.
  Heiligabend/Silvester sind keine Feiertage → bei Bedarf als Schließzeit.
- An geschlossenen Tagen ist in der Woche niemand eingeplant, keine Regelprüfung; Tageskarte „geschlossen“ mit Grund.
  Der Rahmenplan (Musterwoche) bleibt davon unberührt.
- **Drucken / PDF und CSV im Kopf sind kontextabhängig:** in „Woche“ wird die angezeigte KW gedruckt bzw. exportiert
  (Datum je Tag, Abwesenheiten, geschlossene Tage, Wochenübersicht), sonst der geltende Rahmenplan. PDF über den Druckdialog
  („Als PDF speichern“). Notizen zu Abwesenheiten werden nicht exportiert (Datensparsamkeit).
- Vertretung: vorerst nicht als eigene Funktion – fehlende Besetzung zeigt die Woche, umgeplant wird im Rahmenplan.

## Abwesenheiten und Wochenansicht (18.11.2026)

- Neue Ansicht **„Woche“**: Kalenderwoche wählen (‹ KW 47 ›, „Zur aktuellen Woche“). Grundlage ist der **geltende** Rahmenplan;
  Abwesenheiten werden für die konkreten Tage herausgerechnet. Der Rahmenplan selbst bleibt unverändert.
- **Abwesenheit** je Person mit festem Datum von–bis (einschließlich), Art **Urlaub, Krank, Fortbildung, Sonstiges (abwesend)**,
  bei eintägigen Abwesenheiten optional nur zeitweise (z. B. Fortbildung 9–12 Uhr); der Rest des Dienstes bleibt.
- Regeln (Fachkraft, Randzeiten, Pausen …) prüfen die echte Besetzung der Woche; Abweichungen vom Profil werden dort nicht gemeldet.
  Tageskarten zeigen Datum, „heute“ und „n abwesend“; Zeitleiste zeigt Abwesenheiten als gestrichelte, neutrale Fläche;
  Wochenpunkte haben den Zustand „abwesend“. Der Stundenzähler ist in der Woche ausgeblendet (Urlaub ist kein fehlendes Soll).
- **Datenschutz:** Bei „Krank“ gibt es kein Notizfeld (auch beim Import wird eine Notiz verworfen); neutrale Farbe.
  „Vergangene löschen“ entfernt alle Einträge, die vor heute geendet haben. Mit Träger/Leitung klären, wie lange Einträge bleiben dürfen.
- Im Profil: Liste der aktuellen/geplanten Abwesenheiten (nur lesen), Eintragen unter „Woche“.
- Noch offen: Feiertage/Schließtage, Druck/CSV der konkreten Woche, Vertretungsplanung (wer springt ein).

## Abendtermine, Zähler, Auswahllisten (18.11.2026)

- **Termine 6:00–22:00:** wählbar auch außerhalb der Öffnungszeit (Hinweis im Formular). An Tagen mit solchen Terminen
  reicht die Zeitleiste bis zur vollen Stunde nach dem Termin; die Zeit außerhalb der Öffnungszeit ist schraffiert „geschlossen“.
  Besetzung und Regeln gelten weiter nur in der Öffnungszeit; Zeitfenster aufziehen ebenfalls nur dort. Druck nutzt denselben Maßstab je Tag.
- **Wochenzähler zweizeilig:** oben „25:30 / 28:30 h · noch 3:00“, darunter die Punkte. Lange Werte ragten vorher in die Zeitleiste;
  Punkte mit 6 px Abstand, der Ring des aktuellen Tags berührt die Nachbarn nicht mehr. Zeilenhöhe 64 px.
- **Auswahllisten:** eigener Pfeil mit 12 px Abstand zum Rand (vorher klebte der Browser-Pfeil am Rand).

## Linien in der Zeitleiste (17.11.2026)

- Aneinanderstoßende Blöcke hatten bis zu vier senkrechte Linien an einer Stelle (Griff, Rand, Rand, Griff).
  Jetzt: 1 px Fuge zu jedem Nachbarn, Ziehgriffe nur bei Zeigerkontakt, Auswahl, Fokus oder beim Ziehen.
- Sehr kurze Blöcke (< 36 px) zeigen keine Griffe mehr (sie überdeckten sich); verschieben per Ziehen,
  Dauer über „Ende ◂ ▸“ in der Auswahlleiste oder Umschalt+Pfeil.

## Barrierefreiheit (17.11.2026)

Check mit axe-core (WCAG 2.2 AA, 10 Ansichten), Kontrastberechnung, Tastatur-, Zoom- und Textabstandsprüfung.
Vorher: Blockarten nur über zu blasse Muster unterscheidbar (Schraffur 1,66:1, Punkte 2,14:1, Pausenrand 1,48:1 – WCAG 1.4.11),
Kreuzschraffur lief durch die Uhrzeiten. Jetzt:
- **Blockart steht im Text**, wenn Platz ist („Dienstbesprechung 14:15–15:45“, „Bespr. 14:15–15:45“). Reicht der Platz nicht,
  hat die Uhrzeit Vorrang (Wunsch 17.11.); die Art bleibt dann über das Muster (≥ 3:1), Tooltip und Screenreader erkennbar.
  Betreuung bleibt ohne Artnamen (Standard, Gruppenfarbe).
- **Etikett:** Auf Mustern sitzt die Beschriftung auf einem hellen Etikett, das Muster läuft nicht mehr durch die Schrift.
- **Muster und Pausenrand ≥ 3:1** (#a67a35 bzw. #9c8a72).
- ✕ im Profil als 32-px-Icon-Knopf (vorher 11 px breit, WCAG 2.5.8).
- Unterbesetzung und Besetzungssäulen mit Text für Screenreader; Fokus springt ins Problem-Popover, Esc gibt ihn zurück.
- Block-Ansage kurz („Carla, Betreuung, 08:00 bis 09:00“), Tastaturhilfe einmal per `aria-describedby`.
- Sprunglink „Zum Plan springen“, `<main>` auf Start- und App-Seite, Überschriften lückenlos (h1 → h2 → h3).
- Ergebnis: axe-core 0 Verstöße in allen 10 Ansichten. Bestanden: Fokusrahmen, Textabstand 1.4.12, 200 % Zoom.
- Nicht automatisch prüfbar und bewusst offen: echte Screenreader-Tests (NVDA mit Edge), Drag & Drop hat Tastatur-Ersatz
  (Pfeiltasten, „+ Zeitfenster danach“), aber „Zeitfenster aufziehen“ mitten in einer Zeile nur per Maus.

## Impeccable-Überarbeitung (17.11.2026)

Kritik 26/40 (Bericht in `.impeccable/critique/`). Umgesetzt: alle P1 und P2, Abstände/Tokens dort, wo angefasst.
- **Zeitleiste nach oben:** Der große Status-Block ist weg. Der Status steht als klickbare Pille oben in der Planungskarte
  („3 Probleme · 1 Hinweis · Liste ↓“, springt zur Befundliste). Termine sind eine einzeilige Leiste in der Karte
  („Bearbeiten“ klappt die Liste auf). Tageskarten flacher, Kopf kompakter (Kita-Name in der Unterzeile statt Label über dem Titel).
  Erste Person bei 1440×900 jetzt ca. 500 px statt 810 px (mit Demo-Hinweis 570 px).
- **Probleme ↔ Plan verbunden:** Jeder Befund hat „Im Plan zeigen“ (scrollt zur Person bzw. zur Zeit und hebt sie kurz hervor).
  Unterbesetzung erscheint einmal als Streifen an der Zeitachse plus zarte rote Fläche über alle Zeilen – nicht mehr pro Gruppe.
- **Übernehmen abgesichert:** Vergleich bisher/Testfassung als Tabelle, Liste der geänderten Personen und Tage,
  Knopf „Vorher Sicherung herunterladen“, bei Problemen roter Knopf „Trotz N Problemen übernehmen“ (bleibt möglich),
  danach Meldung mit Hinweis auf Rückgängig (Übernehmen ist per Strg+Z umkehrbar).
- **Wochenzähler:** Stunden:Minuten („31:15 / 32 h · noch 0:45“, „+1:30“, „✓“), auch in der Wochenübersicht.
  Punkte 10 px mit kräftigeren Farben, Legende an der Zeitachse, Namensspalte 252 px.
- **Auswahlleiste:** Art · Pause einfügen · + Zeitfenster danach · Verschieben ◂▸ · Ende ◂▸ · Entfernen (abgesetzt) · Fertig;
  Hilfe einzeilig. Im geltenden Plan nur Hinweis + „Zur Testfassung“. „Verwerfen“/„Übernehmen“ nur in der Testfassung.
- **Einheitliche Begriffe:** „Problem“ (statt Verstoß/Problem gemischt), „Pause einfügen“, „Entfernen“.
- **Kontrast und Bedienflächen:** `--text-3` #766a5c, neue `--border-ctl` #9c8a72 für Knöpfe/Eingabefelder,
  Avatar-Kürzel in dunklerem Gruppenton (≥ 4,5:1), Checkboxen 18 px, Knopfhöhen 32/36 px, Ziehgriffe mit größerer Trefferfläche,
  Pfeile in den Einstellungen als 32-px-Icon-Knöpfe. Eigene Strich-Icons statt Unicode-Pfeilen.
- **Rhythmus:** Abschnitte 16/24/32 px, Karten 20/24 Innenabstand, Zeilenhöhe 56 px, Tabellen 12 px.
- Behoben: falscher waagerechter Scrollbalken in der Zeitleiste; kollidierende Uhrzeiten „16:00 16:30“ bei schmalen Fenstern.
- Bewusst nicht gemacht: Personalansicht breiter, Profil-Feinschliff („pro Woche“-Umbruch), Startseite umbauen (P3).

## Freie Bearbeitung in der Zeitleiste, leise Abweichungen (16.11.2026)

- **Zeitfenster aufziehen:** In der Testfassung auf eine freie Stelle einer Zeile ziehen → neuer Block (Betreuung, weich),
  begrenzt auf die Lücke zwischen den Nachbarn. Ein Klick ohne Ziehen legt nichts an (verhindert Versehen).
  Freie Tage zeigen zusätzlich „+ Zeitfenster“ (4 h ab Dienstbeginn laut Profil); per Tastatur „+ Zeitfenster danach“ in der Auswahlleiste.
- **Pause einziehen:** Auswahlleiste → „Pause einziehen“ teilt den gewählten Betreuungs-/Verfügungsblock mittig.
  Länge: gesetzlich fehlende Pause, sonst Pausenwunsch aus dem Profil, sonst 30 Minuten. Danach lässt sich die Pause
  entlang der Zeitleiste ziehen; die Nachbarblöcke wandern mit (Arbeitszeit bleibt gleich).
- **Art ändern:** Betreuung / Verfügungszeit / Pause. Besprechung und Anleitung kommen bewusst nur über Termine.
- **Löschen** (Knopf oder `Entf`): Eine entfernte Pause zwischen zwei gleichartigen Blöcken wird wieder durchgehende
  Arbeitszeit; andere Blöcke hinterlassen eine Lücke. Gesperrte harte Zeiten und Termin-Blöcke sind nicht löschbar.
- **„Plan weicht von der Normalarbeitszeit ab“ ist jetzt ein leiser Hinweis:** zählt nicht in Tageskarte/Status,
  steht kompakt unter den Befunden („Abweichungen von der Normalarbeitszeit“) und erscheint an der Person als
  neutrales „≠“ statt gelbem „!“. Bleibt ein normaler Hinweis, wenn die Person an einem Arbeitstag gar nicht eingeplant ist.
- Übernehmen-Dialog: leise Abweichungen und Personen abseits ihres Wochen-Solls stehen dort als dezente Zeile „Zur Kontrolle (kein Problem)“.
- **Wochenzähler an jeder Person (17.11.2026):** Unter dem Namen läuft „verplant / Soll h“ mit Balken und Differenz mit –
  auf jedem Tag, live beim Ziehen. Grau = noch offen, grün ✓ = Soll erreicht, gelb = über Soll. Kein Verstoß, reine Steuerungshilfe.
  Qualifikation und heutige Stunden stehen im Tooltip bzw. für Screenreader.
- **Wochenpunkte Mo–Fr (17.11.2026)** ersetzen den Balken am Zähler (der Balken wiederholte nur die Zahlen):
  gefüllt = eingeplant, gelber Ring = Arbeitstag laut Profil, aber noch nicht eingeplant, blass = frei,
  gefüllt mit gelbem Rand = eingeplant, obwohl laut Profil kein Arbeitstag. Der aktuelle Tag ist umrandet; Klick springt zum Tag.
- **Rückgängig/Wiederholen:** Strg+Z, Strg+Y bzw. Strg+Umschalt+Z und Knöpfe neben dem Speicherstatus. Bis zu 100 Schritte,
  gilt für alle Änderungen (Plan, Personal, Einstellungen, Import). Ziehen und schnelles Tippen am selben Ding (innerhalb 1,2 s)
  ergeben einen Schritt; Löschen, Pause einziehen usw. sind immer eigene Schritte. In Eingabefeldern und im offenen Profil
  bleibt Strg+Z das normale Text-Rückgängig. Wird ein neuer Stand von außen geladen (andere Person), wird der Verlauf geleert.
  Der Verlauf überlebt kein Neuladen der Seite.

## Profiländerungen wirken auf den Plan (15.11.2026)

- Speichern im Profil überträgt Änderungen an Arbeitstagen, Zeiten und Pausen automatisch in die **Testfassung**
  (wird bei Bedarf aus dem geltenden Plan angelegt – nur wenn sich am Plan wirklich etwas ändert).
- Häkchen **„Auch im geltenden Plan korrigieren“** für echte Fehler (z. B. „arbeitet montags nicht“).
- Unveränderte Tage werden still aktualisiert. Von Hand angepasste Tage: Nachfrage „Überschreiben“ oder
  „Angepasste Tage behalten“.
- Neue Personen landen beim Anlegen direkt in der Testfassung.

## Pausen, Termine, Personen-Indikator (14.11.2026)

- **Automatische Pause:** Ergibt sich aus Normalarbeitszeiten und Terminen eine Arbeitszeit, die eine Pause verlangt,
  und fehlt sie, plant die Vorlage die kleinste ausreichende Pause (Pausenstaffel aus den Einstellungen) in die Mitte
  des Dienstes – nur in Betreuung/Verfügungszeit, nie in einen Termin. Beispiel 7:00–16:30: 30 Min (danach 9 h Arbeit).
  Pro Person kann eine längere Pause eingestellt werden. Pausen lassen sich in der Testfassung verschieben;
  bei „Pflichtpause fehlt“ gibt es „Pause einfügen“.
- **Termine im Rahmenplan** ersetzen den „Dienstag-Sonderfall“ im Profil: Bezeichnung, Art, Tag, Uhrzeit,
  Teilnehmende = alle, die an dem Tag arbeiten, oder ausgewählte Personen. Ein Termin ist ein **zusätzlicher Block**;
  überlappende Zeiten werden herausgeschnitten, Dienste werden nicht verlängert. Speichern/Löschen trägt den Termin
  sofort in die Testfassung ein (unveränderte Tage werden neu erzeugt, von Hand geänderte nur um den Termin-Block ergänzt).
  Alte Plandateien werden beim Laden umgewandelt (gleiche Blöcke mehrerer Personen → ein Termin; alle Dienstags-
  Arbeitenden → „alle“).
- Folge der Regel „alle nehmen teil“: Während einer Besprechung für alle betreut niemand – die App meldet das als
  Verstoß. Ob das so gewollt ist (z. B. Besprechung nach Schließung), ist fachlich zu klären.
- **Indikator an der Person:** Abzeichen am Namen (Anzahl Verstöße bzw. „!“), Klick zeigt die Probleme der Person
  für den Tag und die Woche mit Aktionen.

## Früh- und Spätdienst pro Person (14.11.2026)

- Frühdienst/Spätdienst = die Person ist in einer Früh- bzw. Spät-Randzeit (Einstellungen → Randzeiten) in der Betreuung.
  Randzeiten in der ersten Tageshälfte gelten als Früh-, in der zweiten als Spätdienst.
- Pro Person einstellbar: mindestens – höchstens pro Woche („nie“ = darf nicht) und an welchen Wochentagen möglich.
  Die Wochentage sind als „möglich an“ umgesetzt, nicht als „Pflicht an“; Pflicht ergibt sich aus „mindestens“.
- Prüfung: mehr als erlaubt oder an einem nicht vorgesehenen Tag = Verstoß, weniger als mindestens = Hinweis.
- Profiländerungen gelten erst nach „Speichern“ (Entwurf im Profil).

## Design-Update „Warm & freundlich“ (23.09.2026)

Der Handoff wurde durch die finale visuelle Richtung ersetzt (`design-handoff/`). Logik und Interaktion sind unverändert,
umgesetzt wurde die Präsentationsschicht: Bricolage Grotesque + Figtree (eingebettet), Tageskarten, Status-Banner,
Gruppenfarben, Avatare, Säulendiagramm „Besetzung“, dunkle klebende Auswahlleiste, Befundkarten, aufklappbare
Wochenübersicht und Pausenregeln. Beschriftungsregel jetzt ca. 7 px/Zeichen, Pausen ohne Kurzbeschriftung.

Übertragen auf Dinge, die das Design nicht zeigt:
- **Gruppenfarben**: Der Prototyp vergibt drei Farben fest nach Position. Da Gruppen konfigurierbar sind, rotieren sechs Farben
  (die drei aus dem Design + drei ergänzte im selben Stil).
- **Sprache**: Sichtbar „Probleme“/„Hinweise“ wie im Design; für Screenreader bleibt „Verstoß“/„Hinweis“ erhalten.
- Einstellungen, Teilen/Sicherung, Testfassung anlegen/verwerfen, Entsperren und „Normalzeit übernehmen“ nutzen die Formensprache
  des Designs (Segment-Schalter, Pills, Karten).

## Abweichungen vom Prototyp (bewusst)

- Neben „Rahmenplan“ und „Personal“ gibt es die Ansicht **Einstellungen**, dort liegen Regeln, Gruppen und Daten.
- „+ Neue Testfassung“ ist funktionsfähig und erscheint, solange es keine Testfassung gibt. Dazu kommt „Testfassung verwerfen“.
- Zeiten im Profil werden als Uhrzeit-Auswahl (07:15) statt als Dezimalzahl (7.25) eingegeben.
- Personen lassen sich anlegen und entfernen.
- Der Untertitel rechnet die Wochenstunden aus den Profilen (385 h). Im Prototyp stand fest „307“.
- Im Profil-Drawer umgesetzt: Fokus beim Öffnen, Fokus-Falle, Esc, Fokus-Rückgabe, echte `<label>`.
- „Am Stück“-Regel: Eine **Lücke** zwischen zwei Arbeitsblöcken zählt als Unterbrechung. Im Prototyp zählte sie mit, dort gab es aber auch keine Lücken. Die Lücke zählt **nicht** als Pflichtpause.

## Offene fachliche Fragen

1. Mindestpersonal nach **HessKiföG** (Berechnung aus Kinderzahl/Alter/Betreuungszeit) ist nicht umgesetzt. Die Formel muss von der Kita oder dem Träger kommen.
2. Zählen **PiVA-Auszubildende** als Fachkraft? Derzeit pro Person im Profil einstellbar, in den Beispieldaten: nein.
3. **Unter-18-Regeln** (§11 JArbSchG) werden noch nicht geprüft, sie stehen nur in der Info-Tabelle.
4. Ist eine **Lücke** im Arbeitstag (unbezahlte Unterbrechung) fachlich gewollt, und zählt sie als Ruhepause?
5. Braucht es eine **Historie** geltender Pläne oder eine Vergleichsansicht von Fassungen?

## Bekannte Grenzen / nächste Schritte

- Im Plan lassen sich Blöcke nur verschieben und in der Länge ändern, nicht anlegen, löschen oder im Typ ändern. Grundlegende Änderungen laufen über das Profil und „Normalzeit übernehmen“.
- Kein Rückgängig (Strg+Z) in der Testfassung.
- Die Zeitleiste bietet für Screenreader noch keine alternative Tabellen- oder Listenansicht.
- Der Ordner-Dialog und das Wiederöffnen eines gemerkten Ordners ließen sich im Container nicht automatisiert testen
  (nativer Dialog; Chromium stürzt im Test beim Wiedereinlesen *browserinterner* Testordner aus IndexedDB ab).
  Getestet sind Anlegen, Speichern, Tageskopien, Übernahme fremder Änderungen und Konflikte mit zwei Fenstern.
  Der erste echte Test auf Windows mit Edge/Chrome steht noch aus.
- Keine Sperre gegen gleichzeitiges Bearbeiten, nur Konflikterkennung. Bei der Prüfung alle 4 s ist ein Konflikt
  selten, aber möglich.
