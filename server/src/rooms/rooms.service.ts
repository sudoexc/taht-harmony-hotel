import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';
import { Room as PrismaRoom } from '@prisma/client';

const mapRoom = (room: PrismaRoom) => ({
  id: room.id,
  hotel_id: room.hotelId,
  number: room.number,
  floor: room.floor,
  room_type: room.roomType,
  capacity: room.capacity,
  base_price: Number(room.basePrice),
  active: room.active,
  notes: room.notes,
  created_at: room.createdAt.toISOString(),
});

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(hotelId: string) {
    const rooms = await this.prisma.room.findMany({
      where: { hotelId },
      orderBy: { number: 'asc' },
    });
    return rooms.map(mapRoom);
  }

  async create(hotelId: string, dto: CreateRoomDto) {
    const room = await this.prisma.room.create({
      data: {
        hotelId,
        number: dto.number,
        floor: dto.floor ?? 1,
        roomType: dto.room_type ?? 'STANDARD',
        capacity: dto.capacity ?? 2,
        basePrice: dto.base_price ?? 0,
        active: dto.active ?? true,
        notes: dto.notes ?? null,
      },
    });
    return mapRoom(room);
  }

  async remove(hotelId: string, id: string) {
    const existing = await this.prisma.room.findFirst({ where: { id, hotelId } });
    if (!existing) throw new NotFoundException('Room not found');

    const activeStay = await this.prisma.stay.findFirst({
      where: { roomId: id, status: { in: ['BOOKED', 'CHECKED_IN'] } },
    });
    if (activeStay) throw new BadRequestException('Cannot delete room with active stays');

    await this.prisma.room.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async update(hotelId: string, id: string, dto: UpdateRoomDto) {
    const existing = await this.prisma.room.findFirst({ where: { id, hotelId } });
    if (!existing) throw new NotFoundException('Room not found');

    const room = await this.prisma.room.update({
      where: { id: existing.id },
      data: {
        number: dto.number,
        floor: dto.floor,
        roomType: dto.room_type,
        capacity: dto.capacity,
        basePrice: dto.base_price,
        active: dto.active,
        notes: dto.notes === undefined ? undefined : dto.notes,
      },
    });
    return mapRoom(room);
  }
}
