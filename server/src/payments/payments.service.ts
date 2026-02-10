import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';
import { UserContext } from '../common/types.js';
import { monthKeyFromDate } from '../common/utils/date.js';
import { Payment as PrismaPayment } from '@prisma/client';

const mapPayment = (payment: PrismaPayment) => ({
  id: payment.id,
  hotel_id: payment.hotelId,
  stay_id: payment.stayId,
  paid_at: payment.paidAt.toISOString(),
  method: payment.method,
  amount: Number(payment.amount),
  comment: payment.comment ?? '',
  created_at: payment.createdAt.toISOString(),
});

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureManagerCanEditDate(user: UserContext, date: Date) {
    if (user.role === 'ADMIN') return;
    const key = monthKeyFromDate(date);
    const closed = await this.prisma.monthClosing.findFirst({
      where: { hotelId: user.hotelId, month: key },
    });
    if (closed) {
      throw new ForbiddenException('Month is closed');
    }
  }

  async list(hotelId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { hotelId },
      orderBy: { paidAt: 'desc' },
    });
    return payments.map(mapPayment);
  }

  async create(user: UserContext, dto: CreatePaymentDto) {
    const stay = await this.prisma.stay.findFirst({
      where: { id: dto.stay_id, hotelId: user.hotelId },
    });
    if (!stay) throw new NotFoundException('Stay not found');

    const paidAt = dto.paid_at ? new Date(dto.paid_at) : new Date();
    await this.ensureManagerCanEditDate(user, paidAt);

    const payment = await this.prisma.payment.create({
      data: {
        hotelId: user.hotelId,
        stayId: dto.stay_id,
        paidAt,
        method: dto.method ?? 'CASH',
        amount: dto.amount,
        comment: dto.comment ?? null,
      },
    });

    return mapPayment(payment);
  }

  async update(user: UserContext, id: string, dto: UpdatePaymentDto) {
    const existing = await this.prisma.payment.findFirst({
      where: { id, hotelId: user.hotelId },
    });
    if (!existing) throw new NotFoundException('Payment not found');

    if (user.role !== 'ADMIN') {
      await this.ensureManagerCanEditDate(user, existing.paidAt);
    }

    const paidAt = dto.paid_at ? new Date(dto.paid_at) : existing.paidAt;
    await this.ensureManagerCanEditDate(user, paidAt);

    const payment = await this.prisma.payment.update({
      where: { id: existing.id },
      data: {
        paidAt: dto.paid_at ? paidAt : undefined,
        method: dto.method,
        amount: dto.amount,
        comment: dto.comment === undefined ? undefined : dto.comment,
      },
    });

    return mapPayment(payment);
  }

  async remove(user: UserContext, id: string) {
    const existing = await this.prisma.payment.findFirst({
      where: { id, hotelId: user.hotelId },
    });
    if (!existing) throw new NotFoundException('Payment not found');

    if (user.role !== 'ADMIN') {
      await this.ensureManagerCanEditDate(user, existing.paidAt);
    }

    const payment = await this.prisma.payment.delete({
      where: { id: existing.id },
    });

    return mapPayment(payment);
  }
}
