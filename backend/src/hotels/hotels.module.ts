import { Module } from '@nestjs/common';
import { HotelsService } from './hotels.service.js';
import { HotelsController } from './hotels.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [PrismaModule],
  providers: [HotelsService, UserContextGuard, RolesGuard],
  controllers: [HotelsController],
})
export class HotelsModule {}
