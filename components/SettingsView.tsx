'use client';
import { useState } from 'react';
import type { AppData, YearSettings } from '@/lib/types';
import { settingsFor, type YearResult } from '@/lib/compute';
import { REPORT_MAX, START_YEAR, fdate, fday, fmt, isWeekend } from '@/lib/dates';

export default function SettingsView({ data, c, year, onSettings, onHolidays }: {
  data: AppData; c: YearResult; year: number;
  onSettings: (s: YearSettings) => void; onHolidays: (h: AppData['holidays']) => void;
}) {
  const s = settingsFor(data.settings, year);
  const [hDate, setHDate] = useState(''), [hName, setHName] = useState(''), [err, setErr] = useState('');
  const hs = data.holidays.filter(h => h.date.startsWith(String(year))).sort((a, b) => (a.date < b.date ? -1 : 1));
  const num = (v: string) => Math.max(0, Number(v.replace(',', '.')) || 0);
  const autoNote = s.report == null && year > START_YEAR
    ? `Calculé automatiquement : ${fmt(c.report)} j (solde ${year - 1}, plafonné à ${REPORT_MAX}).`
    : "Laisser vide pour un calcul automatique à partir de l'année précédente.";

  function add() {
    if (!hDate || !hName.trim()) return setErr('Renseignez la date et le nom.');
    if (!hDate.startsWith(String(year))) return setErr(`La date doit être en ${year}.`);
    if (data.holidays.some(h => h.date === hDate)) return setErr('Un férié existe déjà à cette date.');
    setErr(''); onHolidays([...data.holidays, { date: hDate, name: hName.trim() }]); setHDate(''); setHName('');
  }

  return (
    <>
      <div className="card">
        <h2>Quotas {year}</h2>
        <p className="sub">Période du 01/01/{year} au 31/12/{year}.</p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="sCa">CA de l&apos;année</label>
            <input id="sCa" type="number" min={0} step={0.5} key={`ca${year}${s.caQuota}`} defaultValue={s.caQuota}
              onBlur={e => onSettings({ ...s, caQuota: num(e.target.value) })} />
            <span className="hint">Jours acquis sur l&apos;année.</span>
          </div>
          <div className="field">
            <label htmlFor="sRep">Report de l&apos;année précédente</label>
            <input id="sRep" type="number" min={0} max={REPORT_MAX} step={0.5} placeholder="Auto" key={`rp${year}${s.report}`} defaultValue={s.report ?? ''}
              onBlur={e => onSettings({ ...s, report: e.target.value === '' ? null : Math.min(REPORT_MAX, num(e.target.value)) })} />
            <span className="hint">{autoNote}</span>
          </div>
          <div className="field">
            <label htmlFor="sSick">Sick leave de l&apos;année</label>
            <input id="sSick" type="number" min={0} step={0.5} key={`sk${year}${s.sickQuota}`} defaultValue={s.sickQuota}
              onBlur={e => onSettings({ ...s, sickQuota: num(e.target.value) })} />
            <span className="hint">15 par défaut. À ajuster si vous avez commencé en cours d&apos;année.</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ paddingBottom: 12 }}>
        <h2>Jours fériés {year}</h2>
        <p className="sub">Saisie manuelle. Les fériés tombant un week-end ne sont pas comptés.</p>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Date</th><th>Jour</th><th>Nom</th><th>Statut</th><th /></tr></thead>
            <tbody>
              {hs.length === 0 && <tr><td colSpan={5} className="empty" style={{ padding: '28px 12px', textAlign: 'center' }}>Aucun férié saisi pour {year}. Ajoutez-les ci-dessous.</td></tr>}
              {hs.map(h => (
                <tr key={h.date}>
                  <td className="num">{fdate(h.date)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{fday(h.date)}</td>
                  <td>{h.name}</td>
                  <td>{isWeekend(h.date) ? <span className="pill WE">Week-end · non compté</span> : <span className="pill FERIE">Jour ouvré</span>}</td>
                  <td><div className="actions"><button className="btn small danger" type="button" onClick={() => onHolidays(data.holidays.filter(x => x.date !== h.date))}>Retirer</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="addrow">
          <div className="field"><label htmlFor="hDate">Date</label><input id="hDate" type="date" min={`${year}-01-01`} max={`${year}-12-31`} value={hDate} onChange={e => setHDate(e.target.value)} /></div>
          <div className="field" style={{ flex: 1, minWidth: 200 }}><label htmlFor="hName">Nom</label><input id="hName" type="text" placeholder="Ex. : Fête nationale" value={hName} onChange={e => setHName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} /></div>
          <button className="btn primary" type="button" onClick={add}>Ajouter</button>
        </div>
        {err && <p className="minor" style={{ color: '#B42318', marginTop: 8 }}>{err}</p>}
      </div>
    </>
  );
}
