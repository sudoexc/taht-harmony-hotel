import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
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
import { Trash2, Plus } from "lucide-react";

const Settings = () => {
  const { t } = useLanguage();
  const { hotel, setHotel, users, addUser, updateUserRole, removeUser, customPaymentMethods, addCustomPaymentMethod, removeCustomPaymentMethod } = useData();
  const { role, isAdmin, user: currentUser } = useAuth();
  const [newMethodName, setNewMethodName] = useState("");
  const [methodError, setMethodError] = useState<string | null>(null);
  const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState(hotel.name);
  const [hotelTimezone, setHotelTimezone] = useState(hotel.timezone);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userFullName, setUserFullName] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("MANAGER");
  const [userError, setUserError] = useState<string | null>(null);
  const [userSubmitting, setUserSubmitting] = useState(false);

  useEffect(() => {
    setHotelName(hotel.name);
    setHotelTimezone(hotel.timezone);
  }, [hotel.name, hotel.timezone]);

  const resetUserForm = () => {
    setUserEmail("");
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

  const handleCreateUser = async () => {
    if (!userEmail || !userPassword || !userFullName) {
      setUserError(t.validation.required);
      return;
    }
    const emailOk = /\S+@\S+\.\S+/.test(userEmail);
    if (!emailOk) {
      setUserError(t.validation.invalidEmail);
      return;
    }
    if (userPassword.length < 6) {
      setUserError(t.validation.passwordMin);
      return;
    }
    setUserSubmitting(true);
    try {
      await addUser({
        email: userEmail,
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
                    <TableHead>{t.settings.email}</TableHead>
                    <TableHead>{t.settings.role}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>{profile.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        {profile.id !== currentUser?.id && (
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteUserId(profile.id)} aria-label={t.common.delete}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
                    <button onClick={() => setDeleteMethodId(m.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
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
              <Label>{t.settings.email}</Label>
              <Input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
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
    </div>
  );
};

export default Settings;
