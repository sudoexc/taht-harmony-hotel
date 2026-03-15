import { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Phone, User } from "lucide-react";
import { Guest } from "@/types";

const Guests = () => {
  const { t } = useLanguage();
  const { guests, stays, addGuest, updateGuest, removeGuest } = useData();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const stayCountByGuest = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of stays) {
      if (s.status === "CANCELLED") continue;
      const guest = guests.find(
        (g) => g.name === s.guest_name && (g.phone === s.guest_phone || !s.guest_phone)
      );
      if (guest) counts[guest.id] = (counts[guest.id] || 0) + 1;
    }
    return counts;
  }, [guests, stays]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return guests;
    return guests.filter(
      (g) => g.name.toLowerCase().includes(q) || g.phone.includes(q)
    );
  }, [guests, search]);

  const openAdd = () => {
    setEditingGuest(null);
    setFormName(""); setFormPhone(""); setFormNotes("");
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setFormName(guest.name);
    setFormPhone(guest.phone);
    setFormNotes(guest.notes);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError(t.validation?.required || "Заполните имя"); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingGuest) {
        await updateGuest(editingGuest.id, { name: formName.trim(), phone: formPhone.trim(), notes: formNotes.trim() });
      } else {
        await addGuest({ name: formName.trim(), phone: formPhone.trim(), notes: formNotes.trim() });
      }
      setDialogOpen(false);
    } catch {
      setFormError("Ошибка при сохранении");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.guests.title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{guests.length} клиентов в базе</p>
        </div>
        <Button className="gradient-gold text-white border-0 hover:opacity-90 glow-gold-sm" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" />{t.guests.addGuest}
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.guests.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t.guests.noGuests}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.guests.name}</TableHead>
                  <TableHead>{t.guests.phone}</TableHead>
                  <TableHead>{t.guests.notes}</TableHead>
                  <TableHead className="text-center">{t.guests.totalStays}</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((guest) => {
                  const count = stayCountByGuest[guest.id] || 0;
                  return (
                    <TableRow key={guest.id}>
                      <TableCell className="font-medium">{guest.name}</TableCell>
                      <TableCell>
                        {guest.phone ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {guest.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {guest.notes || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {count > 0 ? (
                          <Badge variant="secondary">{count}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(guest)} aria-label={t.common.edit}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(guest.id)}
                            aria-label={t.common.delete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGuest ? t.guests.editGuest : t.guests.addGuest}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t.guests.name} *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Иван Иванов" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>{t.guests.phone}</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+998 90 123 45 67" />
            </div>
            <div className="space-y-2">
              <Label>{t.guests.notes}</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Заметки о клиенте..." rows={3} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
              <Button onClick={handleSave} disabled={submitting} className="gradient-gold text-white border-0 hover:opacity-90">
                {t.common.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.common.confirmDeleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) removeGuest(deleteId); setDeleteId(null); }}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Guests;
