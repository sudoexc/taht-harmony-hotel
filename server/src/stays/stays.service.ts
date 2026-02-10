import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStayDto } from './dto/create-stay.dto.js';
import { UpdateStayDto } from './dto/update-stay.dto.js';
import { UserContext } from '../common/types.js';
import { formatDateOnly, getMonthKeysInRange, parseDateOnly } from '../common/utils/date.js';
import { Stay as PrismaStay, StayStatus } from '@prisma/client';

const mapStay = (stay: PrismaStay) => ({
  id: stay.id,
  hotel_id: stay.hotelId,
  room_id: stay.roomId,
  guest_name: stay.guestName,
  guest_phone: stay.guestPhone ?? '',
  check_in_date: formatDateOnly(stay.checkInDate),
  check_out_date: formatDateOnly(stay.checkOutDate),
  status: stay.status,
  price_per_night: Number(stay.pricePerNight),
  weekly_discount_amount: Number(stay.weeklyDiscountAmount),
  manual_adjustment_amount: Number(stay.manualAdjustmentAmount),
  deposit_expected: Number(stay.depositExpected),
  comment: stay.comment ?? '',
  created_at: stay.createdAt.toISOString(),
});

@Injectable()
export class StaysService {
  constructor(private readonly prisma: PrismaService) {}

  private validateDates(checkIn: Date, checkOut: Date) {
    if (checkOut <= checkIn) {
      throw new BadRequestException('check_out_date must be after check_in_date');
    }
  }

  private async ensureManagerCanEditRange(user: UserContext, start: Date, endExclusive: Date) {
    if (user.role === 'ADMIN') return;
    const keys = getMonthKeysInRange(start, endExclusive);
    if (keys.length === 0) return;
    const closed = await this.prisma.monthClosing.findFirst({
      where: { hotelId: user.hotelId, month: { in: keys } },
    });
    if (closed) {
      throw new ForbiddenException('Month is closed');
    }
  }

  private async ensureNoOverlap(
    user: UserContext,
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    status: StayStatus,
    excludeId?: string,
  ) {
    if (status === 'CANCELLED') return;
    const conflict = await this.prisma.stay.findFirst({
      where: {
        hotelId: user.hotelId,
        roomId,
        status: { not: 'CANCELLED' },
        id: excludeId ? { not: excludeId } : undefined,
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new BadRequestException('Room already occupied for selected dates');
    }
  }

  async list(hotelId: string) {
    const stays = await this.prisma.stay.findMany({
      where: { hotelId },
      orderBy: { checkInDate: 'desc' },
    });
    return stays.map(mapStay);
  }

  async create(user: UserContext, dto: CreateStayDto) {
    const room = await this.prisma.room.findFirst({ where: { id: dto.room_id, hotelId: user.hotelId } });
    if (!room) throw new NotFoundException('Room not found');

    const checkIn = parseDateOnly(dto.check_in_date);
    const checkOut = parseDateOnly(dto.check_out_date);
    this.validateDates(checkIn, checkOut);

    await this.ensureManagerCanEditRange(user, checkIn, checkOut);
    await this.ensureNoOverlap(user, dto.room_id, checkIn, checkOut, dto.status ?? 'BOOKED');

    const stay = await this.prisma.stay.create({
      data: {
        hotelId: user.hotelId,
        roomId: dto.room_id,
        guestName: dto.guest_name,
        guestPhone: dto.guest_phone || null,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        status: dto.status ?? 'BOOKED',
        pricePerNight: dto.price_per_night ?? 0,
        weeklyDiscountAmount: dto.weekly_discount_amount ?? 0,
        manualAdjustmentAmount: dto.manual_adjustment_amount ?? 0,
        depositExpected: dto.deposit_expected ?? 0,
        comment: dto.comment ?? null,
      },
    });

    return mapStay(stay);
  }

  async update(user: UserContext, id: string, dto: UpdateStayDto) {
    const existing = await this.prisma.stay.findFirst({
      where: { id, hotelId: user.hotelId },
    });
    if (!existing) throw new NotFoundException('Stay not found');

    if (user.role !== 'ADMIN') {
      await this.ensureManagerCanEditRange(user, existing.checkInDate, existing.checkOutDate);
    }

    const nextRoomId = dto.room_id ?? existing.roomId;
    const nextStatus = dto.status ?? existing.status;
    const checkIn = dto.check_in_date ? parseDateOnly(dto.check_in_date) : existing.checkInDate;
    const checkOut = dto.check_out_date ? parseDateOnly(dto.check_out_date) : existing.checkOutDate;
    this.validateDates(checkIn, checkOut);

    await this.ensureManagerCanEditRange(user, checkIn, checkOut);
    await this.ensureNoOverlap(user, nextRoomId, checkIn, checkOut, nextStatus, existing.id);

    if (dto.room_id) {
      const room = await this.prisma.room.findFirst({ where: { id: dto.room_id, hotelId: user.hotelId } });
      if (!room) throw new NotFoundException('Room not found');
    }

    const stay = await this.prisma.stay.update({
      where: { id: existing.id },
      data: {
        roomId: dto.room_id,
        guestName: dto.guest_name,
        guestPhone: dto.guest_phone === undefined ? undefined : dto.guest_phone,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        status: dto.status,
        pricePerNight: dto.price_per_night,
        weeklyDiscountAmount: dto.weekly_discount_amount,
        manualAdjustmentAmount: dto.manual_adjustment_amount,
        depositExpected: dto.deposit_expected,
        comment: dto.comment === undefined ? undefined : dto.comment,
      },
    });

    return mapStay(stay);
  }
}
