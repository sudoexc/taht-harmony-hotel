import { Stay } from "@/types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const parseDateParts = (value: string) => {
  const [datePart] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
};

const formatPartsToDateStr = (parts: Intl.DateTimeFormatPart[]): string => {
  const map = parts.reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  if (!map.year || !map.month || !map.day) return '';
  return `${map.year}-${map.month}-${map.day}`;
};

export const dateStrInTimeZone = (date: Date, timeZone: string): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatPartsToDateStr(formatter.formatToParts(date));
};

export const getTodayInTimeZone = (timeZone?: string): string => {
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const tz = timeZone || fallback;
  return dateStrInTimeZone(new Date(), tz);
};

export const formatCurrency = (amount: number, locale = 'ru-RU', currencyLabel = 'UZS'): string => {
  return new Intl.NumberFormat(locale).format(amount) + ` ${currencyLabel}`;
};

export const formatDate = (value: string, locale = 'ru-RU'): string => {
  const parts = parseDateParts(value);
  if (!parts) return value;
  const date = new Date(Date.UTC(parts.y, parts.m - 1, parts.d));
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC' }).format(date);
};

export const getDateOnly = (value: string): string => value.split('T')[0];

export const toDayNumber = (value: string): number => {
  const parts = parseDateParts(value);
  if (!parts) return NaN;
  return Math.floor(Date.UTC(parts.y, parts.m - 1, parts.d) / MS_PER_DAY);
};

export const dayNumberToDateStr = (day: number): string => {
  if (!Number.isFinite(day)) return '';
  const date = new Date(day * MS_PER_DAY);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatPartsToDateStr(formatter.formatToParts(date));
};

export const shiftDateStr = (value: string, days: number): string => {
  const base = toDayNumber(value);
  if (!Number.isFinite(base)) return value;
  return dayNumberToDateStr(base + days);
};

export const getNights = (checkIn: string, checkOut: string): number => {
  const start = toDayNumber(checkIn);
  const end = toDayNumber(checkOut);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, end - start);
};

export const getStayTotal = (stay: Stay): number => {
  const nights = getNights(stay.check_in_date, stay.check_out_date);
  return nights * stay.price_per_night - stay.weekly_discount_amount + stay.manual_adjustment_amount;
};

export const getRangeDaysInclusive = (start: string, end: string): number => {
  const s = toDayNumber(start);
  const e = toDayNumber(end);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return 0;
  return Math.max(0, e - s + 1);
};

export const getOverlapNights = (rangeStart: string, rangeEnd: string, stayStart: string, stayEnd: string): number => {
  const startA = toDayNumber(rangeStart);
  const endA = toDayNumber(rangeEnd) + 1;
  const startB = toDayNumber(stayStart);
  const endB = toDayNumber(stayEnd);
  if (![startA, endA, startB, endB].every(Number.isFinite)) return 0;
  const start = Math.max(startA, startB);
  const end = Math.min(endA, endB);
  return Math.max(0, end - start);
};

export const isDateInRange = (value: string, start: string, end: string): boolean => {
  const day = toDayNumber(value);
  const s = toDayNumber(start);
  const e = toDayNumber(end);
  if (![day, s, e].every(Number.isFinite)) return false;
  return day >= s && day <= e;
};

export const getMonthKey = (value: string | Date): string => {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  const parts = parseDateParts(value);
  if (!parts) return '';
  const m = String(parts.m).padStart(2, '0');
  return `${parts.y}-${m}`;
};

export const getMonthRange = (monthKey: string): { start: string; end: string } => {
  const [yRaw, mRaw] = monthKey.split('-').map(Number);
  const y = yRaw || 0;
  const m = mRaw || 1;
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = new Date(y, m, 0);
  const end = dateStr(endDate);
  return { start, end };
};

export const getPreviousMonthKey = (value: Date = new Date()): string => {
  const y = value.getFullYear();
  const m = value.getMonth() + 1;
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
};

export const getPreviousMonthKeyFromMonthKey = (monthKey: string): string => {
  const [yRaw, mRaw] = monthKey.split('-').map(Number);
  const y = yRaw || 0;
  const m = mRaw || 0;
  if (!y || !m) return '';
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
};

export const dateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
