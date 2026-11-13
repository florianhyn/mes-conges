'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import type { AppData, Collection, Entry, Holiday, YearSettings } from '@/lib/types';
import { compute } from '@/lib/compute';
import { START_YEAR, todayStr } from '@/lib/dates';
import Dashboard from './Dashboard';
import CalendarView from './CalendarView';
import EntriesView from './EntriesView';
import SettingsView from './SettingsView';
import Drawer from './Drawer';

type View = 'dash' | 'cal' | 'list' | 'set';
const VIEWS: { id: View; label: string; title: string; icon: string }[] = [
  { id: 'dash', label: 'Tableau de bord', title: 'Tableau de bord', icon: 'M3 13h5V3H3zM12 21h5V3h-5zM21 21V9h-5' },
  { id: 'cal', label: 'Calendrier annuel', title: 'Calendrier annuel', icon: 'M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 9h18M8 2v4M16 2v4' },
  { id: 'list', label: 'Mes saisies', title: 'Mes saisies', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { id: 'set', label: 'Quotas & fériés', title: 'Quotas & jours fériés', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1' },
];

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [view, setView] = useState<View>('dash');
  const today = useMemo(() => todayStr(), []);
  const [year, setYear] = useState(Math.max(START_YEAR, +today.slice(0, 4)));
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const r = await fetch('/api/data', { cache: 'no-store' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Erreur de chargement');
      setData(await r.json());
    } catch (e) { setLoadError(e instanceof Error ? e.message : 'Erreur de chargement'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toast = (m: string) => { setToastMsg(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToastMsg(''), 2200); };

  /** Mise à jour optimiste, puis écriture dans le Google Sheet ; retour arrière si l'écriture échoue. */
  async function save<K extends Collection>(collection: K, value: AppData[K], message: string) {
    if (!data) return;
    const previous = data;
    setData({ ...data, [collection]: value }); setError('');
    try {
      const r = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collection, data: value }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Enregistrement impossible');
      toast(message);
    } catch (e) {
      setData(previous); setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    }
  }

  const result = useMemo(() => (data ? compute(data, year, today) : null), [data, year, today]);
  const years = Array.from({ length: Math.max(2, +today.slice(0, 4) + 1 - START_YEAR + 1) }, (_, i) => START_YEAR + i);
  const current = VIEWS.find(v => v.id === view)!;
  const defaultDate = year === +today.slice(0, 4) ? today : `${year}-01-02`;
  const editing = data?.entries.find(e => e.id === drawer.id) ?? null;

  function saveEntry(e: Entry) {
    if (!data) return;
    const exists = data.entries.some(x => x.id === e.id);
    const entries = exists ? data.entries.map(x => (x.id === e.id ? e : x)) : [...data.entries, e];
    setDrawer({ open: false, id: null });
    const y = +e.start.slice(0, 4); if (y !== year) setYear(y);
    save('entries', entries, 'Saisie enregistrée');
  }

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <i><svg viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" /></svg></i>
          Mes congés
        </div>
        <nav className="nav">
          {VIEWS.map(v => (
            <button key={v.id} type="button" aria-current={view === v.id ? 'page' : undefined} onClick={() => setView(v.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={v.icon} /></svg>
              {v.label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <span className="sync"><b />Google Sheets synchronisé</span>
          <button className="linkbtn" type="button" onClick={() => signOut({ callbackUrl: '/login' })}>Se déconnecter</button>
        </div>
      </aside>

      <main className="main">
        <div className="head">
          <h1>{current.title}</h1>
          <div className="tools">
            <select aria-label="Année" value={year} onChange={e => setYear(+e.target.value)}>
              {years.map(y => <option key={y} value={y}>Année {y}</option>)}
            </select>
            <button className="btn primary" type="button" disabled={!data} onClick={() => setDrawer({ open: true, id: null })}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 1v12M1 7h12" /></svg>
              Nouvelle saisie
            </button>
          </div>
        </div>

        {error && <div className="errbar" role="alert"><span>{error}. La modification a été annulée.</span><button className="btn small" type="button" onClick={() => setError('')}>Fermer</button></div>}
        {loadError && <div className="errbar" role="alert"><span>{loadError}</span><button className="btn small" type="button" onClick={load}>Réessayer</button></div>}
        {!data && !loadError && <div className="loading">Chargement…</div>}

        {data && result && (
          <div className="stackv">
            {view === 'dash' && <Dashboard data={data} c={result} year={year} today={today} />}
            {view === 'cal' && <CalendarView data={data} c={result} year={year} today={today} />}
            {view === 'list' && <EntriesView data={data} c={result} year={year} onEdit={id => setDrawer({ open: true, id })}
              onDelete={id => save('entries', data.entries.filter(e => e.id !== id), 'Saisie supprimée')} />}
            {view === 'set' && <SettingsView data={data} c={result} year={year}
              onSettings={(s: YearSettings) => save('settings', [...data.settings.filter(x => x.year !== s.year), s], 'Quotas enregistrés')}
              onHolidays={(h: Holiday[]) => save('holidays', h, 'Fériés enregistrés')} />}
          </div>
        )}
      </main>

      {data && <Drawer open={drawer.open} data={data} editing={editing} defaultDate={defaultDate} today={today}
        onClose={() => setDrawer({ open: false, id: null })} onSave={saveEntry} />}
      <div className={`toast${toastMsg ? ' on' : ''}`} role="status">{toastMsg}</div>
    </div>
  );
}
