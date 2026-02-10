import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/user.decorator.js';
import { UserContext } from '../common/types.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';

@UseGuards(JwtAuthGuard, UserContextGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  list(@CurrentUser() user: UserContext) {
    return this.paymentsService.list(user.hotelId);
  }

  @Post()
  create(@CurrentUser() user: UserContext, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: UserContext, @Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.paymentsService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: UserContext, @Param('id') id: string) {
    return this.paymentsService.remove(user, id);
  }
}
