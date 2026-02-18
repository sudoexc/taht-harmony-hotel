import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportsService } from '../reports/reports.service.js';
import { addDays, formatDateOnly, monthKeyFromDate } from '../common/utils/date.js';
import { MonthClosing as PrismaMonthClosing } from '@prisma/client';

const mapClosing = (closing: PrismaMonthClosing) => ({
  id: closing.id,
  hotel_id: closing.hotelId,
  month: closing.month,
  closed_at: closing.closedAt.toISOString(),
  totals_json: closing.totalsJson ?? null,
});

@Injectable()
export class MonthClosingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
  ) {}

  async list(hotelId: string) {
    const closings = await this.prisma.monthClosing.findMany({
      where: { hotelId },
      orderBy: { month: 'desc' },
    });
    return closings.map(mapClosing);
  }

  async closePrevious(hotelId: string) {
    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const previousMonthKey = monthKeyFromDate(previousMonthStart);

    const existing = await this.prisma.monthClosing.findFirst({
      where: { hotelId, month: previousMonthKey },
    });
    if (existing) {
      return mapClosing(existing);
    }

    const previousMonthEnd = addDays(currentMonthStart, -1);
    const totals = await this.reports.buildReport(
      hotelId,
      formatDateOnly(previousMonthStart),
      formatDateOnly(previousMonthEnd),
    );

    const closing = await this.prisma.monthClosing.create({
      data: {
        hotelId,
        month: previousMonthKey,
        totalsJson: totals,
      },
    });

    return mapClosing(closing);
  }

  async reopen(hotelId: string, month: string) {
    const existing = await this.prisma.monthClosing.findFirst({
      where: { hotelId, month },
    });
    if (!existing) return { deleted: false };

    await this.prisma.monthClosing.delete({ where: { id: existing.id } });
    return { deleted: true };
  }
}
