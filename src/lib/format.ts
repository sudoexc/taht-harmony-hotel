import { Stay } from "@/types";

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' UZS';
};

export const getNights = (checkIn: string, checkOut: string): number => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
};

export const getStayTotal = (stay: Stay): number => {
  const nights = getNights(stay.check_in_date, stay.check_out_date);
  return nights * stay.price_per_night - stay.weekly_discount_amount + stay.manual_adjustment_amount;
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
