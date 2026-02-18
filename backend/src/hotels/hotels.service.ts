import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateHotelDto } from './dto/update-hotel.dto.js';

const mapHotel = (hotel: { id: string; name: string; timezone: string; createdAt: Date }) => ({
  id: hotel.id,
  name: hotel.name,
  timezone: hotel.timezone,
  created_at: hotel.createdAt.toISOString(),
});

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHotel(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException('Hotel not found');
    return mapHotel(hotel);
  }

  async updateHotel(hotelId: string, dto: UpdateHotelDto) {
    const hotel = await this.prisma.hotel.update({
      where: { id: hotelId },
      data: {
        name: dto.name,
        timezone: dto.timezone,
      },
    });
    return mapHotel(hotel);
  }
}
