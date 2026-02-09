import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockRooms, mockStays, mockPayments, mockExpenses } from "@/data/mockData";
import { formatCurrency, getNights, getStayTotal } from "@/lib/format";
import { PaymentMethod, ExpenseCategory } from "@/types";

const Reports = () => {
  const { t } = useLanguage();
  const [period, setPeriod] = useState('thisMonth');

  const totalRevenue = mockPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = mockExpenses.reduce((s, e) => s + e.amount, 0);
  const profit = totalRevenue - totalExpenses;

  const byMethod: { method: PaymentMethod; amount: number }[] = (['CASH', 'CARD', 'PAYME', 'CLICK'] as const).map(method => ({
    method,
    amount: mockPayments.filter(p => p.method === method).reduce((s, p) => s + p.amount, 0),
  }));

  const byCategory: { category: ExpenseCategory; amount: number }[] = (['SALARY', 'INVENTORY', 'UTILITIES', 'REPAIR', 'MARKETING', 'OTHER'] as const)
    .map(cat => ({
      category: cat,
      amount: mockExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
    }))
    .filter(c => c.amount > 0);

  const activeRooms = mockRooms.filter(r => r.active).length;
  const daysInPeriod = 30;
  const availableNights = activeRooms * daysInPeriod;
  const soldNights = mockStays
    .filter(s => ['CHECKED_IN', 'CHECKED_OUT'].includes(s.status))
    .reduce((s, stay) => s + getNights(stay.check_in_date, stay.check_out_date), 0);
  const occupancyRate = availableNights > 0 ? ((soldNights / availableNights) * 100).toFixed(1) : '0';
  const adr = soldNights > 0 ? totalRevenue / soldNights : 0;
  const revpar = availableNights > 0 ? totalRevenue / availableNights : 0;

  const periods = [
    { key: 'today', label: t.reports.today },
    { key: 'last7Days', label: t.reports.last7Days },
    { key: 'thisMonth', label: t.reports.thisMonth },
    { key: 'lastMonth', label: t.reports.lastMonth },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t.reports.title}</h1>
        <div className="flex gap-1 rounded-md border bg-muted/50 p-0.5">
          {periods.map(p => (
            <Button
              key={p.key}
              variant={period === p.key ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t.reports.revenue}</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t.reports.totalExpenses}</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t.reports.profit}</p>
            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle>{t.reports.byMethod}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {byMethod.map(({ method, amount }) => (
              <div key={method} className="flex items-center justify-between">
                <span className="text-sm">{t.paymentMethod[method]}</span>
                <span className="font-medium">{formatCurrency(amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>{t.reports.byCategory}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {byCategory.map(({ category, amount }) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm">{t.expenseCategory[category]}</span>
                <span className="font-medium">{formatCurrency(amount)}</span>
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
              <p className="text-xl font-bold">{availableNights}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.reports.soldNights}</p>
              <p className="text-xl font-bold">{soldNights}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.reports.occupancyRate}</p>
              <p className="text-xl font-bold">{occupancyRate}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.reports.adr}</p>
              <p className="text-xl font-bold">{formatCurrency(Math.round(adr))}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.reports.revpar}</p>
              <p className="text-xl font-bold">{formatCurrency(Math.round(revpar))}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
