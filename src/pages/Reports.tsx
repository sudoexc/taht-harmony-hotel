import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency, getMonthKey, getMonthRange, getPreviousMonthKeyFromMonthKey, getTodayInTimeZone, shiftDateStr, getNights } from "@/lib/format";
import { ExpenseCategory, PaymentMethod, TotalsSnapshot } from "@/types";
import { apiFetch } from "@/lib/api";
import * as XLSX from "xlsx";
import { TrendingUp, FileDown, Lock, Unlock, BedDouble } from "lucide-react";

const METHODS: PaymentMethod[] = ["CASH", "CARD", "PAYME", "CLICK"];
const CATEGORIES: ExpenseCategory[] = ["SALARY", "INVENTORY", "UTILITIES", "REPAIR", "MARKETING", "OTHER"];

const GOLD   = 'hsl(38, 72%, 55%)';
const GREEN  = 'hsl(145, 55%, 40%)';
const RED    = 'hsl(0, 63%, 42%)';
const BLUE   = 'hsl(217, 75%, 58%)';
const PURPLE = 'hsl(280, 60%, 55%)';
const ORANGE = 'hsl(25, 90%, 55%)';
const MUTED  = 'hsl(220, 10%, 48%)';

const METHOD_COLORS: Record<PaymentMethod, string> = {
  CASH: GREEN, CARD: BLUE, PAYME: GOLD, CLICK: PURPLE,
};
const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  SALARY: BLUE, INVENTORY: GOLD, UTILITIES: ORANGE, REPAIR: RED, MARKETING: PURPLE, OTHER: MUTED,
};

const emptySnapshot = (): TotalsSnapshot => ({
  revenue_by_method: METHODS.reduce((acc, m) => { acc[m] = 0; return acc; }, {} as Record<PaymentMethod, number>),
  expenses_by_category: CATEGORIES.reduce((acc, c) => { acc[c] = 0; return acc; }, {} as Record<ExpenseCategory, number>),
  profit: 0, occupancy_rate: 0, adr: 0, revpar: 0, sold_nights: 0, available_nights: 0, total_room_revenue: 0,
});

const Reports = () => {
  const { t, language } = useLanguage();
  const { monthClosings, closePreviousMonth, reopenMonth, isMonthClosed, hotel, payments, expenses, rooms, stays } = useData();
  const { isAdmin } = useAuth();
  const locale = language === "uz" ? "uz-UZ" : "ru-RU";

  const todayStr = getTodayInTimeZone(hotel.timezone);
  const [preset, setPreset] = useState("thisMonth");
  const currentMonthKey = getMonthKey(todayStr);
  const [rangeStart, setRangeStart] = useState(() => getMonthRange(currentMonthKey).start);
  const [rangeEnd, setRangeEnd]   = useState(() => getMonthRange(currentMonthKey).end);
  const [report, setReport]       = useState<TotalsSnapshot>(emptySnapshot());
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setReportLoading(true);
    apiFetch<TotalsSnapshot>(`/reports?from=${rangeStart}&to=${rangeEnd}`)
      .then((data) => {
        if (!active) return;
        setReport({
          ...emptySnapshot(), ...data,
          revenue_by_method:     { ...emptySnapshot().revenue_by_method,     ...data.revenue_by_method },
          expenses_by_category:  { ...emptySnapshot().expenses_by_category,  ...data.expenses_by_category },
        });
      })
      .catch(() => { if (!active) return; setReport(emptySnapshot()); })
      .finally(() => { if (active) setReportLoading(false); });
    return () => { active = false; };
  }, [rangeStart, rangeEnd]);

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

  const revenueByMethod    = useMemo(() => ({ ...emptySnapshot().revenue_by_method,    ...report.revenue_by_method }),    [report]);
  const expensesByCategory = useMemo(() => ({ ...emptySnapshot().expenses_by_category, ...report.expenses_by_category }), [report]);
  const totalRevenue  = useMemo(() => Object.values(revenueByMethod).reduce((s, v) => s + v, 0),    [revenueByMethod]);
  const totalExpenses = useMemo(() => Object.values(expensesByCategory).reduce((s, v) => s + v, 0), [expensesByCategory]);

  // 6-month trend from local data
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
        revenue: rev,
        expenses: exp,
        profit: rev - exp,
      });
    }
    return result;
  }, [payments, expenses, todayStr, locale]);

  // Donut chart data (revenue by method for selected range)
  const methodChartData = useMemo(() =>
    METHODS.map(m => ({ name: t.paymentMethod[m], value: revenueByMethod[m], method: m }))
      .filter(d => d.value > 0),
    [revenueByMethod, t]
  );

  // Expenses category bars (sorted)
  const categoryData = useMemo(() =>
    CATEGORIES
      .map(c => ({ label: t.expenseCategory[c], value: expensesByCategory[c], category: c }))
      .sort((a, b) => b.value - a.value),
    [expensesByCategory, t]
  );
  const maxCategoryValue = useMemo(() => Math.max(...categoryData.map(c => c.value), 1), [categoryData]);

  // Room performance (all-time, top 10)
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
      ...METHODS.map(m => [t.paymentMethod[m], revenueByMethod[m]]),
      [],
      [t.reports.byCategory],
      ...CATEGORIES.map(c => [t.expenseCategory[c], expensesByCategory[c]]),
      [],
      [t.reports.occupancy],
      [t.reports.availableNights, report.available_nights],
      [t.reports.soldNights, report.sold_nights],
      [t.reports.occupancyRate, Number(report.occupancy_rate.toFixed(2))],
      [t.reports.adr, Number(report.adr.toFixed(2))],
      [t.reports.revpar, Number(report.revpar.toFixed(2))],
      [],
      ['Топ номеров (всё время)'],
      ...roomPerformance.map(r => [`#${r.number}`, r.revenue, `${r.nights} ночей`]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Report");
    XLSX.writeFile(workbook, `report_${rangeStart}_${rangeEnd}.xlsx`);
  };

  // Chart tooltip component (inline to access locale/t)
  const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'hsl(228,22%,9%)', border: '1px solid hsl(228,16%,14%)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        {label && <p style={{ marginBottom: 4, fontWeight: 600, color: 'hsl(40,28%,92%)' }}>{label}</p>}
        {payload.map((e, i) => (
          <p key={i} style={{ color: e.color, marginBottom: 2 }}>
            {e.name}: {formatCurrency(e.value, locale, t.common.currency)}
          </p>
        ))}
      </div>
    );
  };

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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.reports.revenue}</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenue, locale, t.common.currency)}</p>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-success" />
              {t.reports.byMethod}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.reports.totalExpenses}</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses, locale, t.common.currency)}</p>
            <div className="mt-2 text-xs text-muted-foreground">{t.reports.byCategory}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.reports.profit}</p>
            <p className={`text-2xl font-bold ${report.profit >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(report.profit, locale, t.common.currency)}
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              {totalRevenue > 0 ? `${Math.round((report.profit / totalRevenue) * 100)}% маржа` : '—'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.reports.occupancyRate}</p>
            <p className="text-2xl font-bold">{report.occupancy_rate.toFixed(1)}%</p>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(report.occupancy_rate, 100)}%`, background: GOLD }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Trend + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 6-month Area Chart */}
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
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} width={38} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue"  name="Выручка" stroke={GOLD} strokeWidth={2} fill="url(#gradRevenue)"  dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="expenses" name="Расходы" stroke={RED}  strokeWidth={2} fill="url(#gradExpenses)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut chart: Revenue by method */}
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
                    <Pie
                      data={methodChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {methodChartData.map((entry) => (
                        <Cell key={entry.method} fill={METHOD_COLORS[entry.method as PaymentMethod]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value, locale, t.common.currency)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {methodChartData.map(entry => (
                    <div key={entry.method} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: METHOD_COLORS[entry.method as PaymentMethod] }} />
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

      {/* Charts Row 2: Expenses breakdown + Room performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expenses by category */}
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
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(item.value / maxCategoryValue) * 100}%`, background: CATEGORY_COLORS[item.category as ExpenseCategory] }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Room performance */}
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
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(room.revenue / maxRoomRevenue) * 100}%`,
                        background: idx === 0 ? GOLD : `hsl(38, 72%, ${30 + (10 - idx) * 3}%)`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Occupancy Details */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{t.reports.occupancy}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { label: t.reports.availableNights, value: report.available_nights, suffix: '' },
              { label: t.reports.soldNights,      value: report.sold_nights,      suffix: '' },
              { label: t.reports.occupancyRate,   value: report.occupancy_rate.toFixed(1), suffix: '%' },
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
