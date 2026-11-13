import { NextResponse } from 'next/server';
import { isAuthorized } from '@/auth';
import { readData, writeCollection } from '@/lib/store';
import type { Collection } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function valid(collection: string, data: unknown): data is never[] {
  if (!Array.isArray(data) || data.length > 5000) return false;
  if (collection === 'entries') {
    return data.every(e => typeof e?.id === 'string' && ['CA', 'SICK', 'AUTRE'].includes(e.type) && DATE.test(e.start) && DATE.test(e.end)
      && e.end >= e.start && e.start >= '2026-01-01' && [null, 'AM', 'PM'].includes(e.half) && typeof e.note === 'string' && e.note.length < 500);
  }
  if (collection === 'holidays') return data.every(h => DATE.test(h?.date) && typeof h.name === 'string' && h.name.length < 200);
  if (collection === 'settings') {
    return data.every(s => Number.isInteger(s?.year) && isNum(s.caQuota) && isNum(s.sickQuota) && (s.report === null || isNum(s.report)));
  }
  return false;
}

export async function GET() {
  if (!(await isAuthorized())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  try { return NextResponse.json(await readData()); }
  catch (e) { console.error(e); return NextResponse.json({ error: 'Lecture du Google Sheet impossible' }, { status: 500 }); }
}

export async function PUT(req: Request) {
  if (!(await isAuthorized())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { collection, data } = await req.json().catch(() => ({}));
  if (!valid(collection, data)) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
  try { await writeCollection(collection as Collection, data); return NextResponse.json({ ok: true }); }
  catch (e) { console.error(e); return NextResponse.json({ error: 'Écriture dans le Google Sheet impossible' }, { status: 500 }); }
}
