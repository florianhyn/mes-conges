'use client';
import { useState } from 'react';
import type { AbsenceType, AppData } from '@/lib/types';
import type { YearResult } from '@/lib/compute';
import { fdate, fmt } from '@/lib/dates';
import { TYPES } from './ui';

type Filter = 'ALL' | AbsenceType;

export default function EntriesView({ data, c, year, onEdit, onDelete }: {
  data: AppData; c: YearResult; year: number; onEdit: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [confirming, setConfirming] = useState<string | null>(null);
  const rows = data.entries
    .filter(e => e.end >= `${year}-01-01` && e.start <= `${year}-12-31` && (filter === 'ALL' || e.type === filter))
    .sort((a, b) => (a.start < b.start ? -1 : 1));
  const chips: [Filter, string][] = [['ALL', 'Tous'], ['CA', 'CA'], ['SICK', 'Sick leave'], ['AUTRE', 'Autre']];

  return (
    <>
      <div className="toolbar">
        {chips.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
      </div>
      <div className="card" style={{ padding: '8px 12px' }}>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Type</th><th>Période</th><th className="r">Jours décomptés</th><th>Note</th><th /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="empty" style={{ padding: '28px 12px', textAlign: 'center' }}>Aucune saisie. Utilisez « Nouvelle saisie ».</td></tr>}
              {rows.map(e => {
                const p = c.per[e.id] ?? { counted: 0, ignored: 0 };
                let period = e.start === e.end ? fdate(e.start) : `${fdate(e.start)} → ${fdate(e.end)}`;
                if (e.half) period += e.half === 'AM' ? ' · matin' : ' · après-midi';
                const sure = confirming === e.id;
                return (
                  <tr key={e.id}>
                    <td><span className={`pill ${e.type}`}>{TYPES[e.type].short}</span></td>
                    <td className="num">{period}</td>
                    <td className="r num">{fmt(p.counted)}{p.ignored > 0 && <span className="minor"> (+{p.ignored} férié ignoré)</span>}</td>
                    <td className="muted">{e.note}</td>
                    <td>
                      <div className="actions">
                        <button className="btn small" type="button" onClick={() => onEdit(e.id)}>Modifier</button>
                        <button className={`btn small danger${sure ? ' confirm' : ''}`} type="button"
                          onClick={() => { if (sure) { setConfirming(null); onDelete(e.id); } else { setConfirming(e.id); setTimeout(() => setConfirming(x => (x === e.id ? null : x)), 3000); } }}>
                          {sure ? 'Confirmer ?' : 'Supprimer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
