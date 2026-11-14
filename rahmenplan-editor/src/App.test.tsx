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
    expect(screen.getByRole('button', { name: /^Di: 3 Verstöße/ })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('button', { name: /^Tina, Betreuung, 07:00 bis 10:00/ }), { key: 'ArrowRight' });
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toContain('"start": 7.25'), { timeout: 2000 });
  });

  it('Geltender Plan ist schreibgeschützt, Testfassung per Tastatur verschiebbar', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Geltender Plan' }));
    expect(screen.getByRole('button', { name: /^Di: 5 Verstöße/ })).toBeTruthy();
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
    fireEvent.click(screen.getByRole('button', { name: 'Testfassung anlegen und einplanen' }));
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
});
