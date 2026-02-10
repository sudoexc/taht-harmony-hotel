import { Module } from '@nestjs/common';
import { MonthClosingsService } from './month-closings.service.js';
import { MonthClosingsController } from './month-closings.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [PrismaModule, ReportsModule],
  providers: [MonthClosingsService, UserContextGuard, RolesGuard],
  controllers: [MonthClosingsController],
})
export class MonthClosingsModule {}
