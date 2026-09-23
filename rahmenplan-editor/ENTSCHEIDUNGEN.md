# Entscheidungen und offene Punkte

Stand: 23.09.2026. Grundlage: Design-Handoff in `design-handoff/`.

## Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| Ort | Übergangsweise Unterordner `rahmenplan-editor/` im Repo `campingplatz-finder`, technisch vollständig getrennt |
| Nutzung | Nur die Kita-Leitung, Desktop/Laptop (Windows + Edge/Chrome), kein Login |
| Auslieferung | Eine einzelne HTML-Datei, läuft offline per Doppelklick (kein Internet vor Ort) |
| Stack | Vite + React + TypeScript + Vitest (kein zweites Next.js, da kein Server nötig) |
| Daten | localStorage + JSON-Sicherung (Export/Import), Erinnerung nach 7 Tagen |
| Teilen im Team | Druck/PDF und CSV, **nur für den geltenden Plan** (Testfassungen ggf. später) |
| Fassungen | Geltender Plan + 1 Testfassung; „Übernehmen“ ersetzt den geltenden Plan (keine Historie) |
| Profil vs. Plan | **Getrennt.** Das Profil hält Stammdaten und Normalarbeitszeiten (Vorlage). Der Plan ist eine eigene Blockliste pro Fassung. Profiländerungen wirken nicht still auf den Plan, sondern erzeugen den Hinweis „weicht von der Normalarbeitszeit ab“; in der Testfassung per „Normalzeit übernehmen“ anwendbar. |
| hart/weich | Harte Blöcke sind gesperrt. In der Testfassung pro Block bewusst entsperrbar (mit Rückfrage). Eine Abweichung von der harten Zeit bleibt als Hinweis sichtbar. Bei Übernahme verfallen Entsperrungen. |
| Regeln | Schwellenwerte konfigurierbar (Einstellungen), Startwerte aus dem Prototyp |
| Datenmodell | Stabile Block-IDs statt Index. Rahmenplan als Vorlage, aus der später eine datierte „konkrete Woche“ abgeleitet werden kann |

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
- Die Speicherung unter `file://` hängt am Browser. Ist das zu fragil, wäre der nächste Schritt eine Desktop-App (z. B. Tauri) mit Datei-Speicherung. Die Datenschicht (`src/domain/storage.ts`) ist dafür gekapselt.
