import { promises as fs } from 'fs';
import path from 'path';
import type { AppData, Collection } from './types';
import * as sheets from './sheets';

/**
 * DEV_LOCAL=1 : stockage dans .data/db.json, sans Google (développement uniquement).
 * Sinon : Google Sheets.
 */
const FILE = path.join(process.cwd(), '.data', 'db.json');
const empty: AppData = { entries: [], holidays: [], settings: [] };

export const isLocal = () => process.env.DEV_LOCAL === '1' && process.env.NODE_ENV !== 'production';

export async function readData(): Promise<AppData> {
  if (!isLocal()) return sheets.readAll();
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { return structuredClone(empty); }
}

export async function writeCollection(collection: Collection, value: AppData[Collection]) {
  if (!isLocal()) {
    return sheets.writeCollection(collection, value);
  }
  const current = await readData();
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify({ ...current, [collection]: value }, null, 2));
}
