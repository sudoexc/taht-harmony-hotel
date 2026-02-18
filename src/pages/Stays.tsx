import { useCallback, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useMonthLock } from "@/hooks/useMonthLock";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Pencil, Eye, LogIn, LogOut, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, getNights, getStayTotal, getTodayInTimeZone, shiftDateStr } from "@/lib/format";
import { PaymentMethod, Stay, StayStatus } from "@/types";
import { ApiError } from "@/lib/api";

const stayStatusColors: Record<string, string> = {
  BOOKED: "bg-info/15 text-info",
  CHECKED_IN: "bg-success/15 text-success",
  CHECKED_OUT: "bg-muted text-muted-foreground",
  CANCELLED: "bg-destructive/15 text-destructive",
};

const Stays = () => {
  const { t, language } = useLanguage();
  const { rooms, stays, payments, addStay, updateStay, removeStay, addPayment, hotel } = useData();
  const { hotelId, isAdmin } = useAuth();
  const { isDateLocked, isStayLocked } = useMonthLock();
  const locale = language === "uz" ? "uz-UZ" : "ru-RU";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("checkInDesc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStay, setEditingStay] = useState<Stay | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsStayId, setDetailsStayId] = useState<string | null>(null);

  const [formGuestName, setFormGuestName] = useState("");
  const [formGuestPhone, setFormGuestPhone] = useState("");
  const [formRoomId, setFormRoomId] = useState("");
  const [formCheckIn, setFormCheckIn] = useState("");
  const [formCheckOut, setFormCheckOut] = useState("");
  const [formStatus, setFormStatus] = useState<StayStatus>("BOOKED");
  const [formPrice, setFormPrice] = useState("0");
  const [formDiscount, setFormDiscount] = useState("0");
  const [formAdjustment, setFormAdjustment] = useState("0");
  const [formDeposit, setFormDeposit] = useState("0");
  const [formComment, setFormComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [quickPaymentMethod, setQuickPaymentMethod] = useState<PaymentMethod>("CASH");
  const [quickPaymentAmount, setQuickPaymentAmount] = useState("");
  const [quickPaymentDate, setQuickPaymentDate] = useState("");
  const [quickPaymentComment, setQuickPaymentComment] = useState("");
  const [quickPaymentError, setQuickPaymentError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteStayId, setDeleteStayId] = useState<string | null>(null);

  const getStayPaid = useCallback(
    (stayId: string) => payments.filter((p) => p.stay_id === stayId).reduce((s, p) => s + p.amount, 0),
    [payments],
  );

  const getRoomNumber = useCallback(
    (roomId: string) => rooms.find((r) => r.id === roomId)?.number || "?",
    [rooms],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = stays.filter((stay) => {
      if (statusFilter !== "all" && stay.status !== statusFilter) return false;
      if (!query) return true;
      const roomNumber = getRoomNumber(stay.room_id).toLowerCase();
      return (
        stay.guest_name.toLowerCase().includes(query) ||
        stay.guest_phone?.toLowerCase().includes(query) ||
        roomNumber.includes(query)
      );
    });

    return base.sort((a, b) => {
      const totalA = getStayTotal(a);
      const totalB = getStayTotal(b);
      const dueA = totalA - getStayPaid(a.id);
      const dueB = totalB - getStayPaid(b.id);

      switch (sortKey) {
        case "checkInAsc":
          return a.check_in_date.localeCompare(b.check_in_date);
        case "checkOutDesc":
          return b.check_out_date.localeCompare(a.check_out_date);
        case "checkOutAsc":
          return a.check_out_date.localeCompare(b.check_out_date);
        case "totalDesc":
          return totalB - totalA;
        case "totalAsc":
          return totalA - totalB;
        case "dueDesc":
          return dueB - dueA;
        case "dueAsc":
          return dueA - dueB;
        case "checkInDesc":
        default:
          return b.check_in_date.localeCompare(a.check_in_date);
      }
    });
  }, [stays, search, statusFilter, sortKey, getRoomNumber, getStayPaid]);

  const openAdd = () => {
    const defaultRoom = rooms[0];
    const todayStr = getTodayInTimeZone(hotel.timezone);
    setEditingStay(null);
    setFormGuestName("");
    setFormGuestPhone("");
    setFormRoomId(rooms[0]?.id || "");
    setFormCheckIn(todayStr);
    setFormCheckOut(shiftDateStr(todayStr, 1));
    setFormStatus("BOOKED");
    setFormPrice(defaultRoom ? String(defaultRoom.base_price) : "0");
    setFormDiscount("0");
    setFormAdjustment("0");
    setFormDeposit("0");
    setFormComment("");
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (stay: Stay) => {
    setEditingStay(stay);
    setFormGuestName(stay.guest_name);
    setFormGuestPhone(stay.guest_phone || "");
    setFormRoomId(stay.room_id);
    setFormCheckIn(stay.check_in_date);
    setFormCheckOut(stay.check_out_date);
    setFormStatus(stay.status);
    setFormPrice(String(stay.price_per_night));
    setFormDiscount(String(stay.weekly_discount_amount));
    setFormAdjustment(String(stay.manual_adjustment_amount));
    setFormDeposit(String(stay.deposit_expected));
    setFormComment(stay.comment || "");
    setFormError(null);
    setDialogOpen(true);
  };

  const candidateStay: Stay = {
    id: editingStay?.id || "new",
    hotel_id: hotelId || "",
    room_id: formRoomId || "",
    guest_name: formGuestName,
    guest_phone: formGuestPhone,
    check_in_date: formCheckIn,
    check_out_date: formCheckOut,
    status: formStatus,
    price_per_night: Number(formPrice) || 0,
    weekly_discount_amount: Number(formDiscount) || 0,
    manual_adjustment_amount: Number(formAdjustment) || 0,
    deposit_expected: Number(formDeposit) || 0,
    comment: formComment,
  };

  const nights = getNights(formCheckIn || "", formCheckOut || "");
  const total =
    nights * (Number(formPrice) || 0) - (Number(formDiscount) || 0) + (Number(formAdjustment) || 0);
  const totalWarning = total < 0 ? t.validation.totalNegative : null;
  const stayLocked = editingStay ? isStayLocked(editingStay) : isStayLocked(candidateStay);

  const handleSave = async () => {
    if (!formGuestName || !formRoomId || !formCheckIn || !formCheckOut) {
      setFormError(t.validation.required);
      return;
    }
    if (getNights(formCheckIn, formCheckOut) <= 0) {
      setFormError(t.validation.checkOutAfterCheckIn);
      return;
    }
    if (stayLocked && !isAdmin) {
      setFormError(t.validation.closedMonthEdit);
      return;
    }

    const stayData: Stay = {
      ...candidateStay,
      id: editingStay?.id || `stay-${Date.now()}`,
    };

    try {
      if (editingStay) {
        await updateStay(stayData);
      } else {
        await addStay(stayData);
      }
      setDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.message.toLowerCase().includes('occupied')) {
        setFormError(t.validation.overlap);
      } else {
        setFormError(t.validation.saveFailed);
      }
    }
  };

  const openDetails = (stay: Stay) => {
    setDetailsStayId(stay.id);
    setQuickPaymentMethod("CASH");
    setQuickPaymentAmount("");
    setQuickPaymentDate(stay.check_in_date);
    setQuickPaymentComment("");
    setQuickPaymentError(null);
    setDetailsOpen(true);
  };

  const detailsStay = stays.find((stay) => stay.id === detailsStayId) || null;
  const detailsPayments = payments.filter((p) => p.stay_id === detailsStayId);

  const handleQuickPayment = async () => {
    if (!detailsStay) return;
    const amount = Number(quickPaymentAmount);
    if (!amount || amount <= 0) {
      setQuickPaymentError(t.validation.amountPositive);
      return;
    }
    if (!quickPaymentDate) {
      setQuickPaymentError(t.validation.required);
      return;
    }
    if (isDateLocked(quickPaymentDate)) {
      setQuickPaymentError(t.validation.closedMonthEdit);
      return;
    }

    await addPayment({
      id: `pay-${Date.now()}`,
      hotel_id: hotelId,
      stay_id: detailsStay.id,
      paid_at: new Date(`${quickPaymentDate}T12:00:00Z`).toISOString(),
      method: quickPaymentMethod,
      amount,
      comment: quickPaymentComment,
    });

    setQuickPaymentAmount("");
    setQuickPaymentComment("");
    setQuickPaymentError(null);
  };

  const handleStatusChange = async (stay: Stay, nextStatus: StayStatus) => {
    setActionError(null);
    if (isStayLocked(stay) && !isAdmin) {
      setActionError(t.validation.closedMonthEdit);
      return;
    }
    try {
      await updateStay({ ...stay, status: nextStatus });
    } catch (error) {
      if (error instanceof ApiError && error.message.toLowerCase().includes('occupied')) {
        setActionError(t.validation.overlap);
      } else {
        setActionError(t.validation.saveFailed);
      }
    }
  };

  // Summary stats
  const summaryStats = useMemo(() => {
    const active   = stays.filter(s => s.status === 'CHECKED_IN');
    const booked   = stays.filter(s => s.status === 'BOOKED');
    const totalDue = stays
      .filter(s => s.status === 'CHECKED_IN' || s.status === 'BOOKED')
      .reduce((sum, stay) => {
        const total = getStayTotal(stay);
        const paid  = getStayPaid(stay.id);
        return sum + Math.max(0, total - paid);
      }, 0);
    return { active: active.length, booked: booked.length, totalDue };
  }, [stays, getStayPaid]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t.stays.title}</h1>
        <Button className="gradient-gold text-white border-0 hover:opacity-90 glow-gold-sm" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" />{t.stays.addStay}
        </Button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10 border border-success/20">
              <LogIn className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-lg font-bold">{summaryStats.active}</p>
              <p className="text-xs text-muted-foreground">Заселены</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10 border border-info/20">
              <Eye className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-lg font-bold">{summaryStats.booked}</p>
              <p className="text-xs text-muted-foreground">Бронь</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-border/50 ${summaryStats.totalDue > 0 ? 'border-warning/30' : ''}`}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${summaryStats.totalDue > 0 ? 'bg-warning/10 border border-warning/20' : 'bg-muted border border-border'}`}>
              <LogOut className={`h-4 w-4 ${summaryStats.totalDue > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className={`text-sm font-bold tabular-nums ${summaryStats.totalDue > 0 ? 'text-warning' : 'text-success'}`}>
                {formatCurrency(summaryStats.totalDue, locale, t.common.currency)}
              </p>
              <p className="text-xs text-muted-foreground">Долг</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.common.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={t.common.filter} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="BOOKED">{t.status.BOOKED}</SelectItem>
            <SelectItem value="CHECKED_IN">{t.status.CHECKED_IN}</SelectItem>
            <SelectItem value="CHECKED_OUT">{t.status.CHECKED_OUT}</SelectItem>
            <SelectItem value="CANCELLED">{t.status.CANCELLED}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder={t.common.sort} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="checkInDesc">{t.sorting.checkInDesc}</SelectItem>
            <SelectItem value="checkInAsc">{t.sorting.checkInAsc}</SelectItem>
            <SelectItem value="checkOutDesc">{t.sorting.checkOutDesc}</SelectItem>
            <SelectItem value="checkOutAsc">{t.sorting.checkOutAsc}</SelectItem>
            <SelectItem value="totalDesc">{t.sorting.totalDesc}</SelectItem>
            <SelectItem value="totalAsc">{t.sorting.totalAsc}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {actionError && (
        <div className="text-sm text-destructive">{actionError}</div>
      )}
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
                <TableHead>{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(stay => {
                const stayNights = getNights(stay.check_in_date, stay.check_out_date);
                const totalAmount = getStayTotal(stay);
                const paid = getStayPaid(stay.id);
                const due = totalAmount - paid;
                const locked = isStayLocked(stay);
                return (
                  <TableRow key={stay.id}>
                    <TableCell className="font-medium">#{getRoomNumber(stay.room_id)}</TableCell>
                    <TableCell>{stay.guest_name}</TableCell>
                    <TableCell>{stay.check_in_date}</TableCell>
                    <TableCell>{stay.check_out_date}</TableCell>
                    <TableCell>{stayNights}</TableCell>
                    <TableCell>{formatCurrency(totalAmount, locale, t.common.currency)}</TableCell>
                    <TableCell>{formatCurrency(paid, locale, t.common.currency)}</TableCell>
                    <TableCell className={due > 0 ? 'text-destructive font-medium' : 'text-success font-medium'}>
                      {formatCurrency(due, locale, t.common.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge className={stayStatusColors[stay.status]}>
                        {t.status[stay.status as keyof typeof t.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-1">
                      {stay.status === "BOOKED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(stay, "CHECKED_IN")}
                          disabled={locked && !isAdmin}
                        >
                          <LogIn className="h-4 w-4 mr-1" />
                          {t.stays.checkInAction}
                        </Button>
                      )}
                      {stay.status === "CHECKED_IN" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(stay, "CHECKED_OUT")}
                          disabled={locked && !isAdmin}
                        >
                          <LogOut className="h-4 w-4 mr-1" />
                          {t.stays.checkOutAction}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openDetails(stay)} aria-label={t.common.view}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(stay)} disabled={locked && !isAdmin} aria-label={t.common.edit}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {(isAdmin || !locked) && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteStayId(stay.id)} aria-label={t.common.delete}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteStayId} onOpenChange={(open) => { if (!open) setDeleteStayId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.common.confirmDeleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteStayId) removeStay(deleteStayId); setDeleteStayId(null); }}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingStay ? t.stays.editStay : t.stays.addStay}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.stays.guestName}</Label>
                <Input value={formGuestName} onChange={(e) => setFormGuestName(e.target.value)} disabled={stayLocked && !isAdmin} />
              </div>
              <div className="space-y-2">
                <Label>{t.stays.guestPhone}</Label>
                <Input value={formGuestPhone} onChange={(e) => setFormGuestPhone(e.target.value)} disabled={stayLocked && !isAdmin} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.stays.room}</Label>
                <Select value={formRoomId} onValueChange={setFormRoomId}>
                  <SelectTrigger disabled={stayLocked && !isAdmin}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>#{room.number} · {t.roomType[room.room_type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.stays.status}</Label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as StayStatus)}>
                  <SelectTrigger disabled={stayLocked && !isAdmin}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOOKED">{t.status.BOOKED}</SelectItem>
                    <SelectItem value="CHECKED_IN">{t.status.CHECKED_IN}</SelectItem>
                    <SelectItem value="CHECKED_OUT">{t.status.CHECKED_OUT}</SelectItem>
                    <SelectItem value="CANCELLED">{t.status.CANCELLED}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.stays.checkIn}</Label>
                <Input type="date" value={formCheckIn} onChange={(e) => setFormCheckIn(e.target.value)} disabled={stayLocked && !isAdmin} />
              </div>
              <div className="space-y-2">
                <Label>{t.stays.checkOut}</Label>
                <Input type="date" value={formCheckOut} onChange={(e) => setFormCheckOut(e.target.value)} disabled={stayLocked && !isAdmin} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.stays.pricePerNight}</Label>
                <Input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} disabled={stayLocked && !isAdmin} />
              </div>
              <div className="space-y-2">
                <Label>{t.stays.weeklyDiscount}</Label>
                <Input type="number" value={formDiscount} onChange={(e) => setFormDiscount(e.target.value)} disabled={stayLocked && !isAdmin} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.stays.manualAdjustment}</Label>
                <Input type="number" value={formAdjustment} onChange={(e) => setFormAdjustment(e.target.value)} disabled={stayLocked && !isAdmin} />
              </div>
              <div className="space-y-2">
                <Label>{t.stays.depositExpected}</Label>
                <Input type="number" value={formDeposit} onChange={(e) => setFormDeposit(e.target.value)} disabled={stayLocked && !isAdmin} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.stays.comment}</Label>
              <Textarea value={formComment} onChange={(e) => setFormComment(e.target.value)} disabled={stayLocked && !isAdmin} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t.stays.nights}</p>
                <p className="text-sm font-medium">{nights}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.stays.total}</p>
                <p className="text-sm font-medium">{formatCurrency(total, locale, t.common.currency)}</p>
              </div>
            {totalWarning && (
              <div className="col-span-2 text-xs text-warning">{totalWarning}</div>
            )}
          </div>

          {stayLocked && !isAdmin && (
            <div className="text-sm text-warning">{t.validation.closedMonthEdit}</div>
          )}
            {formError && (
              <div className="text-sm text-destructive">{formError}</div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={stayLocked && !isAdmin}>{t.common.save}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.stays.stayDetails}</DialogTitle>
          </DialogHeader>
          {detailsStay && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t.stays.room}</p>
                  <p className="text-sm font-medium">#{getRoomNumber(detailsStay.room_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.stays.guest}</p>
                  <p className="text-sm font-medium">{detailsStay.guest_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.stays.checkIn}</p>
                  <p className="text-sm font-medium">{detailsStay.check_in_date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.stays.checkOut}</p>
                  <p className="text-sm font-medium">{detailsStay.check_out_date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t.stays.nights}</p>
                  <p className="text-sm font-medium">{getNights(detailsStay.check_in_date, detailsStay.check_out_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.stays.total}</p>
                  <p className="text-sm font-medium">{formatCurrency(getStayTotal(detailsStay), locale, t.common.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.stays.paid}</p>
                  <p className="text-sm font-medium">{formatCurrency(getStayPaid(detailsStay.id), locale, t.common.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.stays.due}</p>
                  <p className="text-sm font-medium">{formatCurrency(getStayTotal(detailsStay) - getStayPaid(detailsStay.id), locale, t.common.currency)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">{t.stays.payments}</h3>
                {detailsPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.common.noData}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.payments.date}</TableHead>
                        <TableHead>{t.payments.amount}</TableHead>
                        <TableHead>{t.payments.method}</TableHead>
                        <TableHead>{t.payments.comment}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailsPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.paid_at, locale)}</TableCell>
                          <TableCell>{formatCurrency(payment.amount, locale, t.common.currency)}</TableCell>
                          <TableCell>{t.paymentMethod[payment.method]}</TableCell>
                          <TableCell className="text-muted-foreground">{payment.comment}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t.stays.quickAddPayment}</h3>
                  <div className="flex items-center gap-2">
                    {detailsStay.status === "BOOKED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(detailsStay, "CHECKED_IN")}
                      >
                        <LogIn className="h-4 w-4 mr-1" />
                        {t.stays.checkInAction}
                      </Button>
                    )}
                    {detailsStay.status === "CHECKED_IN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(detailsStay, "CHECKED_OUT")}
                      >
                        <LogOut className="h-4 w-4 mr-1" />
                        {t.stays.checkOutAction}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label>{t.payments.date}</Label>
                    <Input type="date" value={quickPaymentDate} onChange={(e) => setQuickPaymentDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t.payments.method}</Label>
                    <Select value={quickPaymentMethod} onValueChange={(v) => setQuickPaymentMethod(v as PaymentMethod)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">{t.paymentMethod.CASH}</SelectItem>
                        <SelectItem value="CARD">{t.paymentMethod.CARD}</SelectItem>
                        <SelectItem value="PAYME">{t.paymentMethod.PAYME}</SelectItem>
                        <SelectItem value="CLICK">{t.paymentMethod.CLICK}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t.payments.amount}</Label>
                    <Input type="number" value={quickPaymentAmount} onChange={(e) => setQuickPaymentAmount(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t.payments.comment}</Label>
                    <Input value={quickPaymentComment} onChange={(e) => setQuickPaymentComment(e.target.value)} />
                  </div>
                </div>
                {quickPaymentError && (
                  <div className="text-sm text-destructive">{quickPaymentError}</div>
                )}
                <Button size="sm" onClick={handleQuickPayment}>{t.payments.addPayment}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Stays;
