import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from './compute';
import type { AppData, Entry } from './types';

const e = (id: string, type: Entry['type'], start: string, end = start, half: Entry['half'] = null): Entry => ({ id, type, start, end, half, note: '' });
const data: AppData = {
  settings: [{ year: 2026, caQuota: 25, report: 3, sickQuota: 10 }],
  holidays: [
    { date: '2026-05-25', name: 'Lundi de Pentecôte' }, { date: '2026-08-15', name: 'Assomption' }, // samedi
    { date: '2026-11-11', name: 'Armistice' }, { date: '2026-12-25', name: 'Noël' },
  ],
  entries: [
    e('1', 'CA', '2026-02-16', '2026-02-20'),          // 5
    e('2', 'CA', '2026-05-25', '2026-05-26'),          // férié ignoré -> 1
    e('3', 'CA', '2026-09-18', '2026-09-18', 'PM'),    // 0,5
    e('4', 'CA', '2026-07-03', '2026-07-12'),          // 2 week-ends ignorés -> 6
    e('5', 'SICK', '2026-03-09'),
    e('6', 'AUTRE', '2026-09-28', '2026-09-29'),
  ],
};
const today = '2026-11-13';

test('soldes CA et sick leave', () => {
  const c = compute(data, 2026, today);
  assert.equal(c.tot.CA, 12.5);
  assert.equal(c.caTotal, 28);
  assert.equal(c.caRemaining, 15.5);
  assert.equal(c.sickRemaining, 9);
  assert.equal(c.tot.AUTRE, 2);
});
test('férié sous un CA : ignoré et signalé', () => {
  const c = compute(data, 2026, today);
  assert.equal(c.conflicts.length, 1);
  assert.equal(c.per['2'].counted, 1);
  assert.equal(c.per['2'].ignored, 1);
});
test('fériés restants : week-end exclus, passés exclus', () => {
  const c = compute(data, 2026, today);
  assert.equal(c.wdHol.length, 3);
  assert.equal(c.weHol, 1);
  assert.equal(c.holLeft, 1);
});
test('report auto plafonné à 5', () => {
  const d: AppData = { ...data, settings: [{ year: 2026, caQuota: 25, report: 3, sickQuota: 10 }, { year: 2027, caQuota: 25, report: null, sickQuota: 15 }] };
  assert.equal(compute(d, 2027, today).report, 5); // reste 15,5 en 2026 -> plafonné
  const d2: AppData = { ...d, entries: [...d.entries, e('9', 'CA', '2026-10-05', '2026-10-30')] };
  assert.equal(compute(d2, 2027, today).report, Math.max(0, Math.min(5, compute(d2, 2026, today).caRemaining)));
});
test('répartition mensuelle cohérente', () => {
  const m = compute(data, 2026, today).months;
  for (const x of m) assert.ok(Math.abs(x.wd - x.hol - x.CA - x.SICK - x.AUTRE - x.worked) < 1e-9);
});
