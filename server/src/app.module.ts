import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { HotelsModule } from './hotels/hotels.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { StaysModule } from './stays/stays.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { MonthClosingsModule } from './month-closings/month-closings.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HotelsModule,
    RoomsModule,
    StaysModule,
    PaymentsModule,
    ExpensesModule,
    ReportsModule,
    MonthClosingsModule,
  ],
})
export class AppModule {}
