import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { AppData, Block, Day, Group, Person, Settings } from '../domain/types';
import { DAYS } from '../domain/types';
import { adoptTest, applyProfileToPlan, blocksOf, clonePlan, insertTermin, profileChanges, sameDay, templateFor, withDayBlocks } from '../domain/plan';
import { withAutoPause } from '../domain/pause';
import type { Termin } from '../domain/types';
import { parseBackup, toBackup } from '../domain/storage';
import type { Backend } from '../lib/fileStore';
import { uid } from '../domain/time';

export type Action =
  | { type: 'replaceAll'; data: AppData }
  | { type: 'setSettings'; patch: Partial<Settings> }
  | { type: 'setGroups'; groups: Group[] }
  | { type: 'updatePerson'; id: string; patch: Partial<Person> }
  | { type: 'addPerson'; person: Person }
  | { type: 'removePerson'; id: string }
  | { type: 'setTestDay'; personId: string; day: Day; blocks: Block[] }
  | { type: 'resetDayFromProfile'; personId: string; day: Day }
  | { type: 'setUnlocked'; personId: string; day: Day; blockId: string; unlocked: boolean }
  | { type: 'fillMissingFromProfiles' }
  | { type: 'saveProfile'; person: Person; alsoGeltend: boolean; overwriteManual: boolean }
  | { type: 'insertPause'; personId: string; day: Day }
  | { type: 'saveTermin'; termin: Termin }
  | { type: 'deleteTermin'; id: string }
  | { type: 'createTest' }
  | { type: 'discardTest' }
  | { type: 'adoptTest' }
  | { type: 'markBackup' };

const now = () => new Date().toISOString();

export function reducer(state: AppData, a: Action): AppData {
  switch (a.type) {
    case 'replaceAll':
      return a.data;
    case 'setSettings':
      return { ...state, settings: { ...state.settings, ...a.patch } };
    case 'setGroups':
      return { ...state, groups: a.groups };
    case 'updatePerson':
      return { ...state, persons: state.persons.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) };
    case 'addPerson':
      return { ...state, persons: [...state.persons, a.person] };
    case 'removePerson': {
      const strip = (plan: AppData['plans']['geltend']) => {
        const blocks = { ...plan.blocks };
        delete blocks[a.id];
        return { ...plan, blocks };
      };
      return {
        ...state,
        persons: state.persons.filter((p) => p.id !== a.id).map((p) => (p.mentorId === a.id ? { ...p, mentorId: '' } : p)),
        plans: { geltend: strip(state.plans.geltend), test: state.plans.test && strip(state.plans.test) },
      };
    }
    case 'setTestDay':
      if (!state.plans.test) return state;
      return { ...state, plans: { ...state.plans, test: withDayBlocks(state.plans.test, a.personId, a.day, a.blocks) } };
    case 'resetDayFromProfile': {
      const person = state.persons.find((p) => p.id === a.personId);
      if (!state.plans.test || !person) return state;
      const fresh = templateFor(person, a.day, state).map((b) => ({ ...b, id: uid('b') }));
      return { ...state, plans: { ...state.plans, test: withDayBlocks(state.plans.test, a.personId, a.day, fresh) } };
    }
    case 'setUnlocked': {
      const test = state.plans.test;
      if (!test) return state;
      const bl = blocksOf(test, a.personId, a.day).map((b) =>
        b.id === a.blockId ? { ...b, unlocked: a.unlocked || undefined } : b,
      );
      return { ...state, plans: { ...state.plans, test: withDayBlocks(test, a.personId, a.day, bl) } };
    }
    case 'fillMissingFromProfiles': {
      // Nicht-destruktiv: plant nur Personen/Tage ein, die laut Profil arbeiten, im Plan aber fehlen.
      let test = state.plans.test;
      if (!test) return state;
      for (const p of state.persons) {
        for (const d of DAYS) {
          if (blocksOf(test, p.id, d).length) continue;
          const tpl = templateFor(p, d, state);
          if (tpl.length) test = withDayBlocks(test, p.id, d, tpl.map((b) => ({ ...b, id: uid('b') })));
        }
      }
      return { ...state, plans: { ...state.plans, test } };
    }
    case 'saveProfile': {
      // Profil speichern und in die Testfassung (auf Wunsch auch in den geltenden Plan) übertragen
      const oldP = state.persons.find((p) => p.id === a.person.id) ?? null;
      const persons = oldP ? state.persons.map((p) => (p.id === a.person.id ? a.person : p)) : [...state.persons, a.person];
      const base = state.plans.test ?? state.plans.geltend;
      const touchesTest = profileChanges(oldP, a.person, base, state).changed.length > 0;
      let test = state.plans.test;
      if (touchesTest) {
        test ??= clonePlan(state.plans.geltend, new Date().toISOString());
        test = applyProfileToPlan(test, oldP, a.person, state, a.overwriteManual, () => uid('b'));
      }
      const geltend = a.alsoGeltend ? applyProfileToPlan(state.plans.geltend, oldP, a.person, state, a.overwriteManual, () => uid('b')) : state.plans.geltend;
      return { ...state, persons, plans: { geltend, test } };
    }
    case 'insertPause': {
      const person = state.persons.find((p) => p.id === a.personId);
      if (!state.plans.test || !person) return state;
      const bl = withAutoPause(blocksOf(state.plans.test, a.personId, a.day), state.settings, person.pauseMinuten ?? 0, uid('pause'));
      return { ...state, plans: { ...state.plans, test: withDayBlocks(state.plans.test, a.personId, a.day, bl) } };
    }
    case 'saveTermin':
    case 'deleteTermin': {
      const id = a.type === 'saveTermin' ? a.termin.id : a.id;
      const termine =
        a.type === 'deleteTermin'
          ? state.termine.filter((t) => t.id !== id)
          : state.termine.some((t) => t.id === id)
            ? state.termine.map((t) => (t.id === id ? a.termin : t))
            : [...state.termine, a.termin];
      const next = { ...state, termine };
      // Termin sofort in die Testfassung eintragen (bei Bedarf anlegen; der geltende Plan bleibt geschützt)
      let test = state.plans.test ?? clonePlan(state.plans.geltend, new Date().toISOString());
      for (const p of state.persons) {
        for (const d of DAYS) {
          const cur = blocksOf(test, p.id, d);
          if (!cur.length) continue;
          const before = templateFor(p, d, state);
          const after = templateFor(p, d, next);
          if (sameDay(before, after)) continue;
          let bl: Block[];
          if (sameDay(cur, before)) bl = after.map((b) => ({ ...b, id: uid('b') }));
          else {
            // Tag wurde von Hand geändert: nur den Termin-Block entfernen bzw. neu einsetzen
            bl = cur.filter((b) => !b.id.startsWith(`termin:${id}@`));
            if (a.type === 'saveTermin' && a.termin.day === d && after.some((b) => b.id.startsWith(`termin:${id}@`))) {
              bl = withAutoPause(insertTermin(bl, a.termin, d), state.settings, p.pauseMinuten ?? 0, uid('pause'));
            }
          }
          test = withDayBlocks(test, p.id, d, bl);
        }
      }
      return { ...next, plans: { ...state.plans, test } };
    }
    case 'createTest':
      if (state.plans.test) return state;
      return { ...state, plans: { ...state.plans, test: clonePlan(state.plans.geltend, now()) } };
    case 'discardTest':
      return { ...state, plans: { ...state.plans, test: null } };
    case 'adoptTest':
      if (!state.plans.test) return state;
      return { ...state, plans: { geltend: adoptTest(state.plans.test, now()), test: null } };
    case 'markBackup':
      return { ...state, meta: { ...state.meta, lastBackup: now() } };
  }
}

/** Personen/Tage, die laut Profil arbeiten, in der Fassung aber fehlen. */
export function missingCount(state: AppData, plan: AppData['plans']['geltend']): number {
  let n = 0;
  for (const p of state.persons) for (const d of DAYS) if (!blocksOf(plan, p.id, d).length && templateFor(p, d, state).length) n++;
  return n;
}

export type SaveStatus =
  | { kind: 'saved'; at: Date | null }
  | { kind: 'pending' }
  | { kind: 'error'; message: string; canReconnect: boolean }
  | { kind: 'conflict' };

export interface Store {
  data: AppData;
  dispatch: (a: Action) => void;
  status: SaveStatus;
  /** Meldung, wenn ein neuer Stand von außen geladen wurde */
  notice: string | null;
  clearNotice: () => void;
  /** Konflikt: eigene Fassung speichern (die andere landet in den Sicherungen) */
  keepMine: () => Promise<void>;
  /** Konflikt: andere Fassung laden (die eigene landet in den Sicherungen) */
  takeTheirs: () => Promise<void>;
  /** Nach verlorenem Zugriff erneut verbinden und speichern */
  retry: () => Promise<void>;
}

export const serialize = (d: AppData) => toBackup(d);
const SAVE_DELAY = 500;
const POLL_MS = 4000;

export function useStore(initial: AppData, backend: Backend): Store {
  const [data, dispatchRaw] = useReducer(reducer, initial);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'saved', at: null });
  const [notice, setNotice] = useState<string | null>(null);

  const lastText = useRef(serialize(initial)); // Stand, der in der Quelle liegt
  const dirty = useRef(false);
  const busy = useRef(false);
  const conflict = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const fail = (e: unknown) => {
    const name = (e as { name?: string })?.name;
    setStatus({
      kind: 'error',
      canReconnect: name === 'NotAllowedError' || name === 'SecurityError',
      message:
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Kein Zugriff mehr auf den Datenordner.'
          : name === 'NotFoundError'
            ? 'Der Datenordner wurde nicht gefunden (verschoben oder gelöscht?).'
            : 'Speichern fehlgeschlagen.',
    });
  };

  const doSave = useCallback(
    async (force = false) => {
      if (busy.current) return;
      const text = serialize(dataRef.current);
      if (text === lastText.current && !force) {
        dirty.current = false;
        setStatus((s) => (s.kind === 'pending' ? { kind: 'saved', at: new Date() } : s));
        return;
      }
      busy.current = true;
      try {
        const res = await backend.save(text, { force });
        if (res === 'conflict') {
          conflict.current = true;
          setStatus({ kind: 'conflict' });
        } else {
          lastText.current = text;
          conflict.current = false;
          // während des Speicherns weitere Änderungen? dann bleibt es „pending“
          dirty.current = serialize(dataRef.current) !== text;
          setStatus(dirty.current ? { kind: 'pending' } : { kind: 'saved', at: new Date() });
        }
      } catch (e) {
        fail(e);
      } finally {
        busy.current = false;
      }
    },
    [backend],
  );

  // Automatisch speichern (kurz verzögert)
  useEffect(() => {
    if (serialize(data) === lastText.current) return;
    dirty.current = true;
    if (conflict.current) return; // erst Konflikt auflösen
    setStatus({ kind: 'pending' });
    const t = setTimeout(() => void doSave(), SAVE_DELAY);
    return () => clearTimeout(t);
  }, [data, doSave]);

  // Nach dem Ende eines Speichervorgangs liegengebliebene Änderungen nachziehen
  useEffect(() => {
    if (status.kind !== 'pending' || busy.current) return;
    const t = setTimeout(() => void doSave(), SAVE_DELAY);
    return () => clearTimeout(t);
  }, [status, doSave]);

  const adopt = useCallback((text: string) => {
    const res = parseBackup(text);
    if (typeof res === 'string') return false;
    lastText.current = serialize(res);
    dispatchRaw({ type: 'replaceAll', data: res });
    return true;
  }, []);

  // Änderungen von außen (andere Person / anderes Fenster) erkennen
  useEffect(() => {
    const check = async () => {
      if (busy.current || dirty.current || conflict.current) return;
      try {
        const text = await backend.readIfChanged();
        if (text === null) return;
        if (dirty.current) {
          // genau in diesem Moment lokal geändert → nicht still übernehmen
          conflict.current = true;
          setStatus({ kind: 'conflict' });
          return;
        }
        if (adopt(text)) setNotice('Neuer Stand aus der Plandatei geladen (von einer anderen Person oder einem anderen Fenster gespeichert).');
      } catch {
        /* nächster Versuch beim nächsten Intervall */
      }
    };
    const iv = setInterval(check, POLL_MS);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(iv);
      window.removeEventListener('focus', check);
    };
  }, [backend, adopt]);

  // Schließen mit ungespeicherten Änderungen verhindern
  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty.current || busy.current || conflict.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, []);

  const keepMine = useCallback(async () => {
    try {
      const theirs = await backend.readNow();
      if (theirs !== null && backend.backupCopy) await backend.backupCopy(theirs, 'ueberschrieben');
      conflict.current = false;
      await doSave(true);
    } catch (e) {
      fail(e);
    }
  }, [backend, doSave]);

  const takeTheirs = useCallback(async () => {
    try {
      if (backend.backupCopy) await backend.backupCopy(serialize(dataRef.current), 'verworfen');
      const theirs = await backend.readNow();
      conflict.current = false;
      dirty.current = false;
      if (theirs === null || !adopt(theirs)) {
        await doSave(true);
        return;
      }
      setStatus({ kind: 'saved', at: new Date() });
    } catch (e) {
      fail(e);
    }
  }, [backend, adopt, doSave]);

  const retry = useCallback(async () => {
    if (backend.reconnect && !(await backend.reconnect())) return;
    await doSave();
  }, [backend, doSave]);

  const dispatch = useCallback((a: Action) => dispatchRaw(a), []);
  const clearNotice = useCallback(() => setNotice(null), []);
  return { data, dispatch, status, notice, clearNotice, keepMine, takeTheirs, retry };
}
