import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { AppData, Block, Day, Group, Person, Settings } from '../domain/types';
import { adoptTest, blocksOf, clonePlan, templateFor, withDayBlocks } from '../domain/plan';
import { loadLocal, saveLocal, STORAGE_KEY, parseBackup } from '../domain/storage';
import { seedData } from '../domain/seed';
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
      const fresh = templateFor(person, a.day).map((b) => ({ ...b, id: uid('b') }));
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

export interface Store {
  data: AppData;
  dispatch: (a: Action) => void;
  /** false, wenn der Browser das Speichern verweigert */
  saved: boolean;
}

function init(): AppData {
  return loadLocal() ?? seedData();
}

export function useStore(): Store {
  const [data, dispatchRaw] = useReducer(reducer, undefined, init);
  const [saved, setSaved] = useState(true);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (fromOtherTab.current) {
      fromOtherTab.current = false;
      return;
    }
    setSaved(saveLocal(data));
  }, [data]);

  // Zweiter Tab/Fenster: Änderungen übernehmen, statt sie beim nächsten Speichern zu überschreiben.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const res = parseBackup(e.newValue);
      if (typeof res !== 'string') {
        fromOtherTab.current = true;
        dispatchRaw({ type: 'replaceAll', data: res });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const dispatch = useCallback((a: Action) => dispatchRaw(a), []);
  return { data, dispatch, saved };
}
