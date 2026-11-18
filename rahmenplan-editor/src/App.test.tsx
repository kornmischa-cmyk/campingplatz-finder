import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { STORAGE_KEY } from './domain/storage';
import { emptyData, seedData } from './domain/seed';
import { BrowserBackend } from './lib/fileStore';

beforeAll(() => {
  // jsdom kennt ResizeObserver nicht
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  // jsdom kennt <dialog>.showModal/close nicht
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const renderApp = (data = seedData()) => render(<App initial={data} backend={new BrowserBackend(STORAGE_KEY)} />);

describe('App (Smoke)', () => {
  it('startet in der Testfassung und speichert Änderungen automatisch', async () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'Rahmenplan', level: 1 })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Testfassung' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /^Di: 3 Probleme/ })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('button', { name: /^Tina, Betreuung, 07:00 bis 10:00/ }), { key: 'ArrowRight' });
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toContain('"start": 7.25'), { timeout: 2000 });
  });

  it('Geltender Plan ist schreibgeschützt, Testfassung per Tastatur verschiebbar', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Geltender Plan' }));
    expect(screen.getByRole('button', { name: /^Di: 5 Probleme/ })).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /^Tina, Betreuung/ })).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Testfassung' }));
    const tina = screen.getByRole('button', { name: /^Tina, Betreuung, 07:00 bis 10:00/ });
    fireEvent.keyDown(tina, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: /^Tina, Betreuung, 07:15 bis 10:15/ })).toBeTruthy();
  });

  it('Profil öffnen und mit Esc schließen', () => {
    renderApp();
    fireEvent.click(screen.getAllByRole('button', { name: 'Carla' })[0]);
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).getByLabelText('Name')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Ersteinrichtung: Person anlegen und in einer Testfassung einplanen', () => {
    renderApp(emptyData());
    expect(screen.getByRole('heading', { name: 'So geht’s los' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Personal' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Person' }));
    const name = within(screen.getByRole('dialog')).getByLabelText('Name') as HTMLInputElement;
    expect(document.activeElement).toBe(name);
    fireEvent.change(name, { target: { value: 'Anna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Person anlegen' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rahmenplan' }));
    // neue Person landet beim Anlegen direkt in der (neu angelegten) Testfassung
    expect(screen.getByRole('button', { name: 'Testfassung' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /^Anna, Betreuung, 08:00 bis 12:00/ })).toBeTruthy();
    expect(screen.queryByText(/noch nicht eingeplant/)).toBeNull();
  });

  it('Profil: Änderungen gelten erst nach „Speichern“', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Personal' }));
    fireEvent.click(screen.getByRole('button', { name: /^Carla/ }));
    const dlg = screen.getByRole('dialog');
    fireEvent.change(within(dlg).getByLabelText('Qualifikation'), { target: { value: 'Kita-Leitung' } });
    // Liste zeigt noch den alten Stand
    expect(screen.getByRole('button', { name: /^Carla\s*Erzieherin ·/ })).toBeTruthy();
    fireEvent.click(within(dlg).getByRole('button', { name: 'Speichern' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /^Carla\s*Kita-Leitung ·/ })).toBeTruthy();
  });

  it('Profil: Abbrechen mit Änderungen fragt nach und verwirft', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Personal' }));
    fireEvent.click(screen.getByRole('button', { name: /^Tina/ }));
    const dlg = screen.getByRole('dialog');
    fireEvent.change(within(dlg).getByLabelText('Qualifikation'), { target: { value: 'XYZ' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Abbrechen' }));
    expect(screen.getByRole('heading', { name: 'Änderungen verwerfen?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }));
    expect(screen.queryByRole('dialog', { name: /Tina/ })).toBeNull();
    expect(screen.queryByText(/XYZ/)).toBeNull();
  });

  it('Neue Person ohne Namen lässt sich nicht anlegen; Abbrechen legt nichts an', () => {
    renderApp(emptyData());
    fireEvent.click(screen.getByRole('button', { name: 'Personal' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Person' }));
    fireEvent.click(screen.getByRole('button', { name: 'Person anlegen' }));
    expect(screen.getByText('Bitte einen Namen eingeben.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }));
    expect(screen.getByText('Noch niemand in dieser Gruppe.')).toBeTruthy();
  });

  it('Gruppe unter „Personal“ hinzufügen; leere Gruppe erscheint im Plan', () => {
    renderApp(emptyData());
    fireEvent.click(screen.getByRole('button', { name: 'Personal' }));
    fireEvent.change(screen.getByLabelText('Name der neuen Gruppe'), { target: { value: 'Füchse' } });
    fireEvent.change(screen.getByLabelText('Anzahl Kinder'), { target: { value: '18' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gruppe hinzufügen' }));
    expect(screen.getByRole('heading', { name: 'Füchse' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '+ Person' })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Rahmenplan' }));
    expect(screen.getByRole('heading', { name: 'Füchse' })).toBeTruthy();
  });

  it('Frühdienst-Vorgabe im Profil wird geprüft', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Personal' }));
    fireEvent.click(screen.getByRole('button', { name: /^Tina/ }));
    const dlg = screen.getByRole('dialog');
    // Tina beginnt Mo–Fr um 7:00 → 5× Frühdienst; höchstens 2× erlaubt
    fireEvent.change(within(dlg).getAllByLabelText('höchstens')[0], { target: { value: '2' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Speichern' }));
    expect(screen.getByText(/^Frühdienst höchstens 2×/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Rahmenplan' }));
    expect(screen.getByText('Tina: 5× Frühdienst (höchstens 2×)')).toBeTruthy();
  });

  it('Abendtermin bis 22 Uhr: wählbar, als Block im Plan, Zeitleiste verlängert', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /^Mo: / }));
    fireEvent.click(screen.getByRole('button', { name: '+ Termin' }));
    fireEvent.change(screen.getByLabelText('Bezeichnung'), { target: { value: 'Elternabend' } });
    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '19' } });
    fireEvent.change(screen.getByLabelText('Ende'), { target: { value: '22' } });
    expect(screen.getByText(/Liegt außerhalb der Öffnungszeit/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Termin speichern' }));
    expect(screen.getByRole('img', { name: /^Selin, Dienstbesprechung, 19:00 bis 22:00/ })).toBeTruthy();
    expect(document.querySelector('.closed-band')).toBeTruthy();
    expect(screen.getAllByText('22:00').length).toBeGreaterThan(0);
  });

  it('Termin für alle anlegen: zusätzlicher Block in der Testfassung', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /^Mo: / }));
    fireEvent.click(screen.getByRole('button', { name: '+ Termin' }));
    fireEvent.change(screen.getByLabelText('Bezeichnung'), { target: { value: 'Teamrunde' } });
    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Ende'), { target: { value: '16' } });
    fireEvent.click(screen.getByRole('button', { name: 'Termin speichern' }));
    expect(screen.getByText('Teamrunde')).toBeTruthy();
    // Selin arbeitet Mo 9–14 → Besprechung kommt als zusätzlicher Block, Betreuung bleibt bis 14:00
    expect(screen.getByRole('img', { name: /^Selin, Dienstbesprechung, 15:00 bis 16:00/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Selin, Betreuung, 12:00 bis 14:00/ })).toBeTruthy();
  });

  it('Abzeichen an der Person zeigt ihre Probleme, „Pause einfügen“ behebt die fehlende Pause', () => {
    const d = emptyData();
    const block = (start: number, end: number) => ({ id: `b${start}`, start, end, type: 'betreuung' as const, verb: 'weich' as const });
    d.persons = [{ id: 'a', name: 'Anna', qual: 'Erzieherin', fk: true, groupId: 'g1', soll: 39, workdays: ['Mo'], normBlocks: [block(7, 16.5)], mentorId: '', notiz: '' }];
    d.plans.test = { since: '', blocks: { a: { Mo: [block(7, 16.5)] } } };
    renderApp(d);
    fireEvent.click(screen.getByRole('button', { name: /^Mo: / }));
    fireEvent.click(screen.getByRole('button', { name: /^Anna: 2 Probleme, 1 Hinweis, weicht von der Normalzeit ab – anzeigen$/ }));
    const pop = screen.getByRole('dialog', { name: 'Probleme bei Anna' });
    expect(within(pop).getByText(/Pflichtpause fehlt/)).toBeTruthy();
    fireEvent.click(within(pop).getAllByRole('button', { name: 'Pause einfügen' })[0]);
    expect(screen.getByRole('button', { name: /^Anna, Pause, 11:30 bis 12:00/ })).toBeTruthy();
    // Pflichtpause und „am Stück“ behoben, Abweichung weg; übrig bleibt der Hinweis „über 8 h“
    expect(screen.getByRole('button', { name: 'Anna: 1 Hinweis – anzeigen' })).toBeTruthy();
  });

  it('Zeile frei bearbeiten: Pause einziehen, Art ändern, Zeitfenster dazu, löschen', () => {
    const d = emptyData();
    const block = (start: number, end: number) => ({ id: `b${start}`, start, end, type: 'betreuung' as const, verb: 'weich' as const });
    d.persons = [{ id: 'a', name: 'Anna', qual: 'Erzieherin', fk: true, groupId: 'g1', soll: 20, workdays: ['Mo'], normBlocks: [block(8, 12)], mentorId: '', notiz: '' }];
    d.plans.test = { since: '', blocks: { a: { Mo: [block(8, 12)] } } };
    renderApp(d);
    fireEvent.click(screen.getByRole('button', { name: /^Mo: / }));
    // Wochenzähler an der Person läuft mit
    expect(screen.getByText(/Woche 4 von 20 h verplant, noch 16:00 Stunden offen/)).toBeTruthy();
    fireEvent.focus(screen.getByRole('button', { name: /^Anna, Betreuung, 08:00 bis 12:00/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Pause einfügen \(/ }));
    expect(screen.getByText(/Woche 3:30 von 20 h verplant/)).toBeTruthy();
    // Pause ist ausgewählt und lässt sich per Tastatur entlang der Zeitleiste schieben
    const pause = screen.getByRole('button', { name: /^Anna, Pause, 09:45 bis 10:15/ });
    fireEvent.keyDown(pause, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: /^Anna, Pause, 10:00 bis 10:30/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Anna, Betreuung, 08:00 bis 10:00/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Anna, Betreuung, 10:30 bis 12:00/ })).toBeTruthy();
    // Abweichung von der Normalzeit ist nur ein leiser Hinweis
    expect(screen.queryByText(/Plan weicht von der Normalarbeitszeit ab/)).toBeNull();
    expect(screen.getByText('Abweichungen von der Normalarbeitszeit')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Anna: weicht von der Normalzeit ab – anzeigen' })).toBeTruthy();
    // Pause entfernen → wieder durchgehend
    fireEvent.keyDown(screen.getByRole('button', { name: /^Anna, Pause/ }), { key: 'Delete' });
    expect(screen.getByRole('button', { name: /^Anna, Betreuung, 08:00 bis 12:00/ })).toBeTruthy();
    // zweites Zeitfenster dazu und auf Verfügungszeit umstellen
    fireEvent.focus(screen.getByRole('button', { name: /^Anna, Betreuung, 08:00 bis 12:00/ }));
    fireEvent.click(screen.getByRole('button', { name: '+ Zeitfenster danach' }));
    expect(screen.getByRole('button', { name: /^Anna, Betreuung, 12:00 bis 14:00/ })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Art des Zeitfensters' }), { target: { value: 'verfuegung' } });
    expect(screen.getByRole('button', { name: /^Anna, Verfügungszeit, 12:00 bis 14:00/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Entfernen' }));
    expect(screen.queryByRole('button', { name: /^Anna, Verfügungszeit/ })).toBeNull();
    expect(screen.queryByText('Abweichungen von der Normalarbeitszeit')).toBeNull();
  });

  it('Strg+Z macht eine Verschiebung rückgängig, Strg+Y stellt sie wieder her', () => {
    renderApp();
    fireEvent.keyDown(screen.getByRole('button', { name: /^Tina, Betreuung, 07:00 bis 10:00/ }), { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: /^Tina, Betreuung, 07:15 bis 10:15/ })).toBeTruthy();
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    expect(screen.getByRole('button', { name: /^Tina, Betreuung, 07:00 bis 10:00/ })).toBeTruthy();
    fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true });
    expect(screen.getByRole('button', { name: /^Tina, Betreuung, 07:15 bis 10:15/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Rückgängig/ }));
    expect(screen.getByRole('button', { name: /^Tina, Betreuung, 07:00 bis 10:00/ })).toBeTruthy();
  });

  it('Wochenpunkte zeigen Tage, die laut Profil noch nicht eingeplant sind', () => {
    const d = emptyData();
    const block = (start: number, end: number) => ({ id: `b${start}`, start, end, type: 'betreuung' as const, verb: 'weich' as const });
    d.persons = [{ id: 'a', name: 'Anna', qual: 'Erzieherin', fk: true, groupId: 'g1', soll: 8, workdays: ['Mo', 'Mi'], normBlocks: [block(8, 12)], mentorId: '', notiz: '' }];
    d.plans.test = { since: '', blocks: { a: { Mo: [block(8, 12)] } } };
    renderApp(d);
    expect(screen.getByText(/noch nicht eingeplant: Mi/)).toBeTruthy();
  });

  it('Übernehmen warnt bei Problemen, zeigt Änderungen und lässt sich rückgängig machen', () => {
    renderApp();
    fireEvent.keyDown(screen.getByRole('button', { name: /^Tina, Betreuung, 07:00 bis 10:00/ }), { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Als geltend übernehmen' }));
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).getByText(/^Tina: /)).toBeTruthy();
    expect(within(dlg).getByRole('button', { name: 'Vorher Sicherung herunterladen' })).toBeTruthy();
    fireEvent.click(within(dlg).getByRole('button', { name: /^Trotz \d+ Problemen übernehmen$/ }));
    expect(screen.getByRole('button', { name: 'Geltender Plan' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Testfassung' })).toBeNull();
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    expect(screen.getByRole('button', { name: 'Testfassung' })).toBeTruthy();
  });

  it('Korrektur „arbeitet montags nicht“: Testfassung und auf Wunsch auch geltender Plan', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Personal' }));
    fireEvent.click(screen.getByRole('button', { name: /^Tina/ }));
    const dlg = screen.getByRole('dialog');
    fireEvent.click(within(within(dlg).getByRole('group', { name: 'Arbeitstage' })).getByLabelText('Mo'));
    fireEvent.click(within(dlg).getByLabelText('Auch im geltenden Plan korrigieren'));
    fireEvent.click(within(dlg).getByRole('button', { name: 'Speichern' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rahmenplan' }));
    fireEvent.click(screen.getByRole('button', { name: /^Mo: / }));
    expect(screen.queryByRole('button', { name: /^Tina, Betreuung/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Geltender Plan' }));
    expect(screen.queryByRole('img', { name: /^Tina, Betreuung/ })).toBeNull();
  });

  it('von Hand angepasster Tag: Nachfrage, „behalten“ lässt ihn stehen', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /^Mo: / }));
    // Tina Mo von Hand verschieben
    fireEvent.keyDown(screen.getByRole('button', { name: /^Tina, Betreuung, 07:00 bis 10:00/ }), { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Personal' }));
    fireEvent.click(screen.getByRole('button', { name: /^Tina/ }));
    const dlg = screen.getByRole('dialog');
    fireEvent.change(within(dlg).getAllByLabelText(/Normalarbeitszeiten, Block 3, Ende/)[0], { target: { value: '14' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'Speichern' }));
    expect(screen.getByRole('heading', { name: 'Angepasste Tage überschreiben?' })).toBeTruthy();
    expect(within(screen.getByRole('heading', { name: 'Angepasste Tage überschreiben?' }).parentElement!).getByText('Mo')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Angepasste Tage behalten' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rahmenplan' }));
    // Mo bleibt von Hand verschoben, Di übernimmt neue Endzeit
    expect(screen.getByRole('button', { name: /^Tina, Betreuung, 07:15 bis 10:15/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Di: / }));
    expect(screen.getByRole('button', { name: /^Tina, Betreuung, 10:30 bis 14:00/ })).toBeTruthy();
  });
});
