import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentMethod, ExpenseCategory } from '@prisma/client';
import { addDays, diffDaysInclusive, overlapNights, parseDateOnly } from '../common/utils/date.js';

const toNumber = (value: unknown) => Number(value ?? 0);

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async buildReport(hotelId: string, from: string, to: string) {
    const rangeStart = parseDateOnly(from);
    const rangeEnd = parseDateOnly(to);

    if (rangeEnd < rangeStart) {
      throw new BadRequestException('Invalid date range');
    }

    const rangeEndExclusive = addDays(rangeEnd, 1);

    const [payments, expenses, stays, activeRooms] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          hotelId,
          paidAt: { gte: rangeStart, lt: rangeEndExclusive },
        },
      }),
      this.prisma.expense.findMany({
        where: {
          hotelId,
          spentAt: { gte: rangeStart, lt: rangeEndExclusive },
        },
      }),
      this.prisma.stay.findMany({
        where: {
          hotelId,
          status: { not: 'CANCELLED' },
          checkInDate: { lt: rangeEndExclusive },
          checkOutDate: { gt: rangeStart },
        },
      }),
      this.prisma.room.count({
        where: { hotelId, active: true },
      }),
    ]);

    const revenueByMethod = Object.values(PaymentMethod).reduce((acc, method) => {
      acc[method] = payments
        .filter((p) => p.method === method)
        .reduce((sum, p) => sum + toNumber(p.amount), 0);
      return acc;
    }, {} as Record<PaymentMethod, number>);

    const expensesByCategory = Object.values(ExpenseCategory).reduce((acc, category) => {
      acc[category] = expenses
        .filter((e) => e.category === category)
        .reduce((sum, e) => sum + toNumber(e.amount), 0);
      return acc;
    }, {} as Record<ExpenseCategory, number>);

    const totalRevenue = Object.values(revenueByMethod).reduce((sum, v) => sum + v, 0);
    const totalExpenses = Object.values(expensesByCategory).reduce((sum, v) => sum + v, 0);
    const profit = totalRevenue - totalExpenses;

    const daysInRange = diffDaysInclusive(rangeStart, rangeEnd);
    const availableNights = activeRooms * daysInRange;

    let soldNights = 0;
    let totalRoomRevenue = 0;

    stays.forEach((stay) => {
      const stayNights = overlapNights(stay.checkInDate, stay.checkOutDate, stay.checkInDate, stay.checkOutDate);
      const nightsInRange = overlapNights(rangeStart, rangeEndExclusive, stay.checkInDate, stay.checkOutDate);
      if (stayNights > 0 && nightsInRange > 0) {
        soldNights += nightsInRange;
        const stayTotal = stayNights * toNumber(stay.pricePerNight) - toNumber(stay.weeklyDiscountAmount) + toNumber(stay.manualAdjustmentAmount);
        totalRoomRevenue += (stayTotal * nightsInRange) / stayNights;
      }
    });

    const occupancyRate = availableNights > 0 ? (soldNights / availableNights) * 100 : 0;
    const adr = soldNights > 0 ? totalRoomRevenue / soldNights : 0;
    const revpar = availableNights > 0 ? totalRoomRevenue / availableNights : 0;

    return {
      revenue_by_method: revenueByMethod,
      expenses_by_category: expensesByCategory,
      profit,
      occupancy_rate: occupancyRate,
      adr,
      revpar,
      sold_nights: soldNights,
      available_nights: availableNights,
      total_room_revenue: totalRoomRevenue,
    };
  }
}
