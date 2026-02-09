import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, BedDouble, DoorOpen, Plus } from "lucide-react";
import { mockRooms, mockStays, mockPayments } from "@/data/mockData";
import { formatCurrency, getNights, getStayTotal, dateStr } from "@/lib/format";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const today = new Date();
  const todayStr = dateStr(today);

  const todayCheckIns = mockStays.filter(s => s.check_in_date === todayStr && ['BOOKED', 'CHECKED_IN'].includes(s.status));
  const todayCheckOuts = mockStays.filter(s => s.check_out_date === todayStr && ['CHECKED_IN', 'BOOKED'].includes(s.status));

  const occupiedRoomIds = new Set(
    mockStays
      .filter(s => s.check_in_date <= todayStr && s.check_out_date > todayStr && ['CHECKED_IN', 'BOOKED'].includes(s.status))
      .map(s => s.room_id)
  );

  const activeRooms = mockRooms.filter(r => r.active);

  const getRoomStatus = (roomId: string) => {
    if (todayCheckOuts.some(s => s.room_id === roomId)) return 'checkOutToday';
    if (todayCheckIns.some(s => s.room_id === roomId)) return 'checkInToday';
    if (occupiedRoomIds.has(roomId)) return 'occupied';
    return 'free';
  };

  const statusColors: Record<string, string> = {
    free: 'bg-success/15 text-success border-success/30',
    occupied: 'bg-primary/15 text-primary border-primary/30',
    checkOutToday: 'bg-warning/15 text-warning border-warning/30',
    checkInToday: 'bg-info/15 text-info border-info/30',
  };

  const stayStatusColors: Record<string, string> = {
    BOOKED: 'bg-info/15 text-info',
    CHECKED_IN: 'bg-success/15 text-success',
    CHECKED_OUT: 'bg-muted text-muted-foreground',
    CANCELLED: 'bg-destructive/15 text-destructive',
  };

  const getStayPaid = (stayId: string) =>
    mockPayments.filter(p => p.stay_id === stayId).reduce((s, p) => s + p.amount, 0);

  const stats = [
    { label: t.dashboard.checkInsToday, value: todayCheckIns.length, icon: LogIn, color: 'text-info' },
    { label: t.dashboard.checkOutsToday, value: todayCheckOuts.length, icon: LogOut, color: 'text-warning' },
    { label: t.dashboard.occupiedRooms, value: occupiedRoomIds.size, icon: BedDouble, color: 'text-primary' },
    { label: t.dashboard.availableRooms, value: activeRooms.length - occupiedRoomIds.size, icon: DoorOpen, color: 'text-success' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.dashboard.title}</h1>
          <p className="text-sm text-muted-foreground">{t.dashboard.today}: {todayStr}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate('/stays')}><Plus className="mr-1 h-4 w-4" />{t.dashboard.addStay}</Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/payments')}><Plus className="mr-1 h-4 w-4" />{t.dashboard.addPayment}</Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/expenses')}><Plus className="mr-1 h-4 w-4" />{t.dashboard.addExpense}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle>{t.dashboard.roomStatus}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeRooms.map(room => {
              const status = getRoomStatus(room.id);
              const guest = mockStays.find(s =>
                s.room_id === room.id && s.check_in_date <= todayStr && s.check_out_date > todayStr &&
                ['CHECKED_IN', 'BOOKED'].includes(s.status)
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
                      <TableCell className="font-medium">#{mockRooms.find(r => r.id === stay.room_id)?.number}</TableCell>
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
                        <TableCell className="font-medium">#{mockRooms.find(r => r.id === stay.room_id)?.number}</TableCell>
                        <TableCell>{stay.guest_name}</TableCell>
                        <TableCell>{formatCurrency(total)}</TableCell>
                        <TableCell className={due > 0 ? 'text-destructive font-medium' : 'text-success'}>
                          {formatCurrency(due)}
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
