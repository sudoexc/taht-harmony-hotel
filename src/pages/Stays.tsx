import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { mockRooms, mockStays, mockPayments } from "@/data/mockData";
import { formatCurrency, getNights, getStayTotal } from "@/lib/format";

const stayStatusColors: Record<string, string> = {
  BOOKED: 'bg-info/15 text-info',
  CHECKED_IN: 'bg-success/15 text-success',
  CHECKED_OUT: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/15 text-destructive',
};

const Stays = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const getStayPaid = (stayId: string) =>
    mockPayments.filter(p => p.stay_id === stayId).reduce((s, p) => s + p.amount, 0);
  const getRoomNumber = (roomId: string) =>
    mockRooms.find(r => r.id === roomId)?.number || '?';

  const filtered = mockStays.filter(stay => {
    if (statusFilter !== 'all' && stay.status !== statusFilter) return false;
    if (search && !stay.guest_name.toLowerCase().includes(search.toLowerCase()) &&
      !getRoomNumber(stay.room_id).includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.stays.title}</h1>
        <Button><Plus className="mr-1 h-4 w-4" />{t.stays.addStay}</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.common.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="BOOKED">{t.status.BOOKED}</SelectItem>
            <SelectItem value="CHECKED_IN">{t.status.CHECKED_IN}</SelectItem>
            <SelectItem value="CHECKED_OUT">{t.status.CHECKED_OUT}</SelectItem>
            <SelectItem value="CANCELLED">{t.status.CANCELLED}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.stays.room}</TableHead>
                <TableHead>{t.stays.guest}</TableHead>
                <TableHead>{t.stays.checkIn}</TableHead>
                <TableHead>{t.stays.checkOut}</TableHead>
                <TableHead>{t.stays.nights}</TableHead>
                <TableHead>{t.stays.total}</TableHead>
                <TableHead>{t.stays.paid}</TableHead>
                <TableHead>{t.stays.due}</TableHead>
                <TableHead>{t.stays.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(stay => {
                const nights = getNights(stay.check_in_date, stay.check_out_date);
                const total = getStayTotal(stay);
                const paid = getStayPaid(stay.id);
                const due = total - paid;
                return (
                  <TableRow key={stay.id}>
                    <TableCell className="font-medium">#{getRoomNumber(stay.room_id)}</TableCell>
                    <TableCell>{stay.guest_name}</TableCell>
                    <TableCell>{stay.check_in_date}</TableCell>
                    <TableCell>{stay.check_out_date}</TableCell>
                    <TableCell>{nights}</TableCell>
                    <TableCell>{formatCurrency(total)}</TableCell>
                    <TableCell>{formatCurrency(paid)}</TableCell>
                    <TableCell className={due > 0 ? 'text-destructive font-medium' : 'text-success font-medium'}>
                      {formatCurrency(due)}
                    </TableCell>
                    <TableCell>
                      <Badge className={stayStatusColors[stay.status]}>
                        {t.status[stay.status as keyof typeof t.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Stays;
