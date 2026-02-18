import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { RoomsController } from './rooms.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [PrismaModule],
  providers: [RoomsService, UserContextGuard, RolesGuard],
  controllers: [RoomsController],
})
export class RoomsModule {}
