import { useCallback, useEffect, useMemo, useState } from "react";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Search, Trash2, TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";
import { formatCurrency, formatDate, getTodayInTimeZone } from "@/lib/format";
import { Payment, Expense, Transfer, ExpenseCategory } from "@/types";
import { ApiError } from "@/lib/api";

type TxType = "payment" | "expense" | "transfer";
type TypeFilter = "all" | "income" | "expense" | "transfer";

interface Row {
  type: TxType;
  id: string;
  date: string;
  label: string;
  amount: number;
  method: string;
  fromMethod?: string;
  toMethod?: string;
  comment: string | null;
  raw: Payment | Expense | Transfer;
}

// categories built inside component using t.expenseCategory

const Finance = () => {
  const { t, language } = useLanguage();
  const {
    rooms, stays, payments, expenses, transfers,
    addPayment, updatePayment, removePayment,
    addExpense, updateExpense, removeExpense,
    addTransfer, updateTransfer, removeTransfer,
    hotel, customPaymentMethods, addCustomPaymentMethod,
  } = useData();
  const { hotelId, isAdmin } = useAuth();
  const { isDateLocked } = useMonthLock();
  const locale = language === "uz" ? "uz-UZ" : "ru-RU";

  const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
    { value: "SALARY",    label: t.expenseCategory.SALARY    },
    { value: "INVENTORY", label: t.expenseCategory.INVENTORY },
    { value: "UTILITIES", label: t.expenseCategory.UTILITIES },
    { value: "REPAIR",    label: t.expenseCategory.REPAIR    },
    { value: "MARKETING", label: t.expenseCategory.MARKETING },
    { value: "OTHER",     label: t.expenseCategory.OTHER     },
  ];

  // ── filters ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]     = useState("all");
  const [typeFilter, setTypeFilter]   = useState<TypeFilter>("all");
  const [search, setSearch]           = useState("");
  const [sortKey, setSortKey]         = useState("dateDesc");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [monthPicker, setMonthPicker] = useState("");
  const [page, setPage]               = useState(1);
  const PAGE_SIZE = 80;

  const handleMonthChange = (month: string) => {
    setMonthPicker(month);
    if (!month) { setDateFrom(""); setDateTo(""); return; }
    const [y, m] = month.split("-").map(Number);
    const first = `${month}-01`;
    const last  = new Date(y, m, 0).toISOString().slice(0, 10); // last day of month
    setDateFrom(first);
    setDateTo(last);
  };
  const handleDateFromChange = (v: string) => { setDateFrom(v); setMonthPicker(""); };
  const handleDateToChange   = (v: string) => { setDateTo(v);   setMonthPicker(""); };
  const resetDateFilter = () => { setDateFrom(""); setDateTo(""); setMonthPicker(""); };

  // reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [activeTab, typeFilter, search, sortKey, dateFrom, dateTo]);

  // ── payment dialog ────────────────────────────────────────────────────────
  const [payDialog, setPayDialog]         = useState(false);
  const [editingPay, setEditingPay]       = useState<Payment | null>(null);
  const [payStayId, setPayStayId]         = useState("");
  const [payDate, setPayDate]             = useState("");
  const [payMethod, setPayMethod]         = useState("");
  const [payAmount, setPayAmount]         = useState("");
  const [payComment, setPayComment]       = useState("");
  const [payError, setPayError]           = useState<string | null>(null);

  // ── expense dialog ────────────────────────────────────────────────────────
  const [expDialog, setExpDialog]         = useState(false);
  const [editingExp, setEditingExp]       = useState<Expense | null>(null);
  const [expDate, setExpDate]             = useState("");
  const [expCategory, setExpCategory]     = useState<ExpenseCategory>("OTHER");
  const [expMethod, setExpMethod]         = useState("");
  const [expAmount, setExpAmount]         = useState("");
  const [expComment, setExpComment]       = useState("");
  const [expError, setExpError]           = useState<string | null>(null);

  // ── transfer dialog ───────────────────────────────────────────────────────
  const [trDialog, setTrDialog]           = useState(false);
  const [editingTr, setEditingTr]         = useState<Transfer | null>(null);
  const [trDate, setTrDate]               = useState("");
  const [trFrom, setTrFrom]               = useState("");
  const [trTo, setTrTo]                   = useState("");
  const [trAmount, setTrAmount]           = useState("");
  const [trComment, setTrComment]         = useState("");
  const [trError, setTrError]             = useState<string | null>(null);

  // ── shared ────────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget]   = useState<Row | null>(null);
  const [actionError, setActionError]     = useState<string | null>(null);
  const [addMethodOpen, setAddMethodOpen] = useState(false);
  const [newMethodName, setNewMethodName] = useState("");
  const [addMethodError, setAddMethodError] = useState<string | null>(null);

  const getPayMethod  = (p: Payment) => p.custom_method_label || p.method;
  const getExpMethod  = (e: Expense) => e.custom_method_label || e.method;

  const getStayInfo = useCallback((stayId: string) => {
    const stay = stays.find(s => s.id === stayId);
    const room = stay ? rooms.find(r => r.id === stay.room_id) : null;
    return { roomNumber: room?.number || "?", guestName: stay?.guest_name || "?" };
  }, [rooms, stays]);

  // ── balance per method ────────────────────────────────────────────────────
  const balanceByMethod = useMemo(() => {
    const inc: Record<string, number> = {};
    const out: Record<string, number> = {};
    for (const m of customPaymentMethods) { inc[m.name] = 0; out[m.name] = 0; }
    for (const p of payments)  { const l = getPayMethod(p); inc[l] = (inc[l] || 0) + p.amount; }
    for (const e of expenses)  { const l = getExpMethod(e); out[l] = (out[l] || 0) + e.amount; }
    // transfers: reduce fromMethod, increase toMethod
    for (const tr of transfers) {
      out[tr.from_method] = (out[tr.from_method] || 0) + tr.amount;
      inc[tr.to_method]   = (inc[tr.to_method]   || 0) + tr.amount;
    }
    const bal: Record<string, number> = {};
    const all = new Set([...Object.keys(inc), ...Object.keys(out)]);
    let total = 0;
    for (const k of all) { bal[k] = (inc[k] || 0) - (out[k] || 0); total += bal[k]; }
    bal["__all__"] = total;
    return bal;
  }, [payments, expenses, transfers, customPaymentMethods]);

  // ── unified rows ──────────────────────────────────────────────────────────
  const allRows = useMemo((): Row[] => {
    const pRows: Row[] = payments.map(p => {
      const info = getStayInfo(p.stay_id);
      return {
        type: "payment", id: p.id, date: p.paid_at,
        label: `#${info.roomNumber} · ${info.guestName}`,
        amount: p.amount, method: getPayMethod(p),
        comment: p.comment, raw: p,
      };
    });
    const eRows: Row[] = expenses.map(e => {
      const cat = EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category;
      return {
        type: "expense", id: e.id, date: e.spent_at,
        label: cat,
        amount: e.amount, method: getExpMethod(e),
        comment: e.comment, raw: e,
      };
    });
    const trRows: Row[] = transfers.map(tr => ({
      type: "transfer", id: tr.id, date: tr.transferred_at,
      label: `${tr.from_method} → ${tr.to_method}`,
      amount: tr.amount, method: tr.from_method,
      fromMethod: tr.from_method, toMethod: tr.to_method,
      comment: tr.comment, raw: tr,
    }));
    return [...pRows, ...eRows, ...trRows];
  }, [payments, expenses, transfers, getStayInfo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows
      .filter(row => {
        // tab filter: transfers visible if either from or to matches the tab
        if (activeTab !== "all") {
          if (row.type === "transfer") {
            if (row.fromMethod !== activeTab && row.toMethod !== activeTab) return false;
          } else {
            if (row.method !== activeTab) return false;
          }
        }
        if (typeFilter === "income"   && row.type !== "payment")  return false;
        if (typeFilter === "expense"  && row.type !== "expense")  return false;
        if (typeFilter === "transfer" && row.type !== "transfer") return false;
        const rowDate = row.date.slice(0, 10);
        if (dateFrom && rowDate < dateFrom) return false;
        if (dateTo   && rowDate > dateTo)   return false;
        if (!q) return true;
        return row.label.toLowerCase().includes(q) || (row.comment || "").toLowerCase().includes(q) || row.method.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        switch (sortKey) {
          case "amountAsc":  return a.amount - b.amount;
          case "amountDesc": return b.amount - a.amount;
          case "dateAsc":    return a.date.localeCompare(b.date);
          default:           return b.date.localeCompare(a.date);
        }
      });
  }, [allRows, activeTab, typeFilter, search, sortKey, dateFrom, dateTo]);

  // totals for current filter
  const totals = useMemo(() => {
    let inc = 0, out = 0;
    for (const row of filtered) {
      if (row.type === "payment") {
        if (row.amount >= 0) inc += row.amount;
        else out += Math.abs(row.amount);
      }
      else if (row.type === "expense") out += row.amount;
      // transfers: if a specific register tab is active, count direction
      else if (row.type === "transfer" && activeTab !== "all") {
        if (row.toMethod === activeTab)   inc += row.amount;
        if (row.fromMethod === activeTab) out += row.amount;
      }
    }
    return { inc, out, net: inc - out };
  }, [filtered, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── payment handlers ──────────────────────────────────────────────────────
  const openAddPay = () => {
    setEditingPay(null);
    setPayStayId(stays[0]?.id || "");
    setPayDate(getTodayInTimeZone(hotel.timezone));
    setPayMethod(activeTab !== "all" ? activeTab : (customPaymentMethods[0]?.name || ""));
    setPayAmount(""); setPayComment(""); setPayError(null);
    setPayDialog(true);
  };
  const openEditPay = (p: Payment) => {
    setEditingPay(p);
    setPayStayId(p.stay_id);
    setPayDate(p.paid_at.split("T")[0]);
    setPayMethod(getPayMethod(p));
    setPayAmount(String(p.amount)); setPayComment(p.comment || ""); setPayError(null);
    setPayDialog(true);
  };
  const payLocked = editingPay ? isDateLocked(editingPay.paid_at) : isDateLocked(payDate);
  const handleSavePay = () => {
    const amount = Number(payAmount);
    if (!payStayId || !payDate) { setPayError(t.validation.required); return; }
    if (!payMethod) { setPayError(t.finance.selectRegister); return; }
    if (!amount || amount <= 0) { setPayError(t.validation.amountPositive); return; }
    if (payLocked && !isAdmin) { setPayError(t.validation.closedMonthEdit); return; }
    const payload: Payment = {
      id: editingPay?.id || `pay-${Date.now()}`,
      hotel_id: hotelId || "", stay_id: payStayId,
      paid_at: new Date(`${payDate}T12:00:00Z`).toISOString(),
      method: "OTHER", custom_method_label: payMethod,
      amount, comment: payComment,
    };
    editingPay ? updatePayment(payload) : addPayment(payload);
    setPayDialog(false);
  };

  // ── expense handlers ──────────────────────────────────────────────────────
  const openAddExp = () => {
    setEditingExp(null);
    setExpDate(getTodayInTimeZone(hotel.timezone));
    setExpCategory("OTHER");
    setExpMethod(activeTab !== "all" ? activeTab : (customPaymentMethods[0]?.name || ""));
    setExpAmount(""); setExpComment(""); setExpError(null);
    setExpDialog(true);
  };
  const openEditExp = (e: Expense) => {
    setEditingExp(e);
    setExpDate(e.spent_at.split("T")[0]);
    setExpCategory(e.category);
    setExpMethod(getExpMethod(e));
    setExpAmount(String(e.amount)); setExpComment(e.comment || ""); setExpError(null);
    setExpDialog(true);
  };
  const expLocked = editingExp ? isDateLocked(editingExp.spent_at) : isDateLocked(expDate);
  const handleSaveExp = () => {
    const amount = Number(expAmount);
    if (!expDate) { setExpError(t.validation.required); return; }
    if (!expMethod) { setExpError(t.finance.selectRegister); return; }
    if (!amount || amount <= 0) { setExpError(t.validation.amountPositive); return; }
    if (expLocked && !isAdmin) { setExpError(t.validation.closedMonthEdit); return; }
    const currentBalance = balanceByMethod[expMethod] ?? 0;
    const oldAmount = editingExp && getExpMethod(editingExp) === expMethod ? editingExp.amount : 0;
    const available = currentBalance + oldAmount;
    if (amount > available) {
      setExpError(`${t.finance.insufficientFunds} «${expMethod}». ${t.finance.available}: ${formatCurrency(available, locale, t.common.currency)}`);
      return;
    }
    const payload: Expense = {
      id: editingExp?.id || `exp-${Date.now()}`,
      hotel_id: hotelId || "",
      spent_at: new Date(`${expDate}T12:00:00Z`).toISOString(),
      category: expCategory, method: "OTHER", custom_method_label: expMethod,
      amount, comment: expComment,
    };
    editingExp ? updateExpense(payload) : addExpense(payload);
    setExpDialog(false);
  };

  // ── transfer handlers ─────────────────────────────────────────────────────
  const openAddTr = () => {
    setEditingTr(null);
    setTrDate(getTodayInTimeZone(hotel.timezone));
    setTrFrom(customPaymentMethods[0]?.name || "");
    setTrTo(customPaymentMethods[1]?.name || customPaymentMethods[0]?.name || "");
    setTrAmount(""); setTrComment(""); setTrError(null);
    setTrDialog(true);
  };
  const openEditTr = (tr: Transfer) => {
    setEditingTr(tr);
    setTrDate(tr.transferred_at.split("T")[0]);
    setTrFrom(tr.from_method);
    setTrTo(tr.to_method);
    setTrAmount(String(tr.amount)); setTrComment(tr.comment || ""); setTrError(null);
    setTrDialog(true);
  };
  const trLocked = editingTr ? isDateLocked(editingTr.transferred_at) : isDateLocked(trDate);
  const handleSaveTr = async () => {
    const amount = Number(trAmount);
    if (!trDate || !trFrom || !trTo) { setTrError(t.validation.required); return; }
    if (trFrom === trTo) { setTrError(t.finance.transferSameError); return; }
    if (!amount || amount <= 0) { setTrError(t.validation.amountPositive); return; }
    if (trLocked && !isAdmin) { setTrError(t.validation.closedMonthEdit); return; }
    const fromBal = balanceByMethod[trFrom] ?? 0;
    const oldAmount = editingTr && editingTr.from_method === trFrom ? editingTr.amount : 0;
    const available = fromBal + oldAmount;
    if (amount > available) {
      setTrError(`${t.finance.insufficientFunds} «${trFrom}». ${t.finance.available}: ${formatCurrency(available, locale, t.common.currency)}`);
      return;
    }
    const transferred_at = new Date(`${trDate}T12:00:00Z`).toISOString();
    try {
      if (editingTr) {
        await updateTransfer({ ...editingTr, transferred_at, from_method: trFrom, to_method: trTo, amount, comment: trComment });
      } else {
        await addTransfer({ transferred_at, from_method: trFrom, to_method: trTo, amount, comment: trComment });
      }
      setTrDialog(false);
    } catch {
      setTrError(t.validation.saveFailed);
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "payment") await removePayment(deleteTarget.id);
      else if (deleteTarget.type === "expense") await removeExpense(deleteTarget.id);
      else await removeTransfer(deleteTarget.id);
      setDeleteTarget(null); setActionError(null);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 403) setActionError(t.validation.closedMonthEdit);
        else setActionError(t.validation.deleteFailed);
      } else setActionError(t.validation.deleteFailed);
      setDeleteTarget(null);
    }
  };

  const handleAddMethod = async () => {
    const name = newMethodName.trim();
    if (!name) { setAddMethodError(t.finance.enterName); return; }
    try {
      await addCustomPaymentMethod(name);
      setNewMethodName(""); setAddMethodError(null); setAddMethodOpen(false);
    } catch { setAddMethodError(t.finance.methodExists); }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{t.finance.title}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openAddExp}>
            <TrendingDown className="mr-1 h-4 w-4 text-destructive" />{t.finance.expense}
          </Button>
          <Button variant="outline" onClick={openAddTr}>
            <ArrowLeftRight className="mr-1 h-4 w-4 text-blue-500" />{t.finance.transfer}
          </Button>
          <Button onClick={openAddPay}>
            <TrendingUp className="mr-1 h-4 w-4" />{t.finance.income}
          </Button>
        </div>
      </div>

      {/* Cash register tabs */}
      <div className="flex flex-wrap gap-2">
        {(() => {
          const bal = balanceByMethod["__all__"] || 0;
          const isActive = activeTab === "all";
          return (
            <button onClick={() => setActiveTab("all")}
              className={`flex flex-col items-start px-4 py-2 rounded-lg border text-sm transition-colors ${isActive ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"}`}>
              <span className="font-medium">{t.common.all}</span>
              <span className={`text-xs ${isActive ? "text-primary-foreground/80" : bal >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(bal, locale, t.common.currency)}
              </span>
            </button>
          );
        })()}
        {customPaymentMethods.map(m => {
          const bal = balanceByMethod[m.name] ?? 0;
          const isActive = activeTab === m.name;
          return (
            <button key={m.id} onClick={() => setActiveTab(m.name)}
              className={`flex flex-col items-start px-4 py-2 rounded-lg border text-sm transition-colors ${isActive ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"}`}>
              <span className="font-medium">{m.name}</span>
              <span className={`text-xs ${isActive ? "text-primary-foreground/80" : bal >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(bal, locale, t.common.currency)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters row 1 */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.common.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
        </div>
        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.finance.allOps}</SelectItem>
            <SelectItem value="income">{t.finance.onlyIncome}</SelectItem>
            <SelectItem value="expense">{t.finance.onlyExpense}</SelectItem>
            <SelectItem value="transfer">{t.finance.onlyTransfer}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dateDesc">{t.sorting.dateDesc}</SelectItem>
            <SelectItem value="dateAsc">{t.sorting.dateAsc}</SelectItem>
            <SelectItem value="amountDesc">{t.sorting.amountDesc}</SelectItem>
            <SelectItem value="amountAsc">{t.sorting.amountAsc}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filters row 2 — date range */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">{t.finance.month}:</span>
          <Input type="month" value={monthPicker} onChange={e => handleMonthChange(e.target.value)} className="w-[160px]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">{t.common.from}:</span>
          <Input type="date" value={dateFrom} onChange={e => handleDateFromChange(e.target.value)} className="w-[160px]" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{t.common.to}:</span>
          <Input type="date" value={dateTo} onChange={e => handleDateToChange(e.target.value)} className="w-[160px]" />
        </div>
        {(dateFrom || dateTo || monthPicker) && (
          <Button variant="ghost" size="sm" onClick={resetDateFilter}>
            {t.common.reset}
          </Button>
        )}
      </div>

      {/* Summary strip */}
      <div className="flex gap-4 text-sm flex-wrap">
        <span className="text-success font-medium">↑ {t.finance.incomes}: {formatCurrency(totals.inc, locale, t.common.currency)}</span>
        <span className="text-destructive font-medium">↓ {t.finance.expenses}: {formatCurrency(totals.out, locale, t.common.currency)}</span>
        <span className={`font-bold ${totals.net >= 0 ? "text-success" : "text-destructive"}`}>
          = {formatCurrency(totals.net, locale, t.common.currency)}
        </span>
      </div>

      {actionError && <div className="text-sm text-destructive">{actionError}</div>}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.finance.date}</TableHead>
                <TableHead>{t.finance.type}</TableHead>
                <TableHead>{t.finance.description}</TableHead>
                <TableHead>{t.payments.amount}</TableHead>
                <TableHead>{t.finance.register}</TableHead>
                <TableHead>{t.payments.comment}</TableHead>
                {isAdmin && <TableHead>{t.finance.addedBy}</TableHead>}
                <TableHead>{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map(row => {
                const isPayment  = row.type === "payment";
                const isRefund  = isPayment && row.amount < 0;
                const isTransfer = row.type === "transfer";
                const locked = isDateLocked(row.date);
                const createdByName = row.type === "expense" ? (row.raw as Expense).created_by_name : undefined;
                // for transfer: show direction relative to active tab
                const trIsOut = isTransfer && activeTab !== "all" && row.fromMethod === activeTab;
                const trIsIn  = isTransfer && activeTab !== "all" && row.toMethod   === activeTab;
                return (
                  <TableRow key={`${row.type}-${row.id}`}>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(row.date, locale)}</TableCell>
                    <TableCell>
                      {isRefund
                        ? <Badge className="bg-destructive/15 text-destructive border-destructive/30 border">↩ Возврат</Badge>
                        : isPayment
                          ? <Badge className="bg-success/15 text-success border-success/30 border">↑ {t.finance.income}</Badge>
                          : isTransfer
                            ? <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 border">⇄ {t.finance.transfer}</Badge>
                            : <Badge className="bg-destructive/15 text-destructive border-destructive/30 border">↓ {t.finance.expense}</Badge>
                      }
                    </TableCell>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className={`font-bold ${isRefund ? "text-destructive" : isPayment || trIsIn ? "text-success" : isTransfer && !trIsIn && !trIsOut ? "text-muted-foreground" : "text-destructive"}`}>
                      {isRefund ? "−" : isPayment || trIsIn ? "+" : isTransfer && !trIsIn && !trIsOut ? "" : "−"}
                      {formatCurrency(Math.abs(row.amount), locale, t.common.currency)}
                    </TableCell>
                    <TableCell>
                      {isTransfer
                        ? <Badge variant="outline">{row.fromMethod} → {row.toMethod}</Badge>
                        : <Badge variant="outline">{row.method}</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{row.comment}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-muted-foreground text-xs">
                        {isPayment || isTransfer ? "—" : (createdByName || "—")}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button variant="ghost" size="icon" disabled={locked && !isAdmin}
                        onClick={() => {
                          if (isPayment) openEditPay(row.raw as Payment);
                          else if (isTransfer) openEditTr(row.raw as Transfer);
                          else openEditExp(row.raw as Expense);
                        }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={locked && !isAdmin}
                        onClick={() => { setActionError(null); setDeleteTarget(row); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">{t.common.noData}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {t.finance.records} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} {t.finance.outOf} {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1}>«</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…"
                  ? <span key={`ellipsis-${i}`} className="px-2">…</span>
                  : <Button key={p} variant={page === p ? "default" : "outline"} size="sm"
                      className="w-9" onClick={() => setPage(p as number)}>{p}</Button>
              )
            }
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</Button>
          </div>
        </div>
      )}

      {/* ── Payment dialog ── */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPay ? t.finance.editIncome : t.finance.newIncome}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.finance.stay}</Label>
              <Select value={payStayId} onValueChange={setPayStayId}>
                <SelectTrigger disabled={payLocked && !isAdmin}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stays.map(s => (
                    <SelectItem key={s.id} value={s.id}>#{getStayInfo(s.id).roomNumber} · {s.guest_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.finance.date}</Label>
                <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} disabled={payLocked && !isAdmin} />
              </div>
              <div className="space-y-2">
                <Label>{t.finance.register}</Label>
                <div className="flex gap-2">
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger disabled={payLocked && !isAdmin}><SelectValue placeholder={t.finance.selectRegister} /></SelectTrigger>
                    <SelectContent>
                      {customPaymentMethods.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {isAdmin && (
                    <Button type="button" variant="outline" size="icon" onClick={() => { setNewMethodName(""); setAddMethodError(null); setAddMethodOpen(true); }}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.payments.amount}</Label>
              <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} disabled={payLocked && !isAdmin} />
            </div>
            <div className="space-y-2">
              <Label>{t.payments.comment}</Label>
              <Input value={payComment} onChange={e => setPayComment(e.target.value)} disabled={payLocked && !isAdmin} />
            </div>
            {payError && <p className="text-sm text-destructive">{payError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayDialog(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSavePay} disabled={payLocked && !isAdmin}>{t.common.save}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Expense dialog ── */}
      <Dialog open={expDialog} onOpenChange={setExpDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingExp ? t.finance.editExpense : t.finance.newExpense}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.finance.date}</Label>
                <Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} disabled={expLocked && !isAdmin} />
              </div>
              <div className="space-y-2">
                <Label>{t.expenses.category}</Label>
                <Select value={expCategory} onValueChange={v => setExpCategory(v as ExpenseCategory)}>
                  <SelectTrigger disabled={expLocked && !isAdmin}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.finance.register}</Label>
              <div className="flex gap-2">
                <Select value={expMethod} onValueChange={v => { setExpMethod(v); setExpError(null); }}>
                  <SelectTrigger disabled={expLocked && !isAdmin}><SelectValue placeholder={t.finance.selectRegister} /></SelectTrigger>
                  <SelectContent>
                    {customPaymentMethods.map(m => {
                      const bal = balanceByMethod[m.name] ?? 0;
                      return (
                        <SelectItem key={m.id} value={m.name} disabled={bal <= 0}>
                          {m.name}
                          <span className={`ml-2 text-xs ${bal > 0 ? "text-success" : "text-destructive"}`}>
                            {formatCurrency(bal, locale, t.common.currency)}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <Button type="button" variant="outline" size="icon" onClick={() => { setNewMethodName(""); setAddMethodError(null); setAddMethodOpen(true); }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {expMethod && (
                <p className={`text-xs ${(balanceByMethod[expMethod] ?? 0) > 0 ? "text-muted-foreground" : "text-destructive font-medium"}`}>
                  {t.finance.registerBalance}: {formatCurrency(balanceByMethod[expMethod] ?? 0, locale, t.common.currency)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t.payments.amount}</Label>
              <Input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} disabled={expLocked && !isAdmin} />
            </div>
            <div className="space-y-2">
              <Label>{t.payments.comment}</Label>
              <Input value={expComment} onChange={e => setExpComment(e.target.value)} disabled={expLocked && !isAdmin} />
            </div>
            {expError && <p className="text-sm text-destructive">{expError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setExpDialog(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSaveExp} disabled={expLocked && !isAdmin}>{t.common.save}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Transfer dialog ── */}
      <Dialog open={trDialog} onOpenChange={setTrDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTr ? t.finance.editTransfer : t.finance.newTransfer}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.finance.date}</Label>
              <Input type="date" value={trDate} onChange={e => setTrDate(e.target.value)} disabled={trLocked && !isAdmin} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.finance.fromRegister}</Label>
                <Select value={trFrom} onValueChange={v => { setTrFrom(v); setTrError(null); }}>
                  <SelectTrigger disabled={trLocked && !isAdmin}><SelectValue placeholder={t.finance.selectRegister} /></SelectTrigger>
                  <SelectContent>
                    {customPaymentMethods.map(m => {
                      const bal = balanceByMethod[m.name] ?? 0;
                      return (
                        <SelectItem key={m.id} value={m.name} disabled={bal <= 0 && m.name !== editingTr?.from_method}>
                          {m.name}
                          <span className={`ml-2 text-xs ${bal > 0 ? "text-success" : "text-destructive"}`}>
                            {formatCurrency(bal, locale, t.common.currency)}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {trFrom && (
                  <p className={`text-xs ${(balanceByMethod[trFrom] ?? 0) > 0 ? "text-muted-foreground" : "text-destructive font-medium"}`}>
                    {t.finance.registerBalance}: {formatCurrency(balanceByMethod[trFrom] ?? 0, locale, t.common.currency)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t.finance.toRegister}</Label>
                <Select value={trTo} onValueChange={v => { setTrTo(v); setTrError(null); }}>
                  <SelectTrigger disabled={trLocked && !isAdmin}><SelectValue placeholder={t.finance.selectRegister} /></SelectTrigger>
                  <SelectContent>
                    {customPaymentMethods.map(m => (
                      <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.payments.amount}</Label>
              <Input type="number" value={trAmount} onChange={e => setTrAmount(e.target.value)} disabled={trLocked && !isAdmin} />
            </div>
            <div className="space-y-2">
              <Label>{t.payments.comment}</Label>
              <Input value={trComment} onChange={e => setTrComment(e.target.value)} disabled={trLocked && !isAdmin} />
            </div>
            {trError && <p className="text-sm text-destructive">{trError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTrDialog(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSaveTr} disabled={trLocked && !isAdmin}>{t.common.save}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add method dialog ── */}
      <Dialog open={addMethodOpen} onOpenChange={setAddMethodOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t.finance.newRegister}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder={t.finance.registerNamePlaceholder} value={newMethodName}
              onChange={e => { setNewMethodName(e.target.value); setAddMethodError(null); }}
              onKeyDown={e => e.key === "Enter" && handleAddMethod()} autoFocus />
            {addMethodError && <p className="text-sm text-destructive">{addMethodError}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddMethodOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAddMethod}>{t.common.save}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
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

export default Finance;
