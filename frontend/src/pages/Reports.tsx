import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency, getMonthKey, getMonthRange, getPreviousMonthKeyFromMonthKey, getTodayInTimeZone, shiftDateStr, getNights } from "@/lib/format";
import { ExpenseCategory, TotalsSnapshot } from "@/types";
import { apiFetch } from "@/lib/api";
import * as XLSX from "xlsx";
import { TrendingUp, TrendingDown, FileDown, Lock, Unlock, BedDouble, CalendarDays, Telescope } from "lucide-react";

const CATEGORIES: ExpenseCategory[] = ["SALARY", "INVENTORY", "UTILITIES", "REPAIR", "MARKETING", "OTHER"];

const GOLD   = 'hsl(38, 72%, 55%)';
const GREEN  = 'hsl(145, 55%, 40%)';
const RED    = 'hsl(0, 63%, 42%)';
const BLUE   = 'hsl(217, 75%, 58%)';
const PURPLE = 'hsl(280, 60%, 55%)';
const ORANGE = 'hsl(25, 90%, 55%)';
const MUTED  = 'hsl(220, 10%, 48%)';

const METHOD_PALETTE = [GREEN, BLUE, GOLD, PURPLE, ORANGE, RED, MUTED];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  SALARY: BLUE, INVENTORY: GOLD, UTILITIES: ORANGE, REPAIR: RED, MARKETING: PURPLE, OTHER: MUTED,
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  ECONOM: 'Эконом', STANDARD: 'Стандарт', SUITE: 'Сюит', FAMILY: 'Семейный',
};
const ROOM_TYPE_COLORS: Record<string, string> = {
  ECONOM: MUTED, STANDARD: BLUE, SUITE: GOLD, FAMILY: PURPLE,
};

const emptySnapshot = (): TotalsSnapshot => ({
  revenue_by_method: {},
  expenses_by_category: CATEGORIES.reduce((acc, c) => { acc[c] = 0; return acc; }, {} as Record<ExpenseCategory, number>),
  profit: 0, occupancy_rate: 0, adr: 0, revpar: 0, sold_nights: 0, available_nights: 0, total_room_revenue: 0,
});

const heatColor = (pct: number): string => {
  if (pct === 0)   return 'hsl(228,16%,14%)';
  if (pct < 25)    return 'hsl(0,55%,30%)';
  if (pct < 50)    return 'hsl(25,80%,38%)';
  if (pct < 75)    return 'hsl(38,72%,45%)';
  if (pct < 90)    return 'hsl(145,45%,30%)';
  return            'hsl(145,55%,42%)';
};

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 86400000);

const Reports = () => {
  const { t, language } = useLanguage();
  const { monthClosings, closePreviousMonth, reopenMonth, isMonthClosed, hotel, payments, expenses, rooms, stays } = useData();
  const { isAdmin } = useAuth();
  const locale = language === "uz" ? "uz-UZ" : "ru-RU";

  const todayStr = getTodayInTimeZone(hotel.timezone);
  const [preset, setPreset] = useState("thisMonth");
  const currentMonthKey = getMonthKey(todayStr);
  const [rangeStart, setRangeStart] = useState(() => getMonthRange(currentMonthKey).start);
  const [rangeEnd, setRangeEnd]     = useState(() => getMonthRange(currentMonthKey).end);
  const [report, setReport]         = useState<TotalsSnapshot>(emptySnapshot());
  const [prevReport, setPrevReport] = useState<TotalsSnapshot>(emptySnapshot());
  const [reportLoading, setReportLoading] = useState(false);

  // ── Main report fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    setReportLoading(true);
    apiFetch<TotalsSnapshot>(`/reports?from=${rangeStart}&to=${rangeEnd}`)
      .then((data) => {
        if (!active) return;
        setReport({
          ...emptySnapshot(), ...data,
          revenue_by_method:    data.revenue_by_method || {},
          expenses_by_category: { ...emptySnapshot().expenses_by_category, ...data.expenses_by_category },
        });
      })
      .catch(() => { if (!active) return; setReport(emptySnapshot()); })
      .finally(() => { if (active) setReportLoading(false); });
    return () => { active = false; };
  }, [rangeStart, rangeEnd]);

  // ── Previous period fetch (for comparison) ────────────────────────────────
  const rangeDays = useMemo(() =>
    daysBetween(rangeStart, rangeEnd) + 1,
    [rangeStart, rangeEnd]
  );
  const prevRangeEnd   = useMemo(() => shiftDateStr(rangeStart, -1), [rangeStart]);
  const prevRangeStart = useMemo(() => shiftDateStr(prevRangeEnd, -(rangeDays - 1)), [prevRangeEnd, rangeDays]);

  useEffect(() => {
    let active = true;
    apiFetch<TotalsSnapshot>(`/reports?from=${prevRangeStart}&to=${prevRangeEnd}`)
      .then(data => {
        if (!active) return;
        setPrevReport({ ...emptySnapshot(), ...data, revenue_by_method: data.revenue_by_method || {} });
      })
      .catch(() => { if (active) setPrevReport(emptySnapshot()); });
    return () => { active = false; };
  }, [prevRangeStart, prevRangeEnd]);

  const applyPreset = (key: string) => {
    setPreset(key);
    if (key === "today") {
      setRangeStart(todayStr); setRangeEnd(todayStr);
    } else if (key === "last7Days") {
      setRangeStart(shiftDateStr(todayStr, -6)); setRangeEnd(todayStr);
    } else if (key === "thisMonth") {
      const { start, end } = getMonthRange(currentMonthKey);
      setRangeStart(start); setRangeEnd(end);
    } else if (key === "lastMonth") {
      const lastMonthKey = getPreviousMonthKeyFromMonthKey(currentMonthKey);
      const { start, end } = getMonthRange(lastMonthKey);
      setRangeStart(start); setRangeEnd(end);
    }
  };

  const handleRangeChange = (setter: (v: string) => void, value: string) => {
    setPreset("custom");
    setter(value);
  };

  // ── Computed values ────────────────────────────────────────────────────────
  const revenueByMethod    = useMemo(() => report.revenue_by_method || {}, [report]);
  const expensesByCategory = useMemo(() => ({ ...emptySnapshot().expenses_by_category, ...report.expenses_by_category }), [report]);
  const totalRevenue  = useMemo(() => Object.values(revenueByMethod).reduce((s, v) => s + v, 0), [revenueByMethod]);
  const totalExpenses = useMemo(() => Object.values(expensesByCategory).reduce((s, v) => s + v, 0), [expensesByCategory]);

  const prevTotalRevenue  = useMemo(() => Object.values(prevReport.revenue_by_method || {}).reduce((s, v) => s + v, 0), [prevReport]);
  const prevTotalExpenses = useMemo(() => Object.values(prevReport.expenses_by_category || {}).reduce((s, v) => s + v, 0), [prevReport]);

  const pctDelta = (curr: number, prev: number): number | null =>
    prev > 0 ? ((curr - prev) / prev) * 100 : null;

  const revDelta  = pctDelta(totalRevenue, prevTotalRevenue);
  const expDelta  = pctDelta(totalExpenses, prevTotalExpenses);
  const profDelta = pctDelta(report.profit, prevReport.profit);
  const occDelta  = pctDelta(report.occupancy_rate, prevReport.occupancy_rate);

  // ── 6-month trend ─────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayStr + 'T00:00:00');
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const { start, end } = getMonthRange(key);
      const rev = payments
        .filter(p => { const date = p.paid_at.slice(0, 10); return date >= start && date <= end; })
        .reduce((s, p) => s + p.amount, 0);
      const exp = expenses
        .filter(e => e.spent_at >= start && e.spent_at <= end)
        .reduce((s, e) => s + e.amount, 0);
      result.push({
        label: d.toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
        revenue: rev, expenses: exp, profit: rev - exp,
      });
    }
    return result;
  }, [payments, expenses, todayStr, locale]);

  // ── Donut chart ───────────────────────────────────────────────────────────
  const methodChartData = useMemo(() =>
    Object.entries(revenueByMethod)
      .filter(([, v]) => v > 0)
      .map(([method, value]) => ({ name: method, value, method })),
    [revenueByMethod]
  );

  // ── Expense category bars ─────────────────────────────────────────────────
  const categoryData = useMemo(() =>
    CATEGORIES
      .map(c => ({ label: t.expenseCategory[c], value: expensesByCategory[c], category: c }))
      .sort((a, b) => b.value - a.value),
    [expensesByCategory, t]
  );
  const maxCategoryValue = useMemo(() => Math.max(...categoryData.map(c => c.value), 1), [categoryData]);

  // ── Room performance (all-time) ───────────────────────────────────────────
  const roomPerformance = useMemo(() => {
    return rooms
      .filter(r => r.active)
      .map(room => {
        const roomStays = stays.filter(s => s.room_id === room.id && s.status !== 'CANCELLED');
        const roomRevenue = payments
          .filter(p => roomStays.some(s => s.id === p.stay_id))
          .reduce((s, p) => s + p.amount, 0);
        const totalNights = roomStays.reduce((s, stay) => s + getNights(stay.check_in_date, stay.check_out_date), 0);
        return { number: room.number, revenue: roomRevenue, nights: totalNights };
      })
      .filter(r => r.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [rooms, stays, payments]);
  const maxRoomRevenue = useMemo(() => Math.max(...roomPerformance.map(r => r.revenue), 1), [roomPerformance]);

  // ── Occupancy heatmap ─────────────────────────────────────────────────────
  const totalRoomsCount = useMemo(() => rooms.filter(r => r.active).length, [rooms]);

  const heatmapData = useMemo(() => {
    if (totalRoomsCount === 0) return [];
    const days = [];
    for (let i = 0; i < rangeDays; i++) {
      const dateStr = shiftDateStr(rangeStart, i);
      const occupied = stays.filter(s =>
        s.status !== 'CANCELLED' &&
        s.check_in_date <= dateStr &&
        s.check_out_date > dateStr
      ).length;
      const pct = (occupied / totalRoomsCount) * 100;
      days.push({ date: dateStr, occupied, pct });
    }
    return days;
  }, [rangeStart, rangeDays, stays, totalRoomsCount]);

  // Group heatmap data by month for calendar view
  const heatmapMonths = useMemo(() => {
    if (heatmapData.length === 0) return [];
    const byMonth: Record<string, typeof heatmapData> = {};
    for (const day of heatmapData) {
      const key = day.date.slice(0, 7); // YYYY-MM
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(day);
    }
    return Object.entries(byMonth).map(([monthKey, days]) => {
      const [y, m] = monthKey.split('-').map(Number);
      const firstDow = (new Date(Date.UTC(y, m - 1, 1)).getDay() + 6) % 7; // Mon=0
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getDate();
      const cells: (typeof heatmapData[0] | null)[] = [
        ...Array(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => {
          const dateStr = `${monthKey}-${String(i + 1).padStart(2, '0')}`;
          return days.find(d => d.date === dateStr) ?? null;
        }),
      ];
      // pad to full weeks
      while (cells.length % 7 !== 0) cells.push(null);
      const weeks: (typeof heatmapData[0] | null)[][] = [];
      for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
      const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      return { monthKey, label, weeks };
    });
  }, [heatmapData, locale]);

  // ── Room type analysis ────────────────────────────────────────────────────
  const roomTypeStats = useMemo(() => {
    const types = [...new Set(rooms.filter(r => r.active).map(r => r.room_type))];
    return types.map(type => {
      const typeRooms = rooms.filter(r => r.room_type === type && r.active);
      const typeRoomIds = new Set(typeRooms.map(r => r.id));
      const typeStays = stays.filter(s =>
        typeRoomIds.has(s.room_id) && s.status !== 'CANCELLED' &&
        s.check_in_date <= rangeEnd && s.check_out_date > rangeStart
      );
      const typeStayIds = new Set(typeStays.map(s => s.id));
      const revenue = payments
        .filter(p => typeStayIds.has(p.stay_id) && p.paid_at.slice(0, 10) >= rangeStart && p.paid_at.slice(0, 10) <= rangeEnd)
        .reduce((sum, p) => sum + p.amount, 0);
      let soldNights = 0;
      for (const s of typeStays) {
        const from = s.check_in_date > rangeStart ? s.check_in_date : rangeStart;
        const to   = s.check_out_date < rangeEnd  ? s.check_out_date : rangeEnd;
        if (from < to) soldNights += daysBetween(from, to);
      }
      const availableNights = typeRooms.length * rangeDays;
      const occupancy = availableNights > 0 ? (soldNights / availableNights) * 100 : 0;
      const adr       = soldNights > 0 ? revenue / soldNights : 0;
      return { type, count: typeRooms.length, revenue, soldNights, availableNights, occupancy, adr };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [rooms, stays, payments, rangeStart, rangeEnd, rangeDays]);

  // ── P&L by month (12 months) ──────────────────────────────────────────────
  const plMonths = useMemo(() => {
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(todayStr + 'T00:00:00');
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const { start, end } = getMonthRange(key);
      const rev = payments
        .filter(p => { const date = p.paid_at.slice(0, 10); return date >= start && date <= end; })
        .reduce((s, p) => s + p.amount, 0);
      const exp = expenses
        .filter(e => e.spent_at >= start && e.spent_at <= end)
        .reduce((s, e) => s + e.amount, 0);
      const profit = rev - exp;
      const margin = rev > 0 ? (profit / rev) * 100 : 0;
      result.push({
        label: d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
        revenue: rev, expenses: exp, profit, margin,
      });
    }
    return result;
  }, [payments, expenses, todayStr, locale]);

  // ── Downtime analysis ─────────────────────────────────────────────────────
  const downtimeAnalysis = useMemo(() => {
    return rooms
      .filter(r => r.active)
      .map(room => {
        const roomStays = stays.filter(s =>
          s.room_id === room.id &&
          s.status !== 'CANCELLED' &&
          s.check_in_date < rangeEnd &&
          s.check_out_date > rangeStart
        );
        let occupiedDays = 0;
        for (const s of roomStays) {
          const from = s.check_in_date > rangeStart ? s.check_in_date : rangeStart;
          const to   = s.check_out_date < rangeEnd   ? s.check_out_date : rangeEnd;
          if (from < to) occupiedDays += daysBetween(from, to);
        }
        const freeDays    = rangeDays - occupiedDays;
        const occupancy   = rangeDays > 0 ? (occupiedDays / rangeDays) * 100 : 0;
        const lostRevenue = freeDays * Number(room.base_price);
        return {
          number: room.number,
          room_type: room.room_type,
          availableDays: rangeDays,
          occupiedDays,
          freeDays,
          occupancy,
          lostRevenue,
        };
      })
      .sort((a, b) => b.lostRevenue - a.lostRevenue);
  }, [rooms, stays, rangeStart, rangeEnd, rangeDays]);

  // ── 30-day forecast ───────────────────────────────────────────────────────
  const forecast = useMemo(() => {
    const end30 = shiftDateStr(todayStr, 29);
    const forecastDays = Array.from({ length: 30 }, (_, i) => {
      const d = shiftDateStr(todayStr, i);
      const booked = stays.filter(s =>
        (s.status === 'BOOKED' || s.status === 'CHECKED_IN') &&
        s.check_in_date <= d && s.check_out_date > d
      ).length;
      return {
        date: d,
        label: new Date(d + 'T12:00:00Z').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
        booked,
        free: Math.max(0, totalRoomsCount - booked),
      };
    });
    const futureStays = stays.filter(s =>
      (s.status === 'BOOKED' || s.status === 'CHECKED_IN') &&
      s.check_out_date > todayStr
    );
    let expectedRevenue = 0;
    for (const s of futureStays) {
      const from = s.check_in_date < todayStr ? todayStr : s.check_in_date;
      const to   = s.check_out_date > end30   ? end30    : s.check_out_date;
      if (from < to) expectedRevenue += daysBetween(from, to) * Number(s.price_per_night);
    }
    return { days: forecastDays, expectedRevenue, count: futureStays.length };
  }, [stays, totalRoomsCount, todayStr, locale]);

  // ── ALOS ──────────────────────────────────────────────────────────────────
  const alos = useMemo(() => {
    const rangeStays = stays.filter(s =>
      s.status !== 'CANCELLED' &&
      s.check_in_date >= rangeStart &&
      s.check_in_date <= rangeEnd
    );
    if (rangeStays.length === 0) return 0;
    return rangeStays.reduce((sum, s) => sum + getNights(s.check_in_date, s.check_out_date), 0) / rangeStays.length;
  }, [stays, rangeStart, rangeEnd]);

  const periods = [
    { key: "today",     label: t.reports.today },
    { key: "last7Days", label: t.reports.last7Days },
    { key: "thisMonth", label: t.reports.thisMonth },
    { key: "lastMonth", label: t.reports.lastMonth },
  ];
  const previousMonthKey = getPreviousMonthKeyFromMonthKey(currentMonthKey);
  const sortedClosings   = [...monthClosings].sort((a, b) => b.month.localeCompare(a.month));

  const handleExportExcel = () => {
    const rows: (string | number)[][] = [
      [t.reports.title],
      [`${t.reports.dateRange}:`, `${rangeStart} — ${rangeEnd}`],
      [],
      [t.reports.revenue, totalRevenue],
      [t.reports.totalExpenses, totalExpenses],
      [t.reports.profit, report.profit],
      [],
      [t.reports.byMethod],
      ...Object.entries(revenueByMethod).map(([m, v]) => [m, v]),
      [],
      [t.reports.byCategory],
      ...CATEGORIES.map(c => [t.expenseCategory[c], expensesByCategory[c]]),
      [],
      [t.reports.occupancy],
      [t.reports.availableNights, report.available_nights],
      [t.reports.soldNights, report.sold_nights],
      [t.reports.occupancyRate, Number(report.occupancy_rate.toFixed(2))],
      ['ALOS (ср. длина проживания)', Number(alos.toFixed(1))],
      [t.reports.adr, Number(report.adr.toFixed(2))],
      [t.reports.revpar, Number(report.revpar.toFixed(2))],
      [],
      ['Типы номеров'],
      ['Тип', 'Кол-во', 'Выручка', 'Ночей продано', 'Занятость %', 'ADR'],
      ...roomTypeStats.map(r => [ROOM_TYPE_LABELS[r.type] || r.type, r.count, r.revenue, r.soldNights, Number(r.occupancy.toFixed(1)), Number(r.adr.toFixed(0))]),
      [],
      ['Топ номеров (всё время)'],
      ...roomPerformance.map(r => [`#${r.number}`, r.revenue, `${r.nights} ночей`]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Report");
    XLSX.writeFile(workbook, `report_${rangeStart}_${rangeEnd}.xlsx`);
  };

  const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'hsl(228,22%,9%)', border: '1px solid hsl(228,16%,14%)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        {label && <p style={{ marginBottom: 4, fontWeight: 600, color: 'hsl(40,28%,92%)' }}>{label}</p>}
        {payload.map((e, i) => (
          <p key={i} style={{ color: e.color, marginBottom: 2 }}>
            {e.name}: {typeof e.value === 'number' && e.name !== 'booked' && e.name !== 'free'
              ? formatCurrency(e.value, locale, t.common.currency)
              : e.value}
          </p>
        ))}
      </div>
    );
  };

  const DeltaBadge = ({ delta }: { delta: number | null }) => {
    if (delta === null) return null;
    const pos = delta >= 0;
    return (
      <span className={`flex items-center gap-0.5 text-xs font-medium ${pos ? 'text-green-500' : 'text-red-500'}`}>
        {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(delta).toFixed(1)}%
      </span>
    );
  };

  const DOW_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.reports.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{rangeStart} — {rangeEnd}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Input type="date" value={rangeStart} onChange={(e) => handleRangeChange(setRangeStart, e.target.value)} className="w-36 h-8 text-xs" />
            <span className="text-muted-foreground text-xs">—</span>
            <Input type="date" value={rangeEnd}   onChange={(e) => handleRangeChange(setRangeEnd, e.target.value)}   className="w-36 h-8 text-xs" />
          </div>
          <div className="flex gap-0.5 rounded-lg border bg-muted/50 p-0.5">
            {periods.map((p) => (
              <Button key={p.key} variant={preset === p.key ? "secondary" : "ghost"} size="sm" className="text-xs h-7 px-2.5" onClick={() => applyPreset(p.key)}>
                {p.label}
              </Button>
            ))}
          </div>
          {isAdmin && (
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={closePreviousMonth} disabled={isMonthClosed(previousMonthKey)}>
              <Lock className="h-3.5 w-3.5" />
              {t.reports.closePreviousMonth}
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleExportExcel}>
            <FileDown className="h-3.5 w-3.5" />
            {t.reports.exportExcel}
          </Button>
        </div>
      </div>

      {/* KPI Cards with comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.reports.revenue,      value: totalRevenue,          delta: revDelta,  color: 'text-success',     fmt: true },
          { label: t.reports.totalExpenses,value: totalExpenses,         delta: expDelta,  color: 'text-destructive', fmt: true },
          { label: t.reports.profit,       value: report.profit,         delta: profDelta, color: report.profit >= 0 ? 'text-success' : 'text-destructive', fmt: true },
          { label: t.reports.occupancyRate,value: report.occupancy_rate, delta: occDelta,  color: '', fmt: false },
        ].map((card, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>
                {card.fmt
                  ? formatCurrency(card.value, locale, t.common.currency)
                  : `${(card.value as number).toFixed(1)}%`}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <DeltaBadge delta={card.delta} />
                {card.delta !== null && (
                  <span className="text-[10px] text-muted-foreground">vs предыдущий период</span>
                )}
              </div>
              {i === 3 && (
                <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(report.occupancy_rate, 100)}%`, background: GOLD }} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* P&L by Month */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">P&L по месяцам — последние 12 месяцев</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Месяц</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Выручка</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Расходы</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Прибыль</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Маржа</th>
                </tr>
              </thead>
              <tbody>
                {plMonths.map((row, i) => (
                  <tr key={i} className={`border-b border-border/30 transition-colors hover:bg-muted/20 ${row.profit < 0 ? 'bg-destructive/5' : ''}`}>
                    <td className="px-4 py-2.5 font-medium capitalize">{row.label}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-success">{formatCurrency(row.revenue, locale, t.common.currency)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-destructive">{formatCurrency(row.expenses, locale, t.common.currency)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${row.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(row.profit, locale, t.common.currency)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${row.margin >= 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                      {row.revenue > 0 ? `${row.margin.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 1: Trend + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Тренд за 6 месяцев</CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: GOLD }} />Выручка</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: RED }} />Расходы</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={GOLD} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={RED} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={RED} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228,16%,14%)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} width={38} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue"  name="Выручка" stroke={GOLD} strokeWidth={2} fill="url(#gradRevenue)"  dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="expenses" name="Расходы" stroke={RED}  strokeWidth={2} fill="url(#gradExpenses)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t.reports.byMethod}</CardTitle>
          </CardHeader>
          <CardContent>
            {methodChartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">{t.common.noData}</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={methodChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                      {methodChartData.map((entry, i) => (
                        <Cell key={entry.method} fill={METHOD_PALETTE[i % METHOD_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value, locale, t.common.currency)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {methodChartData.map((entry, i) => (
                    <div key={entry.method} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: METHOD_PALETTE[i % METHOD_PALETTE.length] }} />
                        {entry.name}
                      </span>
                      <span className="font-medium">{formatCurrency(entry.value, locale, t.common.currency)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Calendar Heatmap */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Календарь занятости</CardTitle>
        </CardHeader>
        <CardContent>
          {heatmapMonths.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.common.noData}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {heatmapMonths.map(({ monthKey, label, weeks }) => (
                <div key={monthKey}>
                  <p className="text-xs font-semibold text-foreground mb-2 capitalize">{label}</p>
                  <div className="w-full">
                    {/* DOW header */}
                    <div className="grid grid-cols-7 mb-1">
                      {DOW_LABELS.map(d => (
                        <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-0.5">{d}</div>
                      ))}
                    </div>
                    {/* Weeks */}
                    {weeks.map((week, wi) => (
                      <div key={wi} className="grid grid-cols-7 gap-0.5 mb-0.5">
                        {week.map((day, di) => day ? (
                          <div
                            key={day.date}
                            className="rounded-md flex flex-col items-center justify-center py-1.5 cursor-default transition-opacity hover:opacity-80"
                            style={{ background: heatColor(day.pct) }}
                            title={`${day.date}: ${day.occupied}/${totalRoomsCount} (${day.pct.toFixed(0)}%)`}
                          >
                            <span className="text-[11px] font-semibold leading-none" style={{ color: day.pct > 30 ? 'rgba(255,255,255,0.9)' : 'hsl(220,15%,65%)' }}>
                              {parseInt(day.date.slice(8))}
                            </span>
                            <span className="text-[9px] leading-none mt-0.5" style={{ color: day.pct > 30 ? 'rgba(255,255,255,0.65)' : 'hsl(220,15%,50%)' }}>
                              {day.pct.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <div key={`pad-${wi}-${di}`} className="rounded-md py-1.5" style={{ background: 'transparent' }} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {heatmapMonths.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-border/50">
              <span className="text-xs text-muted-foreground font-medium">Занятость:</span>
              {[
                { label: 'Нет гостей', pct: 0 },
                { label: 'До 25%', pct: 10 },
                { label: '25–50%', pct: 35 },
                { label: '50–75%', pct: 60 },
                { label: '75–90%', pct: 80 },
                { label: 'Более 90%', pct: 95 },
              ].map(item => (
                <span key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-sm shrink-0" style={{ background: heatColor(item.pct) }} />
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Type Analysis */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <BedDouble className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Анализ по типам номеров</CardTitle>
        </CardHeader>
        <CardContent>
          {roomTypeStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.common.noData}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {roomTypeStats.map(rt => {
                const color = ROOM_TYPE_COLORS[rt.type] || MUTED;
                return (
                  <div key={rt.type} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        <span className="text-sm font-semibold">{ROOM_TYPE_LABELS[rt.type] || rt.type}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5">{rt.count} ном.</Badge>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Выручка</span>
                        <span className="font-medium">{formatCurrency(rt.revenue, locale, t.common.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Занятость</span>
                        <span className="font-medium">{rt.occupancy.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ADR</span>
                        <span className="font-medium">{formatCurrency(Math.round(rt.adr), locale, t.common.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ночей продано</span>
                        <span className="font-medium">{rt.soldNights}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(rt.occupancy, 100)}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Downtime Analysis */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <BedDouble className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Анализ простоев номеров</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Номер</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Тип</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Доступно дней</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Занято</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Простой</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Загрузка</th>
                  <th className="text-right px-4 py-2.5 text-muted-foreground font-medium uppercase tracking-wider">Упущено выручки</th>
                </tr>
              </thead>
              <tbody>
                {downtimeAnalysis.map((row) => (
                  <tr key={row.number} className="border-b border-border/30 transition-colors hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">№ {row.number}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{ROOM_TYPE_LABELS[row.room_type] || row.room_type}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.availableDays}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-success">{row.occupiedDays}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-destructive">{row.freeDays}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={row.occupancy >= 70 ? 'text-success' : row.occupancy >= 40 ? 'text-amber-500' : 'text-destructive'}>
                        {row.occupancy.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-destructive">
                      {formatCurrency(row.lostRevenue, locale, t.common.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 2: Expenses + Room performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t.reports.byCategory}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryData.map(item => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[item.category as ExpenseCategory] }} />
                    {item.label}
                  </span>
                  <span className="font-medium tabular-nums">{formatCurrency(item.value, locale, t.common.currency)}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / maxCategoryValue) * 100}%`, background: CATEGORY_COLORS[item.category as ExpenseCategory] }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <BedDouble className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Топ номеров — выручка (всё время)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {roomPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.common.noData}</p>
            ) : (
              roomPerformance.map((room, idx) => (
                <div key={room.number} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'gradient-gold text-white' : 'bg-muted text-muted-foreground'}`}>
                        {idx + 1}
                      </span>
                      <span className="font-medium">№ {room.number}</span>
                      <span className="text-muted-foreground">{room.nights} ночей</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatCurrency(room.revenue, locale, t.common.currency)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(room.revenue / maxRoomRevenue) * 100}%`, background: idx === 0 ? GOLD : `hsl(38, 72%, ${30 + (10 - idx) * 3}%)` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 30-day Forecast */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Telescope className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Прогноз на 30 дней</CardTitle>
          </div>
          <div className="flex gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Ожидаемая выручка</p>
              <p className="font-bold text-base" style={{ color: GOLD }}>{formatCurrency(forecast.expectedRevenue, locale, t.common.currency)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Активных броней</p>
              <p className="font-bold text-base">{forecast.count}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={forecast.days} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228,16%,14%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, totalRoomsCount]} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const booked = payload.find(p => p.dataKey === 'booked')?.value ?? 0;
                  return (
                    <div style={{ background: 'hsl(228,22%,9%)', border: '1px solid hsl(228,16%,14%)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                      <p style={{ color: 'hsl(40,28%,92%)', marginBottom: 4 }}>{label}</p>
                      <p style={{ color: GOLD }}>Занято: {booked} из {totalRoomsCount}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="booked" name="Занято" fill={GOLD} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Occupancy Details */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{t.reports.occupancy}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            {[
              { label: t.reports.availableNights, value: report.available_nights, suffix: '' },
              { label: t.reports.soldNights,      value: report.sold_nights,      suffix: '' },
              { label: t.reports.occupancyRate,   value: report.occupancy_rate.toFixed(1), suffix: '%' },
              { label: 'ALOS (ср. пребывание)',   value: alos.toFixed(1), suffix: ' ночей' },
              { label: t.reports.adr,    value: formatCurrency(Math.round(report.adr), locale, t.common.currency), suffix: '' },
              { label: t.reports.revpar, value: formatCurrency(Math.round(report.revpar), locale, t.common.currency), suffix: '' },
            ].map((item, i) => (
              <div key={i}>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p className="text-xl font-bold mt-1">{item.value}{item.suffix}</p>
              </div>
            ))}
          </div>
          {reportLoading && <p className="text-xs text-muted-foreground mt-3">{t.common.loading}</p>}
        </CardContent>
      </Card>

      {/* Month Closings */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{t.reports.monthClosings}</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedClosings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.reports.noClosings}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedClosings.map((closing) => {
                const profit = closing.totals_json?.profit || 0;
                return (
                  <div key={closing.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-sm font-semibold">{closing.month}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(profit, locale, t.common.currency)}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{closing.totals_json?.occupancy_rate?.toFixed(1) || "0"}% загр.</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => reopenMonth(closing.month)}>
                        <Unlock className="h-3 w-3" />
                        {t.reports.reopenMonth}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {isMonthClosed(previousMonthKey) && (
            <Badge variant="outline" className="mt-3 text-xs text-muted-foreground">{t.reports.alreadyClosed}</Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
