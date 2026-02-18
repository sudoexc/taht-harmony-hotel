import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CustomPaymentMethodsService } from './custom-payment-methods.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/user.decorator.js';
import { UserContext } from '../common/types.js';
import { IsString, MinLength } from 'class-validator';

class CreateCustomMethodDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

@UseGuards(JwtAuthGuard, UserContextGuard, RolesGuard)
@Roles('ADMIN')
@Controller('custom-payment-methods')
export class CustomPaymentMethodsController {
  constructor(private readonly service: CustomPaymentMethodsService) {}

  @Get()
  list(@CurrentUser() user: UserContext) {
    return this.service.list(user.hotelId);
  }

  @Post()
  create(@CurrentUser() user: UserContext, @Body() dto: CreateCustomMethodDto) {
    return this.service.create(user.hotelId, dto.name);
  }

  @Delete(':id')
  remove(@CurrentUser() user: UserContext, @Param('id') id: string) {
    return this.service.remove(user.hotelId, id);
  }
}
