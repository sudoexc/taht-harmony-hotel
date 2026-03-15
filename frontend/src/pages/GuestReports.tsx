import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency, getNights, getMonthKey, getMonthRange, shiftDateStr, getTodayInTimeZone } from "@/lib/format";
import { Users, TrendingUp, Star, Repeat2, CalendarDays, Wallet } from "lucide-react";

const GOLD   = "hsl(38, 72%, 55%)";
const GREEN  = "hsl(145, 55%, 40%)";
const BLUE   = "hsl(217, 75%, 58%)";
const PURPLE = "hsl(280, 60%, 55%)";
const ORANGE = "hsl(25, 90%, 55%)";
const MUTED  = "hsl(220, 10%, 48%)";
const RED    = "hsl(0, 63%, 42%)";

const GuestReports = () => {
  const { language } = useLanguage();
  const { guests, stays, payments, hotel } = useData();
  const locale = language === "uz" ? "uz-UZ" : "ru-RU";
  const todayStr = getTodayInTimeZone(hotel.timezone);

  // ── Build per-guest stats ──────────────────────────────────────────────────
  const guestStats = useMemo(() => {
    const map: Record<string, {
      id: string; name: string; phone: string;
      stayCount: number; nights: number; revenue: number; lastStay: string;
    }> = {};

    for (const g of guests) {
      map[g.id] = { id: g.id, name: g.name, phone: g.phone, stayCount: 0, nights: 0, revenue: 0, lastStay: "" };
    }

    // Link stays to guests (by guest_id first, then name fallback for old stays)
    const resolveGuestId = (stay: typeof stays[0]): string | null => {
      if (stay.guest_id && map[stay.guest_id]) return stay.guest_id;
      const matched = guests.find(
        (g) => g.name === stay.guest_name && (!stay.guest_phone || g.phone === stay.guest_phone)
      );
      return matched?.id ?? null;
    };

    for (const stay of stays) {
      if (stay.status === "CANCELLED") continue;
      const gid = resolveGuestId(stay);
      if (!gid) continue;
      const nights = getNights(stay.check_in_date, stay.check_out_date);
      map[gid].stayCount++;
      map[gid].nights += nights;
      if (!map[gid].lastStay || stay.check_in_date > map[gid].lastStay) {
        map[gid].lastStay = stay.check_in_date;
      }
    }

    const stayIdToGuestId: Record<string, string> = {};
    for (const stay of stays) {
      if (stay.status === "CANCELLED") continue;
      const gid = resolveGuestId(stay);
      if (gid) stayIdToGuestId[stay.id] = gid;
    }

    for (const p of payments) {
      const gid = stayIdToGuestId[p.stay_id];
      if (gid && map[gid]) map[gid].revenue += p.amount;
    }

    return Object.values(map).filter((g) => g.stayCount > 0 || g.revenue > 0);
  }, [guests, stays, payments]);

  // ── KPI ───────────────────────────────────────────────────────────────────
  const totalGuests = guests.length;
  const activeGuests = guestStats.length;
  const returningGuests = guestStats.filter((g) => g.stayCount >= 2).length;
  const returningPct = activeGuests > 0 ? (returningGuests / activeGuests) * 100 : 0;
  const avgRevenue = activeGuests > 0
    ? guestStats.reduce((s, g) => s + g.revenue, 0) / activeGuests : 0;
  const avgStays = activeGuests > 0
    ? guestStats.reduce((s, g) => s + g.stayCount, 0) / activeGuests : 0;
  const avgNights = activeGuests > 0
    ? guestStats.reduce((s, g) => s + g.nights, 0) / activeGuests : 0;

  // ── Top by revenue ────────────────────────────────────────────────────────
  const topByRevenue = useMemo(
    () => [...guestStats].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    [guestStats]
  );

  // ── Top by nights ─────────────────────────────────────────────────────────
  const topByNights = useMemo(
    () => [...guestStats].sort((a, b) => b.nights - a.nights).slice(0, 10),
    [guestStats]
  );

  // ── Top by stay count ─────────────────────────────────────────────────────
  const topByStays = useMemo(
    () => [...guestStats].sort((a, b) => b.stayCount - a.stayCount).slice(0, 10),
    [guestStats]
  );

  // ── New guests per month (last 6 months) ──────────────────────────────────
  const newGuestsPerMonth = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(todayStr + "T00:00:00");
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const { start, end } = getMonthRange(key);
      const count = guests.filter((g) => g.created_at >= start && g.created_at <= end + "T23:59:59").length;
      result.push({
        label: d.toLocaleDateString(locale, { month: "short", year: "2-digit" }),
        count,
      });
    }
    return result;
  }, [guests, todayStr, locale]);

  // ── Frequency distribution ────────────────────────────────────────────────
  const frequencyData = useMemo(() => {
    const dist = { "1 раз": 0, "2 раза": 0, "3–5 раз": 0, "6+ раз": 0 };
    for (const g of guestStats) {
      if (g.stayCount === 1) dist["1 раз"]++;
      else if (g.stayCount === 2) dist["2 раза"]++;
      else if (g.stayCount <= 5) dist["3–5 раз"]++;
      else dist["6+ раз"]++;
    }
    return [
      { name: "1 раз",   value: dist["1 раз"],   color: MUTED },
      { name: "2 раза",  value: dist["2 раза"],  color: BLUE },
      { name: "3–5 раз", value: dist["3–5 раз"], color: GOLD },
      { name: "6+ раз",  value: dist["6+ раз"],  color: GREEN },
    ].filter((d) => d.value > 0);
  }, [guestStats]);

  // ── Recent guests (last 10 by last stay) ──────────────────────────────────
  const recentGuests = useMemo(
    () => [...guestStats].filter((g) => g.lastStay).sort((a, b) => b.lastStay.localeCompare(a.lastStay)).slice(0, 8),
    [guestStats]
  );

  const maxRevenue = topByRevenue[0]?.revenue || 1;
  const maxNights  = topByNights[0]?.nights   || 1;
  const maxStays   = topByStays[0]?.stayCount || 1;

  const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "hsl(228,22%,9%)", border: "1px solid hsl(228,16%,14%)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
        {label && <p style={{ marginBottom: 4, fontWeight: 600, color: "hsl(40,28%,92%)" }}>{label}</p>}
        {payload.map((e, i) => (
          <p key={i} style={{ color: e.color, marginBottom: 2 }}>
            {e.name}: {e.name === "Клиентов" ? e.value : formatCurrency(e.value, locale, "UZS")}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Аналитика клиентов</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Статистика по клиентской базе</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Всего клиентов",      value: totalGuests,            icon: Users,       color: "text-primary",     fmt: false, suffix: "" },
          { label: "Активных клиентов",   value: activeGuests,           icon: Star,        color: "text-success",     fmt: false, suffix: "" },
          { label: "Возвращаются",         value: returningPct,           icon: Repeat2,     color: "text-info",        fmt: false, suffix: "%" },
          { label: "Ср. выручка/клиент",  value: avgRevenue,             icon: Wallet,      color: "text-amber-500",   fmt: true,  suffix: "" },
          { label: "Ср. проживаний",      value: avgStays,               icon: CalendarDays,color: "text-purple-500",  fmt: false, suffix: " раз" },
          { label: "Ср. ночей",           value: avgNights,              icon: TrendingUp,  color: "text-orange-500",  fmt: false, suffix: " н." },
        ].map((card, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{card.label}</p>
              </div>
              <p className={`text-xl font-bold ${card.color}`}>
                {card.fmt
                  ? formatCurrency(Math.round(card.value), locale, "UZS")
                  : `${typeof card.value === "number" && !Number.isInteger(card.value) ? card.value.toFixed(1) : Math.round(card.value)}${card.suffix}`
                }
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New guests + Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Новые клиенты по месяцам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={newGuestsPerMonth} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradGuests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={BLUE} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={BLUE} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228,16%,14%)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={25} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="count" name="Клиентов" stroke={BLUE} strokeWidth={2} fill="url(#gradGuests)" dot={{ fill: BLUE, r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Частота визитов</CardTitle>
          </CardHeader>
          <CardContent>
            {frequencyData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Нет данных</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={frequencyData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                      {frequencyData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} клиентов`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {frequencyData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        {d.name}
                      </span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top by revenue */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Топ клиентов по выручке</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topByRevenue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет данных</p>
          ) : topByRevenue.map((g, idx) => (
            <div key={g.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${idx === 0 ? "gradient-gold text-white" : "bg-muted text-muted-foreground"}`}>
                    {idx + 1}
                  </span>
                  <span className="font-medium truncate max-w-[160px]">{g.name}</span>
                  {g.phone && <span className="text-muted-foreground hidden sm:block">{g.phone}</span>}
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{g.stayCount} раз</Badge>
                </span>
                <span className="font-bold tabular-nums">{formatCurrency(g.revenue, locale, "UZS")}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(g.revenue / maxRevenue) * 100}%`, background: idx === 0 ? GOLD : BLUE }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Top by nights + Top by stays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Топ по количеству ночей</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topByNights.map((g, idx) => (
              <div key={g.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${idx === 0 ? "gradient-gold text-white" : "bg-muted text-muted-foreground"}`}>
                      {idx + 1}
                    </span>
                    <span className="font-medium truncate max-w-[160px]">{g.name}</span>
                  </span>
                  <span className="font-bold">{g.nights} ночей</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(g.nights / maxNights) * 100}%`, background: idx === 0 ? GOLD : PURPLE }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <Repeat2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Топ по числу визитов</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topByStays.map((g, idx) => (
              <div key={g.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${idx === 0 ? "gradient-gold text-white" : "bg-muted text-muted-foreground"}`}>
                      {idx + 1}
                    </span>
                    <span className="font-medium truncate max-w-[160px]">{g.name}</span>
                    {g.phone && <span className="text-muted-foreground hidden sm:block">{g.phone}</span>}
                  </span>
                  <span className="font-bold">{g.stayCount}×</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(g.stayCount / maxStays) * 100}%`, background: idx === 0 ? GOLD : GREEN }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent guests */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Последние гости</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentGuests.map((g) => (
              <div key={g.id} className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5">
                <p className="text-sm font-semibold truncate">{g.name}</p>
                {g.phone && <p className="text-xs text-muted-foreground">{g.phone}</p>}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {g.lastStay ? new Date(g.lastStay + "T12:00:00Z").toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1.5">{g.stayCount}×</Badge>
                </div>
                <div className="text-xs font-medium" style={{ color: GOLD }}>
                  {formatCurrency(g.revenue, locale, "UZS")}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GuestReports;
