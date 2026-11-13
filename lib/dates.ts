export const START_DATE = '2026-01-01';
export const START_YEAR = 2026;
export const REPORT_MAX = 5;
export const DEFAULT_CA = 25;
export const DEFAULT_SICK = 15;

export const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
export const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];

export const pd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const ds = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const dow = (ms: number) => new Date(ms).getUTCDay();
export const pad = (n: number) => String(n).padStart(2, '0');
export const isWeekend = (date: string) => { const w = dow(pd(date)); return w === 0 || w === 6; };

export function eachDay(a: string, b: string, fn: (date: string, weekday: number) => void) {
  for (let t = pd(a); t <= pd(b); t += 864e5) fn(ds(t), dow(t));
}
export function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}
export const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
export const fdate = (s: string) => { const a = s.split('-'); return `${a[2]}/${a[1]}/${a[0]}`; };
export const fshort = (s: string) => new Date(pd(s)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const fday = (s: string) => new Date(pd(s)).toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
export const plural = (n: number, w: string) => `${fmt(n)} ${w}${n > 1 ? 's' : ''}`;
