import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRole } from "@/types";
import { Trash2, Plus, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const Settings = () => {
  const { t } = useLanguage();
  const { hotel, setHotel, users, addUser, updateUser, updateUserRole, removeUser, customPaymentMethods, addCustomPaymentMethod, removeCustomPaymentMethod, payments, expenses, transfers, withdrawals } = useData();
  const { role, isAdmin, user: currentUser } = useAuth();
  const [newMethodName, setNewMethodName] = useState("");
  const [methodError, setMethodError] = useState<string | null>(null);
  const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);
  const [methodBalanceError, setMethodBalanceError] = useState<{ name: string; balance: number } | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState(hotel.name);
  const [hotelTimezone, setHotelTimezone] = useState(hotel.timezone);
  const [telegramGroupId, setTelegramGroupId] = useState("");
  const [tgSaving, setTgSaving] = useState(false);
  const [tgError, setTgError] = useState<string | null>(null);
  const [tgSaved, setTgSaved] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userFullName, setUserFullName] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("MANAGER");
  const [userError, setUserError] = useState<string | null>(null);
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    setHotelName(hotel.name);
    setHotelTimezone(hotel.timezone);
  }, [hotel.name, hotel.timezone]);

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch<{ telegram_group_id: string }>('/hotel-settings')
      .then((res) => setTelegramGroupId(res.telegram_group_id ?? ""))
      .catch(() => {});
  }, [isAdmin]);

  const handleSaveTelegram = async () => {
    setTgSaving(true);
    setTgError(null);
    setTgSaved(false);
    try {
      const res = await apiFetch<{ telegram_group_id: string }>('/hotel-settings', {
        method: 'PATCH',
        body: JSON.stringify({ telegram_group_id: telegramGroupId.trim() }),
      });
      setTelegramGroupId(res.telegram_group_id ?? "");
      setTgSaved(true);
      setTimeout(() => setTgSaved(false), 3000);
    } catch {
      setTgError("Не удалось сохранить");
    } finally {
      setTgSaving(false);
    }
  };

  const resetUserForm = () => {
    setUserUsername("");
    setUserPassword("");
    setUserFullName("");
    setUserRole("MANAGER");
    setUserError(null);
  };

  const handleAddMethod = async () => {
    const name = newMethodName.trim();
    if (!name) { setMethodError("Введите название"); return; }
    try {
      await addCustomPaymentMethod(name);
      setNewMethodName("");
      setMethodError(null);
    } catch {
      setMethodError("Метод уже существует или ошибка");
    }
  };

  const openEditUser = (profile: { id: string; full_name: string; username: string }) => {
    setEditUserId(profile.id);
    setEditFullName(profile.full_name);
    setEditUsername(profile.username);
    setEditPassword("");
    setEditError(null);
  };

  const handleEditUser = async () => {
    if (!editUserId) return;
    if (!editFullName.trim() || !editUsername.trim()) {
      setEditError(t.validation.required);
      return;
    }
    if (editPassword && editPassword.length < 6) {
      setEditError(t.validation.passwordMin);
      return;
    }
    setEditSubmitting(true);
    try {
      const payload: { full_name: string; username: string; password?: string } = {
        full_name: editFullName.trim(),
        username: editUsername.trim(),
      };
      if (editPassword) payload.password = editPassword;
      await updateUser(editUserId, payload);
      setEditUserId(null);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message;
      setEditError(msg === 'Username already exists' ? 'Логин уже занят' : (t.validation.required));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCreateUser = async () => {
    if (!userUsername || !userPassword || !userFullName) {
      setUserError(t.validation.required);
      return;
    }
    if (userPassword.length < 6) {
      setUserError(t.validation.passwordMin);
      return;
    }
    setUserSubmitting(true);
    try {
      await addUser({
        username: userUsername,
        password: userPassword,
        full_name: userFullName,
        role: userRole,
      });
      resetUserForm();
      setUserDialogOpen(false);
    } catch {
      setUserError(t.validation.userCreateFailed);
    } finally {
      setUserSubmitting(false);
    }
  };

  const balanceByMethod = useMemo(() => {
    const bal: Record<string, number> = {};
    for (const p of payments)   bal[p.method] = (bal[p.method] || 0) + p.amount;
    for (const e of expenses)   bal[e.method] = (bal[e.method] || 0) - e.amount;
    for (const w of withdrawals) bal[w.method] = (bal[w.method] || 0) - w.amount;
    for (const tr of transfers) {
      bal[tr.from_method] = (bal[tr.from_method] || 0) - tr.amount;
      bal[tr.to_method]   = (bal[tr.to_method]   || 0) + tr.amount;
    }
    return bal;
  }, [payments, expenses, transfers, withdrawals]);

  const handleDeleteMethodClick = (id: string) => {
    const method = customPaymentMethods.find(m => m.id === id);
    if (!method) return;
    const balance = balanceByMethod[method.name] || 0;
    if (balance > 0) {
      setMethodBalanceError({ name: method.name, balance });
    } else {
      setDeleteMethodId(id);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.settings.title}</h1>

      <Card>
        <CardHeader className="pb-3"><CardTitle>{t.settings.hotelName}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.settings.hotelName}</Label>
              <Input value={hotelName} onChange={(e) => setHotelName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.timezone}</Label>
              <Input value={hotelTimezone} onChange={(e) => setHotelTimezone(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => setHotel({ ...hotel, name: hotelName, timezone: hotelTimezone })}>{t.common.save}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle>{t.settings.currentRole}</CardTitle></CardHeader>
        <CardContent>
          <Badge variant={role === 'ADMIN' ? 'default' : 'secondary'}>
            {role ? t.roles[role] : t.roles.MANAGER}
          </Badge>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle>{t.settings.users}</CardTitle>
            <Button size="sm" onClick={() => { resetUserForm(); setUserDialogOpen(true); }}>
              {t.settings.addUser}
            </Button>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.common.noData}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.settings.fullName}</TableHead>
                    <TableHead>{t.settings.username}</TableHead>
                    <TableHead>{t.settings.role}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <span>{profile.full_name}</span>
                        {profile.is_owner && (
                          <span className="ml-2 text-xs text-muted-foreground font-medium border border-border rounded px-1.5 py-0.5">{t.settings.mainAdmin}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{profile.username}</TableCell>
                      <TableCell>
                        {profile.is_owner ? (
                          <span className="text-sm font-medium">{t.roles[profile.role]}</span>
                        ) : (
                          <Select
                            value={profile.role}
                            onValueChange={(value) => {
                              updateUserRole(profile.id, value as UserRole).catch(() => {
                                setUserError(t.validation.userRoleFailed);
                              });
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">{t.roles.ADMIN}</SelectItem>
                              <SelectItem value="MANAGER">{t.roles.MANAGER}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditUser(profile)} aria-label="Редактировать">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!profile.is_owner && profile.id !== currentUser?.id && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteUserId(profile.id)} aria-label={t.common.delete}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Методы оплаты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Название метода (напр. Uzcard, Humo...)"
                value={newMethodName}
                onChange={(e) => { setNewMethodName(e.target.value); setMethodError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMethod()}
                className="max-w-xs"
              />
              <Button size="sm" onClick={handleAddMethod}><Plus className="h-4 w-4 mr-1" />Добавить</Button>
            </div>
            {methodError && <p className="text-sm text-destructive">{methodError}</p>}
            {customPaymentMethods.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customPaymentMethods.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <button onClick={() => handleDeleteMethodClick(m.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {customPaymentMethods.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет кастомных методов. Добавьте выше.</p>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Telegram-уведомления</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>ID группы / канала</Label>
              <p className="text-xs text-muted-foreground">
                Добавьте бота в группу, назначьте его администратором, затем вставьте ID чата (например: <code>-1001234567890</code>).
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="-100xxxxxxxxxx"
                  value={telegramGroupId}
                  onChange={(e) => { setTelegramGroupId(e.target.value); setTgError(null); setTgSaved(false); }}
                  className="max-w-xs font-mono"
                />
                <Button size="sm" onClick={handleSaveTelegram} disabled={tgSaving}>
                  {tgSaving ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
              {tgError && <p className="text-sm text-destructive">{tgError}</p>}
              {tgSaved && <p className="text-sm text-green-600">Сохранено</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!methodBalanceError} onOpenChange={(open) => { if (!open) setMethodBalanceError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Невозможно удалить кассу</AlertDialogTitle>
            <AlertDialogDescription>
              В кассе <strong>«{methodBalanceError?.name}»</strong> есть средства:{" "}
              <strong>{formatCurrency(methodBalanceError?.balance ?? 0, "ru-RU", "сум")}</strong>.
              <br />
              Сначала выведите все средства или переведите их в другую кассу.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setMethodBalanceError(null)}>Понятно</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteMethodId} onOpenChange={(open) => { if (!open) setDeleteMethodId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.common.confirmDeleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteMethodId) removeCustomPaymentMethod(deleteMethodId); setDeleteMethodId(null); }}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => { if (!open) setDeleteUserId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.common.confirmDeleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteUserId) removeUser(deleteUserId); setDeleteUserId(null); }}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.addUser}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.settings.fullName}</Label>
              <Input value={userFullName} onChange={(e) => setUserFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.username}</Label>
              <Input type="text" value={userUsername} onChange={(e) => setUserUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.password}</Label>
              <Input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.role}</Label>
              <Select value={userRole} onValueChange={(v) => setUserRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t.roles.ADMIN}</SelectItem>
                  <SelectItem value="MANAGER">{t.roles.MANAGER}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {userError && (
              <div className="text-sm text-destructive">{userError}</div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCreateUser} disabled={userSubmitting}>{t.common.save}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editUserId} onOpenChange={(open) => { if (!open) setEditUserId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать пользователя</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.settings.fullName}</Label>
              <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.username}</Label>
              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.settings.password} <span className="text-muted-foreground text-xs">(оставьте пустым — не меняется)</span></Label>
              <Input type="password" placeholder="Новый пароль (мин. 6 символов)" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
            </div>
            {editError && <div className="text-sm text-destructive">{editError}</div>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditUserId(null)}>{t.common.cancel}</Button>
            <Button onClick={handleEditUser} disabled={editSubmitting}>{t.common.save}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
