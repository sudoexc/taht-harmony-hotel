import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CustomPaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(hotelId: string) {
    const methods = await this.prisma.customPaymentMethod.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'asc' },
    });
    return methods.map((m) => ({ id: m.id, name: m.name, created_at: m.createdAt.toISOString() }));
  }

  async create(hotelId: string, name: string) {
    const trimmed = name.trim();
    const existing = await this.prisma.customPaymentMethod.findUnique({
      where: { hotelId_name: { hotelId, name: trimmed } },
    });
    if (existing) throw new ConflictException('Method already exists');

    const method = await this.prisma.customPaymentMethod.create({
      data: { hotelId, name: trimmed },
    });
    return { id: method.id, name: method.name, created_at: method.createdAt.toISOString() };
  }

  async remove(hotelId: string, id: string) {
    const method = await this.prisma.customPaymentMethod.findFirst({ where: { id, hotelId } });
    if (!method) throw new NotFoundException('Method not found');
    await this.prisma.customPaymentMethod.delete({ where: { id } });
    return { success: true };
  }
}
