import { useMemo, useState } from "react";
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
import { Expense, ExpenseCategory, PaymentMethod } from "@/types";
import { ApiError } from "@/lib/api";

const STANDARD_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'PAYME', 'CLICK'];

const Expenses = () => {
  const { t, language } = useLanguage();
  const { expenses, addExpense, updateExpense, removeExpense, hotel, customPaymentMethods, addCustomPaymentMethod } = useData();
  const { hotelId, isAdmin } = useAuth();
  const { isDateLocked } = useMonthLock();
  const locale = language === "uz" ? "uz-UZ" : "ru-RU";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sortKey, setSortKey] = useState("dateDesc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("OTHER");
  const [formMethod, setFormMethod] = useState<PaymentMethod>("CASH");
  const [formMethodValue, setFormMethodValue] = useState("CASH");
  const [formAmount, setFormAmount] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [newMethodName, setNewMethodName] = useState("");
  const [addMethodError, setAddMethodError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses
      .filter((expense) => {
        if (categoryFilter !== "all" && expense.category !== categoryFilter) return false;
        if (methodFilter !== "all" && expense.method !== methodFilter) return false;
        if (!query) return true;
        return (expense.comment || "").toLowerCase().includes(query);
      })
      .sort((a, b) => {
        switch (sortKey) {
          case "amountAsc":
            return a.amount - b.amount;
          case "amountDesc":
            return b.amount - a.amount;
          case "dateAsc":
            return a.spent_at.localeCompare(b.spent_at);
          case "dateDesc":
          default:
            return b.spent_at.localeCompare(a.spent_at);
        }
      });
  }, [expenses, categoryFilter, methodFilter, search, sortKey]);

  const openAdd = () => {
    setActionError(null);
    setEditingExpense(null);
    setFormDate(getTodayInTimeZone(hotel.timezone));
    setFormCategory("OTHER");
    setFormMethod("CASH");
    setFormMethodValue("CASH");
    setFormAmount("");
    setFormComment("");
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setActionError(null);
    setEditingExpense(expense);
    setFormDate(expense.spent_at.split("T")[0]);
    setFormCategory(expense.category);
    setFormMethod(expense.method);
    setFormMethodValue(expense.method === 'OTHER' ? (expense.custom_method_label || 'OTHER') : expense.method);
    setFormAmount(String(expense.amount));
    setFormComment(expense.comment || "");
    setFormError(null);
    setDialogOpen(true);
  };

  const handleAddMethod = async () => {
    const name = newMethodName.trim();
    if (!name) { setAddMethodError("Введите название"); return; }
    try {
      await addCustomPaymentMethod(name);
      setFormMethodValue(name);
      setFormMethod('OTHER');
      setNewMethodName("");
      setAddMethodError(null);
      setAddMethodOpen(false);
    } catch {
      setAddMethodError("Метод уже существует или ошибка");
    }
  };

  const expenseLocked = editingExpense ? isDateLocked(editingExpense.spent_at) : isDateLocked(formDate);

  const handleSave = () => {
    const amount = Number(formAmount);
    if (!formDate) {
      setFormError(t.validation.required);
      return;
    }
    if (!amount || amount <= 0) {
      setFormError(t.validation.amountPositive);
      return;
    }
    if (expenseLocked && !isAdmin) {
      setFormError(t.validation.closedMonthEdit);
      return;
    }

    const isCustom = !STANDARD_METHODS.includes(formMethodValue as PaymentMethod);
    const payload: Expense = {
      id: editingExpense?.id || `exp-${Date.now()}`,
      hotel_id: hotelId || "",
      spent_at: new Date(`${formDate}T12:00:00Z`).toISOString(),
      category: formCategory,
      method: isCustom ? 'OTHER' : (formMethodValue as PaymentMethod),
      custom_method_label: isCustom ? formMethodValue : null,
      amount,
      comment: formComment,
    };

    if (editingExpense) {
      updateExpense(payload);
    } else {
      addExpense(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeExpense(deleteTarget.id);
      setDeleteTarget(null);
      setActionError(null);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setActionError(t.auth.sessionExpired);
        } else if (error.status === 403) {
          setActionError(t.validation.closedMonthEdit);
        } else if (error.status === 404) {
          setActionError(t.validation.notFound);
        } else {
          setActionError(t.validation.deleteFailed);
        }
      } else {
        setActionError(t.validation.deleteFailed);
      }
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.expenses.title}</h1>
        <Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" />{t.expenses.addExpense}</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.common.search} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder={t.common.filter} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="SALARY">{t.expenseCategory.SALARY}</SelectItem>
            <SelectItem value="INVENTORY">{t.expenseCategory.INVENTORY}</SelectItem>
            <SelectItem value="UTILITIES">{t.expenseCategory.UTILITIES}</SelectItem>
            <SelectItem value="REPAIR">{t.expenseCategory.REPAIR}</SelectItem>
            <SelectItem value="MARKETING">{t.expenseCategory.MARKETING}</SelectItem>
            <SelectItem value="OTHER">{t.expenseCategory.OTHER}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder={t.common.filter} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            <SelectItem value="CASH">{t.paymentMethod.CASH}</SelectItem>
            <SelectItem value="CARD">{t.paymentMethod.CARD}</SelectItem>
            <SelectItem value="PAYME">{t.paymentMethod.PAYME}</SelectItem>
            <SelectItem value="CLICK">{t.paymentMethod.CLICK}</SelectItem>
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
                <TableHead>{t.expenses.date}</TableHead>
                <TableHead>{t.expenses.category}</TableHead>
                <TableHead>{t.expenses.amount}</TableHead>
                <TableHead>{t.expenses.method}</TableHead>
                <TableHead>{t.expenses.comment}</TableHead>
                <TableHead>{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((expense) => {
                const locked = isDateLocked(expense.spent_at);
                return (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.spent_at, locale)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.expenseCategory[expense.category]}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(expense.amount, locale, t.common.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{expense.method === 'OTHER' ? (expense.custom_method_label || t.paymentMethod.OTHER) : t.paymentMethod[expense.method]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{expense.comment}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(expense)} disabled={locked && !isAdmin} aria-label={t.common.edit}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setActionError(null); setDeleteTarget(expense); }}
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
            <DialogTitle>{editingExpense ? t.expenses.editExpense : t.expenses.addExpense}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.expenses.date}</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} disabled={expenseLocked && !isAdmin} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.expenses.category}</Label>
                <Select value={formCategory} onValueChange={(v) => setFormCategory(v as ExpenseCategory)}>
                  <SelectTrigger disabled={expenseLocked && !isAdmin}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALARY">{t.expenseCategory.SALARY}</SelectItem>
                    <SelectItem value="INVENTORY">{t.expenseCategory.INVENTORY}</SelectItem>
                    <SelectItem value="UTILITIES">{t.expenseCategory.UTILITIES}</SelectItem>
                    <SelectItem value="REPAIR">{t.expenseCategory.REPAIR}</SelectItem>
                    <SelectItem value="MARKETING">{t.expenseCategory.MARKETING}</SelectItem>
                    <SelectItem value="OTHER">{t.expenseCategory.OTHER}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.expenses.method}</Label>
                <Select value={formMethodValue} onValueChange={(v) => { setFormMethodValue(v); setFormMethod(STANDARD_METHODS.includes(v as PaymentMethod) ? v as PaymentMethod : 'OTHER'); }}>
                  <SelectTrigger disabled={expenseLocked && !isAdmin}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">{t.paymentMethod.CASH}</SelectItem>
                    <SelectItem value="CARD">{t.paymentMethod.CARD}</SelectItem>
                    <SelectItem value="PAYME">{t.paymentMethod.PAYME}</SelectItem>
                    <SelectItem value="CLICK">{t.paymentMethod.CLICK}</SelectItem>
                    {customPaymentMethods.map((m) => (
                      <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <button type="button" onClick={() => { setNewMethodName(""); setAddMethodError(null); setAddMethodOpen(true); }} className="text-xs text-primary hover:underline">
                    ＋ Добавить метод оплаты
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.expenses.amount}</Label>
              <Input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} disabled={expenseLocked && !isAdmin} />
            </div>
            <div className="space-y-2">
              <Label>{t.expenses.comment}</Label>
              <Input value={formComment} onChange={(e) => setFormComment(e.target.value)} disabled={expenseLocked && !isAdmin} />
            </div>
            {expenseLocked && !isAdmin && (
              <div className="text-sm text-warning">{t.validation.closedMonthEdit}</div>
            )}
            {formError && (
              <div className="text-sm text-destructive">{formError}</div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave} disabled={expenseLocked && !isAdmin}>{t.common.save}</Button>
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
              placeholder="Название (напр. Uzcard, Humo...)"
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

export default Expenses;
