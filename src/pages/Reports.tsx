import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, getMonthKey, getMonthRange, getPreviousMonthKey, dateStr } from "@/lib/format";
import { ExpenseCategory, PaymentMethod, TotalsSnapshot } from "@/types";
import { apiFetch } from "@/lib/api";
import * as XLSX from "xlsx";

const METHODS: PaymentMethod[] = ["CASH", "CARD", "PAYME", "CLICK"];
const CATEGORIES: ExpenseCategory[] = ["SALARY", "INVENTORY", "UTILITIES", "REPAIR", "MARKETING", "OTHER"];

const emptySnapshot = (): TotalsSnapshot => ({
  revenue_by_method: METHODS.reduce((acc, method) => {
    acc[method] = 0;
    return acc;
  }, {} as Record<PaymentMethod, number>),
  expenses_by_category: CATEGORIES.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {} as Record<ExpenseCategory, number>),
  profit: 0,
  occupancy_rate: 0,
  adr: 0,
  revpar: 0,
  sold_nights: 0,
  available_nights: 0,
  total_room_revenue: 0,
});

const Reports = () => {
  const { t, language } = useLanguage();
  const { monthClosings, closePreviousMonth, reopenMonth, isMonthClosed } = useData();
  const { isAdmin } = useAuth();
  const locale = language === "uz" ? "uz-UZ" : "ru-RU";

  const today = new Date();
  const todayStr = dateStr(today);
  const [preset, setPreset] = useState("thisMonth");
  const currentMonthKey = getMonthKey(today);
  const [rangeStart, setRangeStart] = useState(() => getMonthRange(currentMonthKey).start);
  const [rangeEnd, setRangeEnd] = useState(() => getMonthRange(currentMonthKey).end);

  const [report, setReport] = useState<TotalsSnapshot>(emptySnapshot());
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setReportLoading(true);
    apiFetch<TotalsSnapshot>(`/reports?from=${rangeStart}&to=${rangeEnd}`)
      .then((data) => {
        if (!active) return;
        setReport({
          ...emptySnapshot(),
          ...data,
          revenue_by_method: { ...emptySnapshot().revenue_by_method, ...data.revenue_by_method },
          expenses_by_category: { ...emptySnapshot().expenses_by_category, ...data.expenses_by_category },
        });
      })
      .catch(() => {
        if (!active) return;
        setReport(emptySnapshot());
      })
      .finally(() => {
        if (active) setReportLoading(false);
      });

    return () => {
      active = false;
    };
  }, [rangeStart, rangeEnd]);

  const applyPreset = (key: string) => {
    setPreset(key);
    if (key === "today") {
      setRangeStart(todayStr);
      setRangeEnd(todayStr);
    } else if (key === "last7Days") {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      setRangeStart(dateStr(start));
      setRangeEnd(todayStr);
    } else if (key === "thisMonth") {
      const { start, end } = getMonthRange(currentMonthKey);
      setRangeStart(start);
      setRangeEnd(end);
    } else if (key === "lastMonth") {
      const lastMonthKey = getPreviousMonthKey(today);
      const { start, end } = getMonthRange(lastMonthKey);
      setRangeStart(start);
      setRangeEnd(end);
    }
  };

  const handleRangeChange = (setter: (value: string) => void, value: string) => {
    setPreset("custom");
    setter(value);
  };

  const revenueByMethod = useMemo(() => ({ ...emptySnapshot().revenue_by_method, ...report.revenue_by_method }), [report]);
  const expensesByCategory = useMemo(() => ({ ...emptySnapshot().expenses_by_category, ...report.expenses_by_category }), [report]);

  const totalRevenue = useMemo(() => Object.values(revenueByMethod).reduce((s, v) => s + v, 0), [revenueByMethod]);
  const totalExpenses = useMemo(() => Object.values(expensesByCategory).reduce((s, v) => s + v, 0), [expensesByCategory]);

  const periods = [
    { key: "today", label: t.reports.today },
    { key: "last7Days", label: t.reports.last7Days },
    { key: "thisMonth", label: t.reports.thisMonth },
    { key: "lastMonth", label: t.reports.lastMonth },
  ];

  const previousMonthKey = getPreviousMonthKey(today);

  const sortedClosings = [...monthClosings].sort((a, b) => b.month.localeCompare(a.month));

  const handleExportExcel = () => {
    const rows: (string | number)[][] = [
      [t.reports.title],
      [`${t.reports.dateRange}:`, `${rangeStart} - ${rangeEnd}`],
      [],
      [t.reports.revenue, totalRevenue],
      [t.reports.totalExpenses, totalExpenses],
      [t.reports.profit, report.profit],
      [],
      [t.reports.byMethod],
      ...METHODS.map((method) => [t.paymentMethod[method], revenueByMethod[method]]),
      [],
      [t.reports.byCategory],
      ...CATEGORIES.map((category) => [t.expenseCategory[category], expensesByCategory[category]]),
      [],
      [t.reports.occupancy],
      [t.reports.availableNights, report.available_nights],
      [t.reports.soldNights, report.sold_nights],
      [t.reports.occupancyRate, Number(report.occupancy_rate.toFixed(2))],
      [t.reports.adr, Number(report.adr.toFixed(2))],
      [t.reports.revpar, Number(report.revpar.toFixed(2))],
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Report");
    const fileName = `report_${rangeStart}_${rangeEnd}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t.reports.title}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t.reports.dateRange}</span>
            <Input type="date" value={rangeStart} onChange={(e) => handleRangeChange(setRangeStart, e.target.value)} />
            <span className="text-muted-foreground">—</span>
            <Input type="date" value={rangeEnd} onChange={(e) => handleRangeChange(setRangeEnd, e.target.value)} />
          </div>
          <div className="flex gap-1 rounded-md border bg-muted/50 p-0.5">
            {periods.map((p) => (
              <Button
                key={p.key}
                variant={preset === p.key ? "secondary" : "ghost"}
                size="sm"
                className="text-xs h-7"
                onClick={() => applyPreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={closePreviousMonth} disabled={isMonthClosed(previousMonthKey)}>
              {t.reports.closePreviousMonth}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleExportExcel}>
            {t.reports.exportExcel}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t.reports.revenue}</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenue, locale, t.common.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t.reports.totalExpenses}</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses, locale, t.common.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t.reports.profit}</p>
            <p className={`text-2xl font-bold ${report.profit >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(report.profit, locale, t.common.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle>{t.reports.byMethod}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {METHODS.map((method) => (
              <div key={method} className="flex items-center justify-between">
                <span className="text-sm">{t.paymentMethod[method]}</span>
                <span className="font-medium">{formatCurrency(revenueByMethod[method], locale, t.common.currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>{t.reports.byCategory}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {CATEGORIES.map((category) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm">{t.expenseCategory[category]}</span>
                <span className="font-medium">{formatCurrency(expensesByCategory[category], locale, t.common.currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle>{t.reports.occupancy}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t.reports.availableNights}</p>
              <p className="text-xl font-bold">{report.available_nights}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.reports.soldNights}</p>
              <p className="text-xl font-bold">{report.sold_nights}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.reports.occupancyRate}</p>
              <p className="text-xl font-bold">{report.occupancy_rate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.reports.adr}</p>
              <p className="text-xl font-bold">{formatCurrency(Math.round(report.adr), locale, t.common.currency)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.reports.revpar}</p>
              <p className="text-xl font-bold">{formatCurrency(Math.round(report.revpar), locale, t.common.currency)}</p>
            </div>
          </div>
          {reportLoading && (
            <p className="text-xs text-muted-foreground mt-3">{t.common.loading}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle>{t.reports.monthClosings}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sortedClosings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.reports.noClosings}</p>
          ) : (
            sortedClosings.map((closing) => (
              <div key={closing.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{closing.month}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(closing.totals_json?.profit || 0, locale, t.common.currency)} · {closing.totals_json?.occupancy_rate?.toFixed(1) || "0"}%
                  </p>
                </div>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => reopenMonth(closing.month)}>
                    {t.reports.reopenMonth}
                  </Button>
                )}
              </div>
            ))
          )}
          {isMonthClosed(previousMonthKey) && (
            <p className="text-xs text-muted-foreground">{t.reports.alreadyClosed}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
