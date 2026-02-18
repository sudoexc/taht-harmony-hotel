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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Search, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, getTodayInTimeZone } from "@/lib/format";
import { Payment } from "@/types";
import { ApiError } from "@/lib/api";

const Payments = () => {
  const { t, language } = useLanguage();
  const { rooms, stays, payments, addPayment, updatePayment, removePayment, hotel, customPaymentMethods, addCustomPaymentMethod } = useData();
  const { hotelId, isAdmin } = useAuth();
  const { isDateLocked } = useMonthLock();
  const locale = language === "uz" ? "uz-UZ" : "ru-RU";

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sortKey, setSortKey] = useState("dateDesc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formStayId, setFormStayId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formMethodValue, setFormMethodValue] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [newMethodName, setNewMethodName] = useState("");
  const [addMethodError, setAddMethodError] = useState<string | null>(null);

  const getMethodLabel = (payment: Payment) =>
    payment.custom_method_label || payment.method;

  const getInfo = useCallback((stayId: string) => {
    const stay = stays.find((s) => s.id === stayId);
    const room = stay ? rooms.find((r) => r.id === stay.room_id) : null;
    return { roomNumber: room?.number || "?", guestName: stay?.guest_name || "?" };
  }, [rooms, stays]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments
      .filter((payment) => {
        if (methodFilter !== "all" && getMethodLabel(payment) !== methodFilter) return false;
        if (!query) return true;
        const info = getInfo(payment.stay_id);
        return (
          info.guestName.toLowerCase().includes(query) ||
          info.roomNumber.toLowerCase().includes(query) ||
          (payment.comment || "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        switch (sortKey) {
          case "amountAsc": return a.amount - b.amount;
          case "amountDesc": return b.amount - a.amount;
          case "dateAsc": return a.paid_at.localeCompare(b.paid_at);
          case "dateDesc":
          default: return b.paid_at.localeCompare(a.paid_at);
        }
      });
  }, [payments, methodFilter, search, sortKey, getInfo]);

  const openAdd = () => {
    setActionError(null);
    setEditingPayment(null);
    setFormStayId(stays[0]?.id || "");
    setFormDate(getTodayInTimeZone(hotel.timezone));
    setFormMethodValue(customPaymentMethods[0]?.name || "");
    setFormAmount("");
    setFormComment("");
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (payment: Payment) => {
    setActionError(null);
    setEditingPayment(payment);
    setFormStayId(payment.stay_id);
    setFormDate(payment.paid_at.split("T")[0]);
    setFormMethodValue(getMethodLabel(payment));
    setFormAmount(String(payment.amount));
    setFormComment(payment.comment || "");
    setFormError(null);
    setDialogOpen(true);
  };

  const handleAddMethod = async () => {
    const name = newMethodName.trim();
    if (!name) { setAddMethodError("Введите название"); return; }
    try {
      await addCustomPaymentMethod(name);
      setFormMethodValue(name);
      setNewMethodName("");
      setAddMethodError(null);
      setAddMethodOpen(false);
    } catch {
      setAddMethodError("Метод уже существует или ошибка");
    }
  };

  const paymentLocked = editingPayment ? isDateLocked(editingPayment.paid_at) : isDateLocked(formDate);

  const handleSave = () => {
    const amount = Number(formAmount);
    if (!formStayId || !formDate) {
      setFormError(t.validation.required);
      return;
    }
    if (!formMethodValue) {
      setFormError("Выберите метод оплаты");
      return;
    }
    if (!amount || amount <= 0) {
      setFormError(t.validation.amountPositive);
      return;
    }
    if (paymentLocked && !isAdmin) {
      setFormError(t.validation.closedMonthEdit);
      return;
    }

    const payload: Payment = {
      id: editingPayment?.id || `pay-${Date.now()}`,
      hotel_id: hotelId || "",
      stay_id: formStayId,
      paid_at: new Date(`${formDate}T12:00:00Z`).toISOString(),
      method: 'OTHER',
      custom_method_label: formMethodValue,
      amount,
      comment: formComment,
    };

    if (editingPayment) {
      updatePayment(payload);
    } else {
      addPayment(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removePayment(deleteTarget.id);
      setDeleteTarget(null);
      setActionError(null);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) setActionError(t.auth.sessionExpired);
        else if (error.status === 403) setActionError(t.validation.closedMonthEdit);
        else if (error.status === 404) setActionError(t.validation.notFound);
        else setActionError(t.validation.deleteFailed);
      } else {
        setActionError(t.validation.deleteFailed);
      }
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.payments.title}</h1>
        <Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" />{t.payments.addPayment}</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder={t.common.filter} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            {customPaymentMethods.map((m) => (
              <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder={t.common.sort} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dateDesc">{t.sorting.dateDesc}</SelectItem>
            <SelectItem value="dateAsc">{t.sorting.dateAsc}</SelectItem>
            <SelectItem value="amountDesc">{t.sorting.amountDesc}</SelectItem>
            <SelectItem value="amountAsc">{t.sorting.amountAsc}</SelectItem>
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
                <TableHead>{t.payments.date}</TableHead>
                <TableHead>{t.stays.room}</TableHead>
                <TableHead>{t.stays.guest}</TableHead>
                <TableHead>{t.payments.amount}</TableHead>
                <TableHead>{t.payments.method}</TableHead>
                <TableHead>{t.payments.comment}</TableHead>
                <TableHead>{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((payment) => {
                const info = getInfo(payment.stay_id);
                const locked = isDateLocked(payment.paid_at);
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paid_at, locale)}</TableCell>
                    <TableCell className="font-medium">#{info.roomNumber}</TableCell>
                    <TableCell>{info.guestName}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount, locale, t.common.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getMethodLabel(payment)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{payment.comment}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(payment)} disabled={locked && !isAdmin} aria-label={t.common.edit}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setActionError(null); setDeleteTarget(payment); }}
                        disabled={locked && !isAdmin}
                        aria-label={t.common.delete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPayment ? t.payments.editPayment : t.payments.addPayment}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.payments.stay}</Label>
              <Select value={formStayId} onValueChange={setFormStayId}>
                <SelectTrigger disabled={paymentLocked && !isAdmin}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stays.map((stay) => (
                    <SelectItem key={stay.id} value={stay.id}>
                      #{getInfo(stay.id).roomNumber} · {stay.guest_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.payments.date}</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} disabled={paymentLocked && !isAdmin} />
              </div>
              <div className="space-y-2">
                <Label>{t.payments.method}</Label>
                <div className="flex gap-2">
                  <Select value={formMethodValue} onValueChange={setFormMethodValue}>
                    <SelectTrigger disabled={paymentLocked && !isAdmin}>
                      <SelectValue placeholder="Выберите метод" />
                    </SelectTrigger>
                    <SelectContent>
                      {customPaymentMethods.map((m) => (
                        <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                      ))}
                      {customPaymentMethods.length === 0 && (
                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                          Нет методов. Добавьте через [+]
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {isAdmin && (
                    <Button type="button" variant="outline" size="icon" title="Добавить метод оплаты" onClick={() => { setNewMethodName(""); setAddMethodError(null); setAddMethodOpen(true); }}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.payments.amount}</Label>
              <Input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} disabled={paymentLocked && !isAdmin} />
            </div>
            <div className="space-y-2">
              <Label>{t.payments.comment}</Label>
              <Input value={formComment} onChange={(e) => setFormComment(e.target.value)} disabled={paymentLocked && !isAdmin} />
            </div>
            {paymentLocked && !isAdmin && (
              <div className="text-sm text-warning">{t.validation.closedMonthEdit}</div>
            )}
            {formError && (
              <div className="text-sm text-destructive">{formError}</div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={paymentLocked && !isAdmin}>{t.common.save}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addMethodOpen} onOpenChange={setAddMethodOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Новый метод оплаты</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Название (напр. Uzcard, Наличные...)"
              value={newMethodName}
              onChange={(e) => { setNewMethodName(e.target.value); setAddMethodError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMethod()}
              autoFocus
            />
            {addMethodError && <p className="text-sm text-destructive">{addMethodError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddMethodOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAddMethod}>{t.common.save}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.common.confirmDeleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Payments;
