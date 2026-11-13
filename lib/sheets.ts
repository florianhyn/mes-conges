import { google, sheets_v4 } from 'googleapis';
import type { AppData, Collection, Entry, Holiday, YearSettings } from './types';

/** Onglets du Google Sheet (créés automatiquement s'ils n'existent pas). */
const TABS = {
  entries: { name: 'Saisies', header: ['id', 'type', 'debut', 'fin', 'demi_journee', 'note'] },
  holidays: { name: 'Feries', header: ['date', 'nom'] },
  settings: { name: 'Quotas', header: ['annee', 'ca', 'report', 'sick_leave'] },
} as const;

function client(): sheets_v4.Sheets {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY manquants');
  const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return google.sheets({ version: 'v4', auth });
}
function sheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('GOOGLE_SHEET_ID manquant');
  return id;
}

async function ensureTabs(api: sheets_v4.Sheets, spreadsheetId: string) {
  const meta = await api.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
  const existing = new Set((meta.data.sheets ?? []).map(s => s.properties?.title));
  const missing = Object.values(TABS).filter(t => !existing.has(t.name));
  if (!missing.length) return;
  await api.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: missing.map(t => ({ addSheet: { properties: { title: t.name } } })) },
  });
  await api.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: missing.map(t => ({ range: `${t.name}!A1`, values: [[...t.header]] })),
    },
  });
}

const str = (v: unknown) => (v == null ? '' : String(v).trim());
const num = (v: unknown) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };

export async function readAll(): Promise<AppData> {
  const api = client(), spreadsheetId = sheetId();
  await ensureTabs(api, spreadsheetId);
  const res = await api.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: Object.values(TABS).map(t => `${t.name}!A2:F`),
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const [e, h, s] = (res.data.valueRanges ?? []).map(r => r.values ?? []);
  const entries: Entry[] = e.filter(r => str(r[0]) && str(r[2])).map(r => ({
    id: str(r[0]),
    type: (['CA', 'SICK', 'AUTRE'].includes(str(r[1])) ? str(r[1]) : 'AUTRE') as Entry['type'],
    start: str(r[2]), end: str(r[3]) || str(r[2]),
    half: str(r[4]) === 'AM' || str(r[4]) === 'PM' ? (str(r[4]) as 'AM' | 'PM') : null,
    note: str(r[5]),
  }));
  const holidays: Holiday[] = h.filter(r => str(r[0])).map(r => ({ date: str(r[0]), name: str(r[1]) }));
  const settings: YearSettings[] = s.filter(r => str(r[0])).map(r => ({
    year: num(r[0]), caQuota: num(r[1]), report: str(r[2]) === '' ? null : num(r[2]), sickQuota: num(r[3]),
  }));
  return { entries, holidays, settings };
}

function rows(collection: Collection, value: AppData[Collection]): (string | number)[][] {
  if (collection === 'entries') return (value as Entry[]).map(e => [e.id, e.type, e.start, e.end, e.half ?? '', e.note]);
  if (collection === 'holidays') return (value as Holiday[]).map(h => [h.date, h.name]);
  return (value as YearSettings[]).map(s => [s.year, s.caQuota, s.report ?? '', s.sickQuota]);
}

/** Remplace entièrement un onglet (volumes minuscules : plus simple et plus sûr qu'une mise à jour ligne par ligne). */
export async function writeCollection(collection: Collection, value: AppData[Collection]) {
  const api = client(), spreadsheetId = sheetId();
  await ensureTabs(api, spreadsheetId);
  const tab = TABS[collection];
  await api.spreadsheets.values.clear({ spreadsheetId, range: `${tab.name}!A2:F` });
  const values = rows(collection, value);
  if (values.length) {
    await api.spreadsheets.values.update({
      spreadsheetId, range: `${tab.name}!A2`, valueInputOption: 'RAW', requestBody: { values },
    });
  }
}
