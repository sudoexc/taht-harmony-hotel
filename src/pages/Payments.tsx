import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { mockStays, mockRooms, mockPayments } from "@/data/mockData";
import { formatCurrency } from "@/lib/format";

const Payments = () => {
  const { t } = useLanguage();

  const getInfo = (stayId: string) => {
    const stay = mockStays.find(s => s.id === stayId);
    const room = stay ? mockRooms.find(r => r.id === stay.room_id) : null;
    return { roomNumber: room?.number || '?', guestName: stay?.guest_name || '?' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.payments.title}</h1>
        <Button><Plus className="mr-1 h-4 w-4" />{t.payments.addPayment}</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.payments.date}</TableHead>
                <TableHead>{t.stays.room}</TableHead>
                <TableHead>{t.stays.guest}</TableHead>
                <TableHead>{t.payments.amount}</TableHead>
                <TableHead>{t.payments.method}</TableHead>
                <TableHead>{t.payments.comment}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPayments.map(payment => {
                const info = getInfo(payment.stay_id);
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{new Date(payment.paid_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">#{info.roomNumber}</TableCell>
                    <TableCell>{info.guestName}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.paymentMethod[payment.method]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{payment.comment}</TableCell>
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

export default Payments;
