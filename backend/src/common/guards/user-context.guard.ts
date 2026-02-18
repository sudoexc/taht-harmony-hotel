import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RequestWithUser } from '../types.js';
import { AppRole } from '@prisma/client';

@Injectable()
export class UserContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const jwtUser = request.user;

    if (!jwtUser?.sub) {
      throw new UnauthorizedException('Missing authentication');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: jwtUser.sub },
      include: { profile: true, roles: true },
    });

    if (!user || !user.profile) {
      throw new UnauthorizedException('User profile not found');
    }

    const role: AppRole = user.roles.some((r) => r.role === 'ADMIN')
      ? 'ADMIN'
      : user.roles[0]?.role ?? 'MANAGER';

    request.userContext = {
      userId: user.id,
      hotelId: user.profile.hotelId,
      role,
      email: user.email,
      fullName: user.profile.fullName,
    };

    return true;
  }
}
