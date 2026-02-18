import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import bcrypt from 'bcrypt';
import { AppRole } from '@prisma/client';

const resolveRole = (roles: { role: AppRole }[]): AppRole => {
  return roles.some((r) => r.role === 'ADMIN') ? 'ADMIN' : roles[0]?.role ?? 'MANAGER';
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(hotelId: string) {
    const profiles = await this.prisma.profile.findMany({
      where: { hotelId },
      include: { user: { select: { email: true, roles: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return profiles.map((profile) => ({
      id: profile.id,
      full_name: profile.fullName,
      email: profile.user.email,
      role: resolveRole(profile.user.roles),
    }));
  }

  async createUser(hotelId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
        },
      });

      await tx.profile.create({
        data: {
          id: user.id,
          hotelId,
          fullName: dto.full_name,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          role: dto.role,
        },
      });

      return user;
    });

    return {
      id: result.id,
      full_name: dto.full_name,
      email: result.email,
      role: dto.role,
    };
  }

  async removeUser(hotelId: string, currentUserId: string, targetId: string) {
    if (currentUserId === targetId) throw new BadRequestException('Cannot delete yourself');

    const profile = await this.prisma.profile.findFirst({
      where: { id: targetId, hotelId },
    });
    if (!profile) throw new NotFoundException('User not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: profile.id } });
      await tx.profile.delete({ where: { id: targetId } });
      await tx.user.delete({ where: { id: profile.id } });
    });

    return { success: true };
  }

  async updateRole(hotelId: string, userId: string, dto: UpdateUserRoleDto) {
    const profile = await this.prisma.profile.findFirst({
      where: { id: userId, hotelId },
      include: { user: { select: { email: true } } },
    });

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.userRole.deleteMany({ where: { userId } });
    await this.prisma.userRole.create({
      data: {
        userId,
        role: dto.role,
      },
    });

    return {
      id: profile.id,
      full_name: profile.fullName,
      email: profile.user.email,
      role: dto.role,
    };
  }
}
