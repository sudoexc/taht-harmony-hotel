import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service.js';
import { ExpensesController } from './expenses.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [PrismaModule],
  providers: [ExpensesService, UserContextGuard, RolesGuard],
  controllers: [ExpensesController],
})
export class ExpensesModule {}
