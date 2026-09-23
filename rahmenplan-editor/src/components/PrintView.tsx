import type { AppData } from '../domain/types';
import { DAYS, TYPE_LABEL } from '../domain/types';
import { blocksOf } from '../domain/plan';
import { weekTable } from '../domain/rules';
import { groupedPersons } from '../domain/groups';
import { fmt, fmtDecimal, fmtShort } from '../domain/time';
import { fmtDate } from '../lib/download';

/** Druckansicht des GELTENDEN Plans (nur im Druck sichtbar). */
export function PrintView({ data }: { data: AppData }) {
  const plan = data.plans.geltend;
  const { open, close, kitaName } = data.settings;
  const span = close - open;
  const pct = (h: number) => ((h - open) / span) * 100;
  const ticks: number[] = [];
  for (let h = Math.ceil(open); h <= close; h++) ticks.push(h);
  const groups = groupedPersons(data).filter((g) => g.members.length);

  return (
    <div className="print-only" aria-hidden="true">
      <div className="pr-head">
        <h1>Rahmenplan · {kitaName}</h1>
        <div className="sub">
          Geltender Plan seit {fmtDate(plan.since)} · Öffnung Mo–Fr {fmt(open)}–{fmt(close)} · gedruckt am {fmtDate(new Date().toISOString())}
        </div>
      </div>
      <div className="pr-legend">
        {(['betreuung', 'verfuegung', 'besprechung', 'anleitung', 'pause'] as const).map((t) => (
          <span key={t}>
            <i className={`swatch t-${t}`} />
            {TYPE_LABEL[t]}
          </span>
        ))}
      </div>

      {DAYS.map((d) => (
        <div className="pr-day" key={d}>
          <h2>{d}</h2>
          <div className="pr-row">
            <div />
            <div className="pr-ticks">
              {ticks.map((h) => <span key={h} style={{ left: `${pct(h)}%` }}>{fmtShort(h)}</span>)}
            </div>
          </div>
          {groups.map(({ group, members }) =>
            members.map((p, i) => {
              const bl = blocksOf(plan, p.id, d);
              return (
                <div className="pr-row" key={p.id} style={i === 0 ? { borderTop: '1px solid var(--line-strong)' } : undefined}>
                  <div className="pr-name">
                    {p.name}
                    {i === 0 && <span style={{ fontWeight: 400, color: 'var(--text-3)' }}> · {group.name}</span>}
                  </div>
                  <div className="pr-lane">
                    {bl.map((b) => (
                      <div key={b.id} className={`blk t-${b.type}`} style={{ left: `${pct(b.start)}%`, width: `${((b.end - b.start) / span) * 100}%` }}>
                        <span className="blk-label"><span>{b.end - b.start >= 1 ? `${fmtShort(b.start)}–${fmtShort(b.end)}` : ''}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }),
          )}
        </div>
      ))}

      <div className="pr-week">
        <h2 style={{ font: "600 15px/1.1 'Cormorant Garamond', serif" }}>Wochenübersicht</h2>
        <table className="tbl compact">
          <thead>
            <tr>
              <th>Person</th>
              {DAYS.map((d) => <th key={d}>{d}</th>)}
              <th>Ist</th>
              <th>Soll</th>
            </tr>
          </thead>
          <tbody>
            {weekTable(groups.flatMap((g) => g.members), plan).map((r) => (
              <tr key={r.person.id}>
                <td><strong>{r.person.name}</strong></td>
                {r.cells.map((c, i) => (c ? <td key={i}>{fmt(c.start)}–{fmt(c.end)}</td> : <td key={i} className="off">—</td>))}
                <td className="strong">{fmtDecimal(r.ist, 1)}</td>
                <td>{r.person.soll}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
