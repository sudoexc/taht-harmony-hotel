import { Module } from '@nestjs/common';
import { CustomPaymentMethodsController } from './custom-payment-methods.controller.js';
import { CustomPaymentMethodsService } from './custom-payment-methods.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CustomPaymentMethodsController],
  providers: [CustomPaymentMethodsService],
})
export class CustomPaymentMethodsModule {}
