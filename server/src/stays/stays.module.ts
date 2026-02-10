import { Module } from '@nestjs/common';
import { StaysService } from './stays.service.js';
import { StaysController } from './stays.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [PrismaModule],
  providers: [StaysService, UserContextGuard, RolesGuard],
  controllers: [StaysController],
})
export class StaysModule {}
