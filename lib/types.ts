export type AbsenceType = 'CA' | 'SICK' | 'AUTRE';
export type HalfPart = 'AM' | 'PM' | null;

export interface Entry {
  id: string;
  type: AbsenceType;
  start: string; // YYYY-MM-DD
  end: string;
  half: HalfPart;
  note: string;
}
export interface Holiday { date: string; name: string }
export interface YearSettings {
  year: number;
  caQuota: number;
  report: number | null; // null = calcul automatique
  sickQuota: number;
}
export interface AppData {
  entries: Entry[];
  holidays: Holiday[];
  settings: YearSettings[];
}
export type Collection = keyof AppData;
