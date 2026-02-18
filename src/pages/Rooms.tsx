import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Search, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { Room, RoomType } from "@/types";

const Rooms = () => {
  const { t, language } = useLanguage();
  const { rooms, addRoom, updateRoom, removeRoom } = useData();
  const { hotelId } = useAuth();
  const locale = language === 'uz' ? 'uz-UZ' : 'ru-RU';
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("roomAsc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);

  const [formNumber, setFormNumber] = useState("");
  const [formFloor, setFormFloor] = useState("1");
  const [formType, setFormType] = useState<RoomType>("STANDARD");
  const [formCapacity, setFormCapacity] = useState("2");
  const [formPrice, setFormPrice] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formNotes, setFormNotes] = useState("");

  const filteredRooms = rooms
    .filter((room) => {
      if (statusFilter === 'active' && !room.active) return false;
      if (statusFilter === 'inactive' && room.active) return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return (
        room.number.toLowerCase().includes(query) ||
        (room.notes || '').toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortKey) {
        case 'roomDesc':
          return b.number.localeCompare(a.number, 'en', { numeric: true });
        case 'priceAsc':
          return a.base_price - b.base_price;
        case 'priceDesc':
          return b.base_price - a.base_price;
        case 'floorAsc':
          return a.floor - b.floor;
        case 'floorDesc':
          return b.floor - a.floor;
        case 'roomAsc':
        default:
          return a.number.localeCompare(b.number, 'en', { numeric: true });
      }
    });

  const openAdd = () => {
    setEditingRoom(null);
    setFormNumber(""); setFormFloor("1"); setFormType("STANDARD");
    setFormCapacity("2"); setFormPrice(""); setFormActive(true); setFormNotes("");
    setDialogOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    setFormNumber(room.number); setFormFloor(String(room.floor));
    setFormType(room.room_type); setFormCapacity(String(room.capacity));
    setFormPrice(String(room.base_price)); setFormActive(room.active);
    setFormNotes(room.notes || "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    const roomData: Room = {
      id: editingRoom?.id || `room-${Date.now()}`,
      hotel_id: hotelId || '',
      number: formNumber,
      floor: parseInt(formFloor),
      room_type: formType,
      capacity: parseInt(formCapacity),
      base_price: parseInt(formPrice) || 0,
      active: formActive,
      notes: formNotes || null,
    };
    if (editingRoom) {
      updateRoom(roomData);
    } else {
      addRoom(roomData);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.rooms.title}</h1>
        <Button onClick={openAdd}><Plus className="mr-1 h-4 w-4" />{t.rooms.addRoom}</Button>
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
            <SelectItem value="active">{t.rooms.active}</SelectItem>
            <SelectItem value="inactive">{t.rooms.inactive}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder={t.common.sort} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="roomAsc">{t.sorting.roomAsc}</SelectItem>
            <SelectItem value="roomDesc">{t.sorting.roomDesc}</SelectItem>
            <SelectItem value="floorAsc">{t.sorting.floorAsc}</SelectItem>
            <SelectItem value="floorDesc">{t.sorting.floorDesc}</SelectItem>
            <SelectItem value="priceAsc">{t.sorting.priceAsc}</SelectItem>
            <SelectItem value="priceDesc">{t.sorting.priceDesc}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.rooms.number}</TableHead>
                <TableHead>{t.rooms.type}</TableHead>
                <TableHead>{t.rooms.floor}</TableHead>
                <TableHead>{t.rooms.capacity}</TableHead>
                <TableHead>{t.rooms.basePrice}</TableHead>
                <TableHead>{t.stays.status}</TableHead>
                <TableHead>{t.rooms.notes}</TableHead>
                <TableHead>{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRooms.map(room => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">#{room.number}</TableCell>
                  <TableCell>{t.roomType[room.room_type]}</TableCell>
                  <TableCell>{room.floor}</TableCell>
                  <TableCell>{room.capacity} {t.rooms.beds}</TableCell>
                  <TableCell>{formatCurrency(room.base_price, locale, t.common.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={room.active ? "default" : "secondary"}>
                      {room.active ? t.rooms.active : t.rooms.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{room.notes}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(room)} aria-label={t.common.edit}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteRoomId(room.id)} aria-label={t.common.delete}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteRoomId} onOpenChange={(open) => { if (!open) setDeleteRoomId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.common.confirmDeleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteRoomId) removeRoom(deleteRoomId); setDeleteRoomId(null); }}>
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoom ? t.rooms.editRoom : t.rooms.addRoom}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.rooms.number}</Label>
                <Input value={formNumber} onChange={e => setFormNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t.rooms.floor}</Label>
                <Input type="number" value={formFloor} onChange={e => setFormFloor(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.rooms.type}</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as RoomType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">{t.roomType.STANDARD}</SelectItem>
                    <SelectItem value="ECONOM">{t.roomType.ECONOM}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.rooms.capacity}</Label>
                <Input type="number" value={formCapacity} onChange={e => setFormCapacity(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.rooms.basePrice}</Label>
              <Input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>{t.rooms.active}</Label>
            </div>
            <div className="space-y-2">
              <Label>{t.rooms.notes}</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSave}>{t.common.save}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rooms;
