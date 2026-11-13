import type { AppData } from '@/lib/types';
import { holidayMap, type YearResult } from '@/lib/compute';
import { MONTHS, dow, fmt, pad, pd } from '@/lib/dates';
import { Legend, TYPES } from './ui';

export default function CalendarView({ data, c, year, today }: { data: AppData; c: YearResult; year: number; today: string }) {
  const hol = holidayMap(data, year);
  const conf = new Set(c.conflicts.map(x => x.date));
  return (
    <>
      <div className="card">
        <Legend items={[['sw-open', 'Travaillé'], ['sw-ca', 'CA'], ['sw-sick', 'Sick leave'], ['sw-autre', 'Autre'], ['sw-ferie', 'Férié'], ['sw-we', 'Week-end']]} />
      </div>
      <div className="months">
        {MONTHS.map((name, m) => {
          const first = pd(`${year}-${pad(m + 1)}-01`);
          const last = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
          const off = (dow(first) + 6) % 7, mm = c.months[m];
          const sum = [mm.CA && `${fmt(mm.CA)} CA`, mm.SICK && `${fmt(mm.SICK)} sick`, mm.AUTRE && `${fmt(mm.AUTRE)} autre`].filter(Boolean);
          const cells: React.ReactNode[] = [];
          for (let i = 0; i < off; i++) cells.push(<div key={`b${i}`} />);
          for (let d = 1; d <= last; d++) {
            const key = `${year}-${pad(m + 1)}-${pad(d)}`, w = dow(pd(key));
            let cls = 'd num', title = '', style: React.CSSProperties | undefined;
            if (w === 0 || w === 6) cls += ' we';
            else if (hol[key]) {
              cls += ' ferie'; title = hol[key];
              if (conf.has(key)) { cls += ' conflict'; title += ' (absence saisie ce jour, ignorée)'; }
            } else if (c.days[key]) {
              const parts = c.days[key].parts, stops: string[] = [];
              let cum = 0;
              if (parts.length === 1 && parts[0].v < 1 && parts[0].half === 'PM') { stops.push('transparent 0 50%'); cum = 0.5; }
              parts.forEach(p => { stops.push(`${TYPES[p.type].color} ${cum * 100}% ${(cum + p.v) * 100}%`); cum += p.v; });
              if (cum < 1) stops.push(`transparent ${cum * 100}% 100%`);
              style = { background: `linear-gradient(90deg,${stops.join(',')})` };
              cls += parts.reduce((s, p) => s + p.v, 0) >= 1 ? ' off' : ' open halfx';
              title = parts.map(p => TYPES[p.type].short + (p.v < 1 ? ' (demi-journée)' : '')).join(' + ');
            } else cls += ' open';
            if (key === today) cls += ' today';
            cells.push(<div key={key} className={cls} style={style} title={title || undefined}>{d}</div>);
          }
          return (
            <div className="card month" key={m}>
              <header><h3>{name}</h3><small>{sum.join(' · ') || '—'}</small></header>
              <div className="mgrid">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x, i) => <div className="dh" key={i}>{x}</div>)}
                {cells}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
