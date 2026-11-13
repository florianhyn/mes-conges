import type { AbsenceType } from '@/lib/types';

export const TYPES: Record<AbsenceType, { label: string; short: string; color: string }> = {
  CA: { label: 'Congé annuel (CA)', short: 'CA', color: 'var(--ca)' },
  SICK: { label: 'Sick leave', short: 'Sick leave', color: 'var(--sick)' },
  AUTRE: { label: 'Autre', short: 'Autre', color: 'var(--autre)' },
};

export function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="legend">
      {items.map(([cls, label]) => <span key={label}><i className={cls} />{label}</span>)}
    </div>
  );
}
