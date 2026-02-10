import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { UserContext } from '../common/types.js';
import { monthKeyFromDate } from '../common/utils/date.js';
import { Expense as PrismaExpense } from '@prisma/client';

const mapExpense = (expense: PrismaExpense) => ({
  id: expense.id,
  hotel_id: expense.hotelId,
  spent_at: expense.spentAt.toISOString(),
  category: expense.category,
  method: expense.method,
  amount: Number(expense.amount),
  comment: expense.comment ?? '',
  created_at: expense.createdAt.toISOString(),
});

@Injectable()
export class ExpensesService {
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
    const expenses = await this.prisma.expense.findMany({
      where: { hotelId },
      orderBy: { spentAt: 'desc' },
    });
    return expenses.map(mapExpense);
  }

  async create(user: UserContext, dto: CreateExpenseDto) {
    const spentAt = dto.spent_at ? new Date(dto.spent_at) : new Date();
    await this.ensureManagerCanEditDate(user, spentAt);

    const expense = await this.prisma.expense.create({
      data: {
        hotelId: user.hotelId,
        spentAt,
        category: dto.category ?? 'OTHER',
        method: dto.method ?? 'CASH',
        amount: dto.amount,
        comment: dto.comment ?? null,
      },
    });

    return mapExpense(expense);
  }

  async update(user: UserContext, id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, hotelId: user.hotelId },
    });
    if (!existing) throw new NotFoundException('Expense not found');

    if (user.role !== 'ADMIN') {
      await this.ensureManagerCanEditDate(user, existing.spentAt);
    }

    const spentAt = dto.spent_at ? new Date(dto.spent_at) : existing.spentAt;
    await this.ensureManagerCanEditDate(user, spentAt);

    const expense = await this.prisma.expense.update({
      where: { id: existing.id },
      data: {
        spentAt: dto.spent_at ? spentAt : undefined,
        category: dto.category,
        method: dto.method,
        amount: dto.amount,
        comment: dto.comment === undefined ? undefined : dto.comment,
      },
    });

    return mapExpense(expense);
  }

  async remove(user: UserContext, id: string) {
    const existing = await this.prisma.expense.findFirst({
      where: { id, hotelId: user.hotelId },
    });
    if (!existing) throw new NotFoundException('Expense not found');

    if (user.role !== 'ADMIN') {
      await this.ensureManagerCanEditDate(user, existing.spentAt);
    }

    const expense = await this.prisma.expense.delete({
      where: { id: existing.id },
    });

    return mapExpense(expense);
  }
}
