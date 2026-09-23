import type { AppData, Person } from '../domain/types';
import { groupColor, groupedPersons, initials } from '../domain/groups';
import { uid } from '../domain/time';
import type { Action } from '../state/store';

interface Props {
  data: AppData;
  dispatch: (a: Action) => void;
  onOpenProfile: (personId: string, opener: HTMLElement) => void;
}

export function PersonalView({ data, dispatch, onOpenProfile }: Props) {
  const add = (groupId: string, opener: HTMLElement) => {
    const id = uid('p');
    const person: Person = {
      id,
      name: 'Neue Person',
      qual: '',
      fk: false,
      groupId,
      soll: 20,
      workdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr'],
      normBlocks: [{ id: uid('n'), start: 8, end: 12, type: 'betreuung', verb: 'weich' }],
      tueBlocks: null,
      mentorId: '',
      notiz: '',
    };
    dispatch({ type: 'addPerson', person });
    onOpenProfile(id, opener);
  };

  return (
    <div className="personal">
      <p className="hint" style={{ marginTop: 0 }}>
        Neue Personen erscheinen zunächst nicht im Plan. Sie tauchen in der Regelprüfung als Abweichung auf und lassen sich in der Testfassung mit
        „Normalzeit übernehmen“ einplanen.
      </p>
      {groupedPersons(data).map(({ group, members }) => {
        const gc = groupColor(data.groups, group.id);
        return (
          <div className="personal-group" key={group.id}>
            <div className="personal-group-title">
              <span className="group-dot" style={{ background: gc.c }} />
              <h3>{group.name}</h3>
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
                  <span className="avatar" aria-hidden="true" style={{ background: gc.s, color: gc.c }}>{initials(p.name)}</span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.qual || 'ohne Qualifikationsangabe'} · Soll {p.soll} h/Wo · {p.workdays.join(', ') || 'keine Arbeitstage'}
                    </small>
                  </span>
                </span>
                <span className={`fk-badge ${p.fk ? 'yes' : 'no'}`}>{p.fk ? 'Fachkraft' : 'Nicht-Fachkraft'}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
