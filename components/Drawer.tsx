'use client';
import { useEffect, useMemo, useState } from 'react';
import type { AbsenceType, AppData, Entry, HalfPart } from '@/lib/types';
import { compute, holidayMap } from '@/lib/compute';
import { START_DATE, eachDay, fdate, fmt, fshort, plural } from '@/lib/dates';

const TYPE_OPTS: { v: AbsenceType; l: string; s: string }[] = [
  { v: 'CA', l: 'CA', s: 'Congé annuel' }, { v: 'SICK', l: 'Sick leave', s: 'Maladie' }, { v: 'AUTRE', l: 'Autre', s: 'Hors quota' },
];

export default function Drawer({ open, data, editing, defaultDate, today, onClose, onSave }: {
  open: boolean; data: AppData; editing: Entry | null; defaultDate: string; today: string;
  onClose: () => void; onSave: (e: Entry) => void;
}) {
  const [type, setType] = useState<AbsenceType>('CA');
  const [start, setStart] = useState(defaultDate), [end, setEnd] = useState(defaultDate);
  const [half, setHalf] = useState<HalfPart>(null), [halfOn, setHalfOn] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? 'CA');
    setStart(editing?.start ?? defaultDate); setEnd(editing?.end ?? defaultDate);
    setHalfOn(!!editing?.half); setHalf(editing?.half ?? 'AM'); setNote(editing?.note ?? '');
  }, [open, editing, defaultDate]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const candidate: Entry = { id: editing?.id ?? 'new', type, start, end: halfOn ? start : end, half: halfOn ? (half ?? 'AM') : null, note: note.trim() };
  const error = !candidate.start || !candidate.end ? 'Renseignez les deux dates.'
    : candidate.start < START_DATE ? 'La période disponible commence le 01/01/2026.'
    : candidate.end < candidate.start ? 'La date de fin précède la date de début.'
    : candidate.start.slice(0, 4) !== candidate.end.slice(0, 4) ? 'Une saisie ne peut pas chevaucher deux années. Faites-en une par année.' : null;

  const preview = useMemo(() => {
    if (error) return null;
    let we = 0, cnt = 0;
    const ign: string[] = [];
    const hol = holidayMap(data, +candidate.start.slice(0, 4));
    eachDay(candidate.start, candidate.end, (d, w) => {
      if (w === 0 || w === 6) { we++; return; }
      if (hol[d]) { ign.push(`${fshort(d)} (${hol[d]})`); return; }
      cnt += candidate.half ? 0.5 : 1;
    });
    const y = +candidate.start.slice(0, 4);
    const others = data.entries.filter(x => x.id !== editing?.id);
    return { we, cnt, ign, before: compute(data, y, today, others), after: compute(data, y, today, [...others, candidate]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, data, editing, today, type, start, end, halfOn, half]);

  const submit = () => { if (!error) onSave({ ...candidate, id: editing?.id ?? crypto.randomUUID() }); };

  return (
    <>
      <div className={`scrim${open ? ' on' : ''}`} onClick={onClose} />
      <aside className={`drawer${open ? ' on' : ''}`} aria-hidden={!open} aria-label="Saisie d'une absence">
        <header>
          <h2>{editing ? 'Modifier la saisie' : 'Nouvelle saisie'}</h2>
          <button className="iconbtn" type="button" onClick={onClose} aria-label="Fermer">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </header>
        <form onSubmit={e => { e.preventDefault(); submit(); }} noValidate>
          <div className="field">
            <span className="l">Type d&apos;absence</span>
            <div className="seg" role="radiogroup">
              {TYPE_OPTS.map(o => (
                <span key={o.v} style={{ display: 'contents' }}>
                  <input type="radio" name="type" id={`t-${o.v}`} checked={type === o.v} onChange={() => setType(o.v)} />
                  <label htmlFor={`t-${o.v}`}>{o.l}<small>{o.s}</small></label>
                </span>
              ))}
            </div>
          </div>
          <div className="two">
            <div className="field"><label htmlFor="fStart">Du</label>
              <input type="date" id="fStart" min={START_DATE} value={start} onChange={e => { setStart(e.target.value); if (halfOn || !end || end < e.target.value) setEnd(e.target.value); }} /></div>
            <div className="field"><label htmlFor="fEnd">Au</label>
              <input type="date" id="fEnd" min={START_DATE} value={halfOn ? start : end} disabled={halfOn} onChange={e => setEnd(e.target.value)} /></div>
          </div>
          <div className="field">
            <label className="check"><input type="checkbox" checked={halfOn} onChange={e => setHalfOn(e.target.checked)} /> Demi-journée</label>
            {halfOn && (
              <select aria-label="Moment de la journée" value={half ?? 'AM'} onChange={e => setHalf(e.target.value as HalfPart)}>
                <option value="AM">Matin</option><option value="PM">Après-midi</option>
              </select>
            )}
          </div>
          <div className="field"><label htmlFor="fNote">Note <span className="muted">(facultatif)</span></label>
            <input type="text" id="fNote" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex. : vacances d'été…" maxLength={200} /></div>
          <div className="preview">
            {error && <span className="e">{error}</span>}
            {preview && (
              <>
                <span><b>{plural(preview.cnt, 'jour')} décompté{preview.cnt > 1 ? 's' : ''}</b>{preview.we > 0 && ` · ${preview.we} jour${preview.we > 1 ? 's' : ''} de week-end ignoré${preview.we > 1 ? 's' : ''}`}</span>
                {preview.ign.length > 0 && <span className="w">Férié ignoré dans le décompte : {preview.ign.join(', ')}</span>}
                {type === 'CA' && <span>Solde de CA : {fmt(preview.before.caRemaining)} → <b>{fmt(preview.after.caRemaining)} j</b></span>}
                {type === 'CA' && preview.after.caRemaining < 0 && <span className="e">Ce congé dépasse votre solde.</span>}
                {type === 'SICK' && <span>Solde de sick leave : {fmt(preview.before.sickRemaining)} → <b>{fmt(preview.after.sickRemaining)} j</b></span>}
                {type === 'SICK' && preview.after.sickRemaining < 0 && <span className="e">Ce congé dépasse votre quota.</span>}
                {type === 'AUTRE' && <span className="muted">Hors quota : aucun solde n&apos;est modifié.</span>}
                {preview.cnt === 0 && preview.ign.length === 0 && <span className="w">Aucun jour ouvré sur cette période ({fdate(candidate.start)}).</span>}
              </>
            )}
          </div>
        </form>
        <footer>
          <button className="btn" type="button" onClick={onClose}>Annuler</button>
          <button className="btn primary" type="button" onClick={submit} disabled={!!error}>Enregistrer</button>
        </footer>
      </aside>
    </>
  );
}
