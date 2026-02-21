import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, BedDouble, DoorOpen, Plus, TrendingUp, AlertCircle, Wallet } from "lucide-react";
import { formatCurrency, formatDate, getMonthKey, getMonthRange, getStayTotal, getTodayInTimeZone } from "@/lib/format";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { t, language } = useLanguage();
  const { rooms, stays, payments, expenses, hotel } = useData();
  const navigate = useNavigate();
  const todayStr = getTodayInTimeZone(hotel.timezone);
  const currentMonthKey = getMonthKey(todayStr);
  const { start: monthStart, end: monthEnd } = getMonthRange(currentMonthKey);

  // This month revenue
  const thisMonthRevenue = useMemo(() =>
    payments
      .filter(p => { const d = p.paid_at.slice(0, 10); return d >= monthStart && d <= monthEnd; })
      .reduce((s, p) => s + p.amount, 0),
    [payments, monthStart, monthEnd]
  );

  // This month expenses
  const thisMonthExpenses = useMemo(() =>
    expenses
      .filter(e => e.spent_at >= monthStart && e.spent_at <= monthEnd)
      .reduce((s, e) => s + e.amount, 0),
    [expenses, monthStart, monthEnd]
  );

  // Outstanding dues (all active/booked stays)
  const totalOutstanding = useMemo(() =>
    stays
      .filter(s => s.status === 'CHECKED_IN' || s.status === 'BOOKED')
      .reduce((sum, stay) => {
        const total = getStayTotal(stay);
        const paid = payments.filter(p => p.stay_id === stay.id).reduce((s, p) => s + p.amount, 0);
        return sum + Math.max(0, total - paid);
      }, 0),
    [stays, payments]
  );
  const locale = language === 'uz' ? 'uz-UZ' : 'ru-RU';

  const todayCheckIns = stays.filter(s => s.check_in_date === todayStr && s.status !== 'CANCELLED');
  const todayCheckOuts = stays.filter(s => s.check_out_date === todayStr && s.status !== 'CANCELLED' && s.status !== 'CHECKED_OUT');

  const occupiedRoomIds = new Set(
    stays
      .filter(s => s.check_in_date <= todayStr && s.check_out_date > todayStr && s.status !== 'CANCELLED')
      .map(s => s.room_id)
  );

  const activeRooms = rooms.filter(r => r.active);

  const getRoomStatus = (roomId: string) => {
    if (todayCheckOuts.some(s => s.room_id === roomId)) return 'checkOutToday';
    if (todayCheckIns.some(s => s.room_id === roomId)) return 'checkInToday';
    if (occupiedRoomIds.has(roomId)) return 'occupied';
    return 'free';
  };

  const statusColors: Record<string, string> = {
    free: 'bg-success/15 text-success border-success/30',
    occupied: 'bg-primary/15 text-primary border-primary/30',
    checkOutToday: 'bg-destructive/15 text-destructive border-destructive/30',
    checkInToday: 'bg-info/15 text-info border-info/30',
  };

  const stayStatusColors: Record<string, string> = {
    BOOKED: 'bg-info/15 text-info',
    CHECKED_IN: 'bg-success/15 text-success',
    CHECKED_OUT: 'bg-muted text-muted-foreground',
    CANCELLED: 'bg-destructive/15 text-destructive',
  };

  const getStayPaid = (stayId: string) =>
    payments.filter(p => p.stay_id === stayId).reduce((s, p) => s + p.amount, 0);

  const stats = [
    { label: t.dashboard.checkInsToday, value: todayCheckIns.length, icon: LogIn, accent: 'text-info', bg: 'bg-info/10 border-info/20' },
    { label: t.dashboard.checkOutsToday, value: todayCheckOuts.length, icon: LogOut, accent: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
    { label: t.dashboard.occupiedRooms, value: occupiedRoomIds.size, icon: BedDouble, accent: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
    { label: t.dashboard.availableRooms, value: activeRooms.length - occupiedRoomIds.size, icon: DoorOpen, accent: 'text-success', bg: 'bg-success/10 border-success/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.dashboard.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t.dashboard.today}: {formatDate(todayStr, locale)}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gradient-gold text-white border-0 hover:opacity-90 glow-gold-sm" onClick={() => navigate('/stays')}>
            <Plus className="mr-1 h-4 w-4" />{t.dashboard.addStay}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/payments')}>
            <Plus className="mr-1 h-4 w-4" />{t.dashboard.addPayment}
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/expenses')}>
            <Plus className="mr-1 h-4 w-4" />{t.dashboard.addExpense}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-border/50 hover:border-border transition-colors">
            <CardContent className="p-5">
              <div className={`inline-flex p-2.5 rounded-xl border mb-3 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.accent}`} />
              </div>
              <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Finance summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.dashboard.monthRevenue}</p>
              <div className="p-1.5 rounded-lg bg-success/10 border border-success/20">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              </div>
            </div>
            <p className="text-xl font-bold text-success">{formatCurrency(thisMonthRevenue, locale, t.common.currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">{currentMonthKey}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.dashboard.monthExpenses}</p>
              <div className="p-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <Wallet className="h-3.5 w-3.5 text-destructive" />
              </div>
            </div>
            <p className="text-xl font-bold text-destructive">{formatCurrency(thisMonthExpenses, locale, t.common.currency)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.dashboard.profit}: <span className={thisMonthRevenue - thisMonthExpenses >= 0 ? 'text-success' : 'text-destructive'}>
                {formatCurrency(thisMonthRevenue - thisMonthExpenses, locale, t.common.currency)}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className={`border-border/50 ${totalOutstanding > 0 ? 'border-warning/30' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.dashboard.debt}</p>
              <div className={`p-1.5 rounded-lg ${totalOutstanding > 0 ? 'bg-warning/10 border border-warning/20' : 'bg-muted border border-border'}`}>
                <AlertCircle className={`h-3.5 w-3.5 ${totalOutstanding > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
              </div>
            </div>
            <p className={`text-xl font-bold ${totalOutstanding > 0 ? 'text-warning' : 'text-success'}`}>
              {formatCurrency(totalOutstanding, locale, t.common.currency)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t.dashboard.byActiveStays}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle>{t.dashboard.roomStatus}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeRooms.map(room => {
              const status = getRoomStatus(room.id);
              const guest = stays.find(s =>
                s.room_id === room.id && s.check_in_date <= todayStr && s.check_out_date > todayStr &&
                s.status !== 'CANCELLED'
              );
              return (
                <div key={room.id} className={`p-3 rounded-lg border ${statusColors[status]}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">#{room.number}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[status]}`}>
                      {t.status[status as keyof typeof t.status]}
                    </Badge>
                  </div>
                  <p className="text-xs mt-1 opacity-80">
                    {t.roomType[room.room_type]} / {room.capacity} {t.rooms.beds}
                  </p>
                  {guest && (
                    <p className="text-xs mt-1 font-medium truncate">{guest.guest_name}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle>{t.dashboard.todayCheckIns}</CardTitle></CardHeader>
          <CardContent>
            {todayCheckIns.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.common.noData}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.stays.room}</TableHead>
                    <TableHead>{t.stays.guest}</TableHead>
                    <TableHead>{t.stays.checkOut}</TableHead>
                    <TableHead>{t.stays.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayCheckIns.map(stay => (
                    <TableRow key={stay.id}>
                      <TableCell className="font-medium">#{rooms.find(r => r.id === stay.room_id)?.number}</TableCell>
                      <TableCell>{stay.guest_name}</TableCell>
                      <TableCell>{stay.check_out_date}</TableCell>
                      <TableCell>
                        <Badge className={stayStatusColors[stay.status]}>
                          {t.status[stay.status as keyof typeof t.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle>{t.dashboard.todayCheckOuts}</CardTitle></CardHeader>
          <CardContent>
            {todayCheckOuts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.common.noData}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.stays.room}</TableHead>
                    <TableHead>{t.stays.guest}</TableHead>
                    <TableHead>{t.stays.total}</TableHead>
                    <TableHead>{t.stays.due}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayCheckOuts.map(stay => {
                    const total = getStayTotal(stay);
                    const paid = getStayPaid(stay.id);
                    const due = total - paid;
                    return (
                      <TableRow key={stay.id}>
                      <TableCell className="font-medium">#{rooms.find(r => r.id === stay.room_id)?.number}</TableCell>
                      <TableCell>{stay.guest_name}</TableCell>
                      <TableCell>{formatCurrency(total, locale, t.common.currency)}</TableCell>
                      <TableCell className={due > 0 ? 'text-destructive font-medium' : 'text-success'}>
                        {formatCurrency(due, locale, t.common.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
