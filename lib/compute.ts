import type { AbsenceType, AppData, Entry, YearSettings } from './types';
import { DEFAULT_CA, DEFAULT_SICK, REPORT_MAX, START_YEAR, dow, eachDay, pad, pd } from './dates';

export interface DayPart { type: AbsenceType; v: number; half: Entry['half'] }
export interface MonthStats { wd: number; hol: number; CA: number; SICK: number; AUTRE: number; worked: number }
export type Totals = Record<AbsenceType, number>;

export interface YearResult {
  days: Record<string, { parts: DayPart[] }>;
  conflicts: { entry: Entry; date: string; name: string }[];
  per: Record<string, { counted: number; ignored: number }>;
  tot: Totals; taken: Totals; plan: Totals;
  months: MonthStats[];
  report: number;
  caQuota: number;
  caTotal: number; caRemaining: number;
  sickQuota: number; sickRemaining: number;
  wdHol: { date: string; name: string }[];
  weHol: number;
  holLeft: number;
}

export function settingsFor(settings: YearSettings[], year: number): YearSettings {
  return settings.find(s => s.year === year) ?? { year, caQuota: DEFAULT_CA, report: null, sickQuota: DEFAULT_SICK };
}

export function holidayMap(data: Pick<AppData, 'holidays'>, year: number) {
  const m: Record<string, string> = {};
  data.holidays.filter(h => h.date.startsWith(String(year))).forEach(h => { m[h.date] = h.name; });
  return m;
}

export function compute(data: AppData, year: number, today: string, entries: Entry[] = data.entries): YearResult {
  const hol = holidayMap(data, year);
  const days: YearResult['days'] = {};
  const conflicts: YearResult['conflicts'] = [];
  const per: YearResult['per'] = {};
  const zero = (): Totals => ({ CA: 0, SICK: 0, AUTRE: 0 });
  const tot = zero(), taken = zero(), plan = zero();
  const y0 = `${year}-01-01`, y1 = `${year}-12-31`;

  entries.forEach(e => {
    if (e.end < y0 || e.start > y1) return;
    const a = e.start < y0 ? y0 : e.start, b = e.end > y1 ? y1 : e.end;
    per[e.id] = { counted: 0, ignored: 0 };
    eachDay(a, b, (d, w) => {
      if (w === 0 || w === 6) return;
      if (hol[d]) { conflicts.push({ entry: e, date: d, name: hol[d] }); per[e.id].ignored++; return; }
      const day = days[d] ?? (days[d] = { parts: [] });
      const used = day.parts.reduce((s, p) => s + p.v, 0);
      const v = Math.min(e.half ? 0.5 : 1, 1 - used);
      if (v <= 0) return;
      day.parts.push({ type: e.type, v, half: e.half });
      tot[e.type] += v; per[e.id].counted += v;
      if (d <= today) taken[e.type] += v; else plan[e.type] += v;
    });
  });

  const months: MonthStats[] = [];
  for (let m = 0; m < 12; m++) {
    const r: MonthStats = { wd: 0, hol: 0, CA: 0, SICK: 0, AUTRE: 0, worked: 0 };
    const last = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    for (let d = 1; d <= last; d++) {
      const key = `${year}-${pad(m + 1)}-${pad(d)}`, w = dow(pd(key));
      if (w === 0 || w === 6) continue;
      r.wd++;
      if (hol[key]) { r.hol++; continue; }
      let off = 0;
      (days[key]?.parts ?? []).forEach(p => { r[p.type] += p.v; off += p.v; });
      r.worked += 1 - off;
    }
    months.push(r);
  }

  const s = settingsFor(data.settings, year);
  let report = 0;
  if (s.report != null) report = Math.min(s.report, REPORT_MAX);
  else if (year > START_YEAR) report = Math.min(REPORT_MAX, Math.max(0, compute(data, year - 1, today).caRemaining));

  const yearHol = data.holidays.filter(h => h.date.startsWith(String(year)));
  const wdHol = yearHol.filter(h => { const w = dow(pd(h.date)); return w !== 0 && w !== 6; }).sort((a, b) => (a.date < b.date ? -1 : 1));
  const caTotal = s.caQuota + report;
  return {
    days, conflicts, per, tot, taken, plan, months, report,
    caQuota: s.caQuota, caTotal, caRemaining: caTotal - tot.CA,
    sickQuota: s.sickQuota, sickRemaining: s.sickQuota - tot.SICK,
    wdHol, weHol: yearHol.length - wdHol.length,
    holLeft: wdHol.filter(h => h.date >= today).length,
  };
}
