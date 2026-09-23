import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';
import { STORAGE_KEY } from './domain/storage';

beforeAll(() => {
  // jsdom kennt ResizeObserver nicht
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('App (Smoke)', () => {
  it('startet mit Beispieldaten in der Testfassung und speichert lokal', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Rahmenplan bearbeiten' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Testfassung' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: /^Di: 3 Verstöße/ })).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"version":1');
  });

  it('Geltender Plan ist schreibgeschützt, Testfassung per Tastatur verschiebbar', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Geltender Plan' }));
    expect(screen.getByRole('button', { name: /^Di: 5 Verstöße/ })).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /^Tina, Betreuung/ })).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Testfassung' }));
    const tina = screen.getByRole('button', { name: /^Tina, Betreuung, 07:00 bis 10:00/ });
    fireEvent.keyDown(tina, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: /^Tina, Betreuung, 07:15 bis 10:15/ })).toBeTruthy();
  });

  it('Profil öffnen und mit Esc schließen', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Carla' })[0]);
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).getByLabelText('Name')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
