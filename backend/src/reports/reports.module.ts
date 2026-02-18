import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [PrismaModule],
  providers: [ReportsService, UserContextGuard, RolesGuard],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
