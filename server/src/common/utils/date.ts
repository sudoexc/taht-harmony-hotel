const MS_PER_DAY = 1000 * 60 * 60 * 24;

const pad2 = (value: number) => String(value).padStart(2, '0');

export const formatDateOnly = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  return `${y}-${m}-${d}`;
};

export const parseDateOnly = (value: string): Date => {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return new Date(value);
  return new Date(Date.UTC(y, m - 1, d));
};

export const monthKeyFromDate = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = pad2(date.getUTCMonth() + 1);
  return `${y}-${m}`;
};

export const monthKeyFromString = (value: string): string => {
  if (value.includes('-')) return value.slice(0, 7);
  return value;
};

export const getMonthRange = (monthKey: string): { start: Date; end: Date } => {
  const [yRaw, mRaw] = monthKey.split('-').map(Number);
  const y = yRaw || 0;
  const m = mRaw ? mRaw - 1 : 0;
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 1));
  return { start, end };
};

export const getMonthKeysInRange = (start: Date, endExclusive: Date): string[] => {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor < endExclusive) {
    keys.push(monthKeyFromDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
};

export const addDays = (date: Date, days: number): Date => {
  return new Date(date.getTime() + days * MS_PER_DAY);
};

export const dayNumber = (date: Date): number => {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY);
};

export const overlapNights = (rangeStart: Date, rangeEndExclusive: Date, stayStart: Date, stayEnd: Date): number => {
  const start = Math.max(dayNumber(rangeStart), dayNumber(stayStart));
  const end = Math.min(dayNumber(rangeEndExclusive), dayNumber(stayEnd));
  return Math.max(0, end - start);
};

export const diffDaysInclusive = (start: Date, end: Date): number => {
  const s = dayNumber(start);
  const e = dayNumber(end);
  return Math.max(0, e - s + 1);
};
