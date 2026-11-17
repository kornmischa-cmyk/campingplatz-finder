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
- Offen: Rückgängig machen (Undo).

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
