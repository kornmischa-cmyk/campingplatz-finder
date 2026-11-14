# Rahmenplan-Editor (Kita-Personalplanung)

Werkzeug für die Kita-Leitung, um den **Rahmenplan** (wiederkehrender Wochen-Standardplan) zu pflegen:
Testfassung anlegen, Zeitblöcke verschieben, Abdeckung und Regelverstöße live sehen, Testfassung als geltend übernehmen.

> Liegt übergangsweise in diesem Repo, ist aber ein **eigenständiges Projekt** (Vite + React + TypeScript)
> ohne Abhängigkeit zum Camping-Finder. Es lässt sich ohne Änderungen in ein eigenes Repo verschieben.

## Nutzung ohne Internet

`npm run build` erzeugt **eine einzige Datei** `dist/index.html` (ca. 700 KB, Schriften eingebettet).
Diese Datei auf den Kita-Rechner kopieren (z. B. als `Rahmenplan-Editor.html`) und per Doppelklick in **Edge oder Chrome** öffnen.
Keine Installation, kein Server, kein Internet nötig.

**Speichern:** Beim ersten Start wählt man einen **Ordner** (z. B. `Dokumente\Rahmenplan`, bei mehreren
Windows-Konten unter „Öffentliche Dokumente“). Die App legt dort `rahmenplan-daten.json` an und speichert jede
Änderung automatisch hinein. Im Unterordner `Sicherungen` liegt eine Kopie pro Tag (die letzten 30 Tage).
Beim nächsten Start reicht „Weiter mit …“ – der Browser fragt dann einmal nach dem Zugriff.

- **Mehrere Personen:** Alle öffnen die HTML-Datei und wählen denselben Ordner. Speichert jemand anderes, lädt
  die App den neuen Stand automatisch. Ändern zwei Personen gleichzeitig, überschreibt die App nichts still,
  sondern fragt: „Andere Fassung laden“ oder „Meine Fassung speichern“. Die jeweils andere Fassung landet in `Sicherungen`.
- **Firefox/Safari** können nicht in Ordner speichern. Dann bleiben die Daten im Browser (mit Warnhinweis);
  regelmäßig unter *Einstellungen → Daten* eine Kopie exportieren.

## Funktionen

- **Rahmenplan**: Zeitleiste je Tag, gruppiert nach Gruppen; Abdeckung je 15 Minuten; Status-Badge je Tag;
  Regelprüfung; Pausenstaffel; Wochenübersicht (Ist/Soll).
- **Fassungen**: Geltender Plan (schreibgeschützt) + eine Testfassung. „Als geltend übernehmen“ ersetzt den geltenden Plan.
- **Bearbeiten** (nur Testfassung, nur Betreuung/Verfügungszeit): Block ziehen, Ränder ziehen, 15-Minuten-Raster,
  Nachbarregeln wie im Design-Handoff. Tastatur: `←/→` verschieben, `Alt+←/→` Beginn, `Umschalt+←/→` Ende, `Esc` Auswahl aufheben.
- **Harte Zeiten** (im Profil „hart“): gesperrt, in der Testfassung bewusst entsperrbar; eine Abweichung bleibt als Hinweis stehen.
- **Personal**: Profile mit Qualifikation, Fachkraft-Status, Gruppe, Soll-Stunden, Arbeitstagen, Normalarbeitszeiten,
  Dienstag-Sonderfall, Praxisanleitung, Bemerkungen. Personen anlegen/entfernen.
- **Einstellungen**: Kita, Öffnungszeit, Gruppen, Regelwerte (Fachkräfte, Randzeiten, Pausenstaffel, …), Daten.
- **Teilen** (nur geltender Plan): Drucken/PDF (A4 quer, ein Tag pro Seite + Wochenübersicht), CSV für Excel.

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Unit-Tests (Regel-Engine, Drag-Logik, Fassungen, Import, CSV) + UI-Smoke-Tests
npm run build      # Typecheck + dist/index.html
```

Aufbau:

- `src/domain/` – reine TypeScript-Logik ohne UI: Datenmodell, Regel-Engine, Drag-/Nachbarlogik, Fassungen, CSV, Speicherung
- `src/state/store.ts` – Reducer, automatisches Speichern, Konflikterkennung
- `src/lib/fileStore.ts` – Speicher-Backends (Ordner/Datei, Browser, Beispiel); `src/Root.tsx` – Startbildschirm
- `src/components/` – Oberfläche
- `design-handoff/` – Original-Handoff (HTML-Prototyp + Beschreibung) als Referenz
- `ENTSCHEIDUNGEN.md` – getroffene Entscheidungen und offene Fragen
