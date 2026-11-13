import type { AppData } from '@/lib/types';
import type { YearResult } from '@/lib/compute';
import { MONTHS, MONTHS_SHORT, fdate, fday, fmt, fshort, plural } from '@/lib/dates';
import { Legend, TYPES } from './ui';

interface StatProps { label: string; color: string; big: string | number; unit: string; total: number; taken: number; plan: number; meta: React.ReactNode }
function Stat({ label, color, big, unit, total, taken, plan, meta }: StatProps) {
  const tk = total > 0 ? Math.min(100, (taken / total) * 100) : 0;
  const pl = total > 0 ? Math.min(100 - tk, (plan / total) * 100) : 0;
  return (
    <div className="card stat">
      <div className="lbl"><i className="dot" style={{ background: color }} />{label}</div>
      <div className="big num">{big}<small>{unit}</small></div>
      {total > 0 && (
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${tk}%`, background: color }} />
          <span className="plan" style={{ width: `${pl}%`, background: color }} />
        </div>
      )}
      <div className="meta">{meta}</div>
    </div>
  );
}

export default function Dashboard({ data, c, year, today }: { data: AppData; c: YearResult; year: number; today: string }) {
  const warns: React.ReactNode[] = [];
  c.conflicts.forEach((x, i) => warns.push(
    <li key={`c${i}`}><b>{TYPES[x.entry.type].short}</b> posé le {fdate(x.date)} sur un jour férié ({x.name}) : ce jour est ignoré dans le décompte.</li>,
  ));
  if (c.caRemaining < 0) warns.push(<li key="ca">Solde de CA dépassé de {plural(-c.caRemaining, 'jour')}.</li>);
  if (c.sickRemaining < 0) warns.push(<li key="sk">Quota de sick leave dépassé de {plural(-c.sickRemaining, 'jour')}.</li>);

  const scale = 25, ticks = [0, 5, 10, 15, 20, 25];
  const T = { wd: 0, worked: 0, CA: 0, SICK: 0, AUTRE: 0, hol: 0 };
  c.months.forEach(m => (Object.keys(T) as (keyof typeof T)[]).forEach(k => { T[k] += m[k]; }));

  const up = data.entries.filter(e => e.end >= today && e.start.startsWith(String(year))).sort((a, b) => (a.start < b.start ? -1 : 1)).slice(0, 4);
  const hl = c.wdHol.filter(h => h.date >= today).slice(0, 4);
  const cell = (v: number, k: string) => <td key={k} className={`r num${v === 0 ? ' zero' : ''}`}>{fmt(v)}</td>;

  return (
    <>
      <div className="stats">
        <Stat label="Solde de CA" color="var(--ca)" big={fmt(c.caRemaining)} unit="j restants" total={c.caTotal} taken={c.taken.CA} plan={c.plan.CA}
          meta={<>{fmt(c.caTotal)} disponibles ({fmt(c.caQuota)} + {fmt(c.report)} de report)<br />{fmt(c.tot.CA)} posés · {fmt(c.taken.CA)} pris, {fmt(c.plan.CA)} à venir</>} />
        <Stat label="Solde de sick leave" color="var(--sick)" big={fmt(c.sickRemaining)} unit="j restants" total={c.sickQuota} taken={c.taken.SICK} plan={c.plan.SICK}
          meta={<>Quota {year} : {fmt(c.sickQuota)} jours<br />{fmt(c.tot.SICK)} posés</>} />
        <Stat label="Fériés restants" color="var(--ferie)" big={c.holLeft} unit={`sur ${c.wdHol.length}`} total={c.wdHol.length} taken={c.wdHol.length - c.holLeft} plan={0}
          meta={<>{c.wdHol.length - c.holLeft} passés{c.weHol > 0 && <><br />{c.weHol} tombé{c.weHol > 1 ? 's' : ''} un week-end (non compté{c.weHol > 1 ? 's' : ''})</>}</>} />
        <Stat label="Absences « Autre »" color="var(--autre)" big={fmt(c.tot.AUTRE)} unit="j posés" total={0} taken={0} plan={0} meta="Hors quota : affichées pour mémoire" />
      </div>

      {warns.length > 0 && <div className="alert" role="alert"><b>À vérifier</b><ul>{warns}</ul></div>}

      <div className="cols">
        <div className="stackv">
          <div className="card">
            <h2>Répartition par mois</h2>
            <p className="sub">Jours ouvrés (lundi–vendredi) travaillés et non travaillés.</p>
            <Legend items={[['sw-worked', 'Travaillés'], ['sw-ca', 'CA'], ['sw-sick', 'Sick leave'], ['sw-autre', 'Autre'], ['sw-ferie', 'Fériés']]} />
            <div className="chart">
              <div className="yaxis">{ticks.map(t => <span key={t} className="num" style={{ bottom: `${(t / scale) * 100}%` }}>{t}</span>)}</div>
              <div className="plot">
                {ticks.slice(1).map(t => <div key={t} className="grid" style={{ bottom: `${(t / scale) * 100}%` }} />)}
                {c.months.map((m, i) => {
                  const seg: [string, number, string][] = [['var(--worked)', m.worked, 'travaillés'], ['var(--ca)', m.CA, 'CA'], ['var(--sick)', m.SICK, 'sick leave'], ['var(--autre)', m.AUTRE, 'autre'], ['var(--ferie)', m.hol, 'fériés']];
                  return (
                    <div className="col" key={i} title={`${MONTHS[i]} : ${seg.map(s => `${fmt(s[1])} ${s[2]}`).join(' · ')}`}>
                      <div className="stack" style={{ height: `${(m.wd / scale) * 100}%` }}>
                        {seg.map((s, j) => s[1] > 0 ? <i key={j} style={{ height: `${(s[1] / m.wd) * 100}%`, background: s[0] }} /> : null)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="xlabels">{MONTHS_SHORT.map(m => <span key={m}>{m}</span>)}</div>
            </div>
          </div>

          <div className="card">
            <h2>Détail par mois</h2>
            <p className="sub">Les demi-journées comptent pour 0,5.</p>
            <div className="tablewrap">
              <table>
                <thead><tr><th>Mois</th><th className="r">Jours ouvrés</th><th className="r">Travaillés</th><th className="r">CA</th><th className="r">Sick leave</th><th className="r">Autre</th><th className="r">Fériés</th></tr></thead>
                <tbody>
                  {c.months.map((m, i) => (
                    <tr key={i}><td>{MONTHS[i]}</td>{cell(m.wd, 'wd')}{cell(m.worked, 'w')}{cell(m.CA, 'ca')}{cell(m.SICK, 's')}{cell(m.AUTRE, 'a')}{cell(m.hol, 'h')}</tr>
                  ))}
                </tbody>
                <tfoot><tr><td>Année {year}</td>{(['wd', 'worked', 'CA', 'SICK', 'AUTRE', 'hol'] as const).map(k => <td key={k} className="r num">{fmt(T[k])}</td>)}</tr></tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="stackv">
          <div className="card">
            <h2>Prochaines absences</h2>
            <p className="sub">À partir du {fdate(today)}</p>
            {up.length ? (
              <div className="list">
                {up.map(e => (
                  <div className="it" key={e.id}>
                    <span className="ico" style={{ background: TYPES[e.type].color }} />
                    <div>
                      <div className="t">{TYPES[e.type].short} · {fmt(c.per[e.id]?.counted ?? 0)} j</div>
                      <div className="s">{e.start === e.end ? fshort(e.start) : `${fshort(e.start)} → ${fshort(e.end)}`}{e.note ? ` · ${e.note}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="empty">Aucune absence à venir.</div>}
          </div>
          <div className="card">
            <h2>Prochains fériés</h2>
            <p className="sub">Jours ouvrés uniquement</p>
            {hl.length ? (
              <div className="list">
                {hl.map(h => (
                  <div className="it" key={h.date}>
                    <span className="ico" style={{ background: 'var(--ferie)' }} />
                    <div><div className="t">{h.name}</div><div className="s">{fday(h.date)} {fshort(h.date)}</div></div>
                  </div>
                ))}
              </div>
            ) : <div className="empty">Plus de férié sur l&apos;année.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
