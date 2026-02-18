import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { AppRole } from '@prisma/client';

interface AuthUserPayload {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  hotel_id: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private buildAuthResponse(user: AuthUserPayload) {
    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      access_token: accessToken,
      user,
    };
  }

  private resolveRole(roles: { role: AppRole }[]): AppRole {
    return roles.some((r) => r.role === 'ADMIN') ? 'ADMIN' : roles[0]?.role ?? 'MANAGER';
  }

  async register(dto: RegisterDto) {
    const allowRegister = this.config.get<string>('ALLOW_REGISTER') === 'true';
    const usersCount = await this.prisma.user.count();
    if (usersCount > 0 && !allowRegister) {
      throw new ForbiddenException('Registration is disabled');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const hotel = await tx.hotel.create({
        data: {
          name: dto.hotel_name,
          timezone: dto.timezone || 'Asia/Tashkent',
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
        },
      });

      await tx.profile.create({
        data: {
          id: user.id,
          hotelId: hotel.id,
          fullName: dto.full_name,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          role: 'ADMIN',
        },
      });

      return { user, hotel };
    });

    return this.buildAuthResponse({
      id: result.user.id,
      email: result.user.email,
      full_name: dto.full_name,
      role: 'ADMIN',
      hotel_id: result.hotel.id,
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true, roles: true },
    });

    if (!user || !user.profile) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const role = this.resolveRole(user.roles);

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      full_name: user.profile.fullName,
      role,
      hotel_id: user.profile.hotelId,
    });
  }
}
