import type { AppData, Person } from '../domain/types';
import { groupColor, groupedPersons, initials } from '../domain/groups';
import { useState } from 'react';
import type { Action } from '../state/store';
import { DIENST_LABEL, hatVorgabe, vorgabenOf, vorgabeText } from '../domain/dienste';
import { uid } from '../domain/time';

interface Props {
  data: AppData;
  dispatch: (a: Action) => void;
  onOpenProfile: (personId: string, opener: HTMLElement) => void;
  /** Neue Person im Profil öffnen – angelegt wird sie erst beim Speichern */
  onNewPerson: (person: Person, opener: HTMLElement) => void;
}

export function PersonalView({ data, dispatch, onOpenProfile, onNewPerson }: Props) {
  const [gName, setGName] = useState('');
  const [gKinder, setGKinder] = useState('');
  const addGroup = () => {
    const name = gName.trim();
    if (!name) return;
    dispatch({ type: 'setGroups', groups: [...data.groups, { id: uid('g'), name, kinder: Math.max(0, parseInt(gKinder, 10) || 0), alter: '' }] });
    setGName('');
    setGKinder('');
  };
  const add = (groupId: string, opener: HTMLElement) => {
    const id = uid('p');
    const person: Person = {
      id,
      name: '',
      qual: '',
      fk: false,
      groupId,
      soll: 20,
      workdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr'],
      normBlocks: [{ id: uid('n'), start: 8, end: 12, type: 'betreuung', verb: 'weich' }],
      mentorId: '',
      notiz: '',
    };
    onNewPerson(person, opener);
  };

  return (
    <div className="personal">
      <p className="hint" style={{ marginTop: 0 }}>
        Neue Personen und geänderte Zeiten übernimmt die App beim Speichern automatisch in die Testfassung. In den geltenden Plan kommen sie
        mit „Als geltend übernehmen“ – oder sofort, wenn du beim Speichern „Auch im geltenden Plan korrigieren“ wählst.
      </p>
      {groupedPersons(data).map(({ group, members }) => {
        const gc = groupColor(data.groups, group.id);
        return (
          <div className="personal-group" key={group.id}>
            <div className="personal-group-title">
              <span className="group-dot" style={{ background: gc.c }} />
              <h2>{group.name}</h2>
              <span className="muted">{[group.kinder ? `${group.kinder} Kinder` : '', group.alter].filter(Boolean).join(', ')}</span>
              <span className="spacer" />
              {group.id !== '__ohne' && (
                <button className="pill sm" onClick={(e) => add(group.id, e.currentTarget)}>
                  + Person
                </button>
              )}
            </div>
            {members.length === 0 && <div className="hint">Noch niemand in dieser Gruppe.</div>}
            {members.map((p) => (
              <button key={p.id} className="person-card" onClick={(e) => onOpenProfile(p.id, e.currentTarget)}>
                <span className="left">
                  <span className="avatar" aria-hidden="true" style={{ background: gc.s, color: gc.t }}>{initials(p.name)}</span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.qual || 'ohne Qualifikationsangabe'} · Soll {p.soll} h/Wo · {p.workdays.join(', ') || 'keine Arbeitstage'}
                    </small>
                    {(['frueh', 'spaet'] as const).some((a) => hatVorgabe(vorgabenOf(p)[a])) && (
                      <small>
                        {(['frueh', 'spaet'] as const)
                          .filter((a) => hatVorgabe(vorgabenOf(p)[a]))
                          .map((a) => `${DIENST_LABEL[a]} ${vorgabeText(vorgabenOf(p)[a])}`)
                          .join(' · ')}
                      </small>
                    )}
                  </span>
                </span>
                <span className={`fk-badge ${p.fk ? 'yes' : 'no'}`}>{p.fk ? 'Fachkraft' : 'Nicht-Fachkraft'}</span>
              </button>
            ))}
          </div>
        );
      })}
      <form
        className="add-group"
        onSubmit={(e) => {
          e.preventDefault();
          addGroup();
        }}
      >
        <h2>Neue Gruppe</h2>
        <input className="input" aria-label="Name der neuen Gruppe" placeholder="Name, z. B. Bären" value={gName} onChange={(e) => setGName(e.target.value)} />
        <input className="input num" style={{ flex: "0 0 90px", width: 90 }} aria-label="Anzahl Kinder" placeholder="Kinder" inputMode="numeric" value={gKinder} onChange={(e) => setGKinder(e.target.value.replace(/\D/g, ''))} />
        <button type="submit" className="pill" disabled={!gName.trim()}>
          Gruppe hinzufügen
        </button>
      </form>
    </div>
  );
}
