import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Room, Stay } from "@/types";
import { shiftDateStr } from "@/lib/format";

const COLS = 30;

const BLOCK_COLORS: Record<string, string> = {
  BOOKED:      "bg-info/20 border-info/40 text-info",
  CHECKED_IN:  "bg-success/20 border-success/40 text-success",
  CHECKED_OUT: "bg-muted border-border text-muted-foreground",
  CANCELLED:   "bg-destructive/10 border-destructive/20 text-destructive/50",
};

const getBlockColor = (stay: Stay, todayStr: string): string => {
  if (stay.status === "CHECKED_IN" && stay.check_out_date === todayStr) {
    return "bg-destructive/20 border-destructive/50 text-destructive";
  }
  return BLOCK_COLORS[stay.status] ?? BLOCK_COLORS.CHECKED_OUT;
};

type Segment =
  | { type: "stay";  stay: Stay; span: number; startIdx: number }
  | { type: "empty"; startIdx: number };

interface Labels {
  room: string;
  today: string;
  roomTypes: Record<string, string>;
  noData: string;
  beds: string;
}

interface Props {
  rooms: Room[];
  stays: Stay[];
  todayStr: string;
  locale: string;
  labels: Labels;
  onOpenDetails: (stay: Stay) => void;
}

export function StaysChessBoard({ rooms, stays, todayStr, locale, labels, onOpenDetails }: Props) {
  const [offset, setOffset] = useState(-7); // start 7 days before today

  const dates = useMemo(() => {
    const arr: string[] = [];
    for (let i = offset; i < offset + COLS; i++) arr.push(shiftDateStr(todayStr, i));
    return arr;
  }, [offset, todayStr]);

  // Compute month header spans (e.g. "Февраль" x12, "Март" x18)
  const monthSpans = useMemo(() => {
    const spans: Array<{ label: string; count: number }> = [];
    for (const d of dates) {
      const label = new Date(d + "T00:00:00").toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
      });
      if (spans.length && spans[spans.length - 1].label === label) {
        spans[spans.length - 1].count++;
      } else {
        spans.push({ label, count: 1 });
      }
    }
    return spans;
  }, [dates, locale]);

  const activeRooms = useMemo(() => rooms.filter((r) => r.active), [rooms]);

  const getSegments = (roomId: string): Segment[] => {
    const segs: Segment[] = [];
    let i = 0;
    while (i < dates.length) {
      const d = dates[i];
      const stay = stays.find(
        (s) => s.room_id === roomId && s.check_in_date <= d && s.check_out_date > d,
      );
      if (stay) {
        let span = 1;
        while (i + span < dates.length && stay.check_out_date > dates[i + span]) span++;
        segs.push({ type: "stay", stay, span, startIdx: i });
        i += span;
      } else {
        segs.push({ type: "empty", startIdx: i });
        i++;
      }
    }
    return segs;
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Navigation */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs gap-1"
          onClick={() => setOffset((o) => o - 14)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          14
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs gap-1"
          onClick={() => setOffset((o) => o - 7)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          7
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="h-7 px-3 text-xs gap-1.5 mx-1"
          onClick={() => setOffset(-7)}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {labels.today}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs gap-1"
          onClick={() => setOffset((o) => o + 7)}
        >
          7
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs gap-1"
          onClick={() => setOffset((o) => o + 14)}
        >
          14
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <span className="ml-auto text-xs text-muted-foreground tabular-nums hidden sm:block">
          {dates[0]} — {dates[COLS - 1]}
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table
          style={{
            minWidth: `${80 + COLS * 36}px`,
            tableLayout: "fixed",
            borderCollapse: "collapse",
          }}
          className="text-sm w-full"
        >
          <colgroup>
            <col style={{ width: "80px" }} />
            {dates.map((d) => (
              <col key={d} style={{ width: "36px" }} />
            ))}
          </colgroup>

          <thead>
            {/* Month row */}
            <tr>
              <th className="sticky left-0 z-20 bg-muted/50 border-b border-r border-border" />
              {monthSpans.map((ms, i) => (
                <th
                  key={i}
                  colSpan={ms.count}
                  className="bg-muted/50 border-b border-r border-border py-1 text-center text-xs font-semibold text-muted-foreground capitalize"
                >
                  {ms.label}
                </th>
              ))}
            </tr>

            {/* Day row */}
            <tr>
              <th className="sticky left-0 z-20 bg-muted/40 border-b border-r border-border px-2 py-1 text-xs font-semibold text-muted-foreground text-left">
                {labels.room}
              </th>
              {dates.map((d) => {
                const isToday = d === todayStr;
                const date = new Date(d + "T00:00:00");
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <th
                    key={d}
                    className={`border-b border-r border-border/60 py-1 px-0 text-center select-none
                      ${isToday
                        ? "bg-primary/20 text-primary font-bold"
                        : isWeekend
                        ? "bg-muted/30 text-muted-foreground/60"
                        : "bg-muted/10 text-muted-foreground"
                      }`}
                  >
                    <div className="text-[11px] leading-none">{date.getDate()}</div>
                    <div className="text-[9px] opacity-60 leading-tight mt-0.5">
                      {date.toLocaleDateString(locale, { weekday: "short" })}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {activeRooms.map((room) => {
              const segs = getSegments(room.id);
              return (
                <tr key={room.id} className="group border-b border-border/40">
                  {/* Room label — sticky left */}
                  <td className="sticky left-0 z-10 bg-background border-r border-border px-2 py-1.5 group-hover:bg-muted/20 transition-colors">
                    <div className="text-xs font-bold leading-tight">#{room.number}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">
                      {labels.roomTypes[room.room_type] ?? room.room_type}
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 leading-tight">
                      {room.capacity} {labels.beds}
                    </div>
                  </td>

                  {segs.map((seg, idx) => {
                    if (seg.type === "empty") {
                      const isToday = dates[seg.startIdx] === todayStr;
                      return (
                        <td
                          key={idx}
                          className={`border-r border-border/25 h-11 ${isToday ? "bg-primary/5" : ""}`}
                        />
                      );
                    }

                    const { stay, span } = seg;
                    return (
                      <td
                        key={idx}
                        colSpan={span}
                        className="border-r border-border/25 h-11 p-0.5"
                      >
                        <div
                          className={`h-full rounded border px-1.5 py-0.5 cursor-pointer hover:opacity-75 active:opacity-60 transition-opacity overflow-hidden ${getBlockColor(stay, todayStr)}`}
                          onClick={() => onOpenDetails(stay)}
                          title={`${stay.guest_name} · ${stay.check_in_date} → ${stay.check_out_date}`}
                        >
                          <div className="text-[11px] font-semibold truncate leading-tight">
                            {stay.guest_name}
                          </div>
                          {span >= 3 && (
                            <div className="text-[9px] opacity-60 truncate leading-tight">
                              {stay.check_in_date.slice(5)} → {stay.check_out_date.slice(5)}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {activeRooms.length === 0 && (
              <tr>
                <td
                  colSpan={COLS + 1}
                  className="text-center py-10 text-sm text-muted-foreground"
                >
                  {labels.noData}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
