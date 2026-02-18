import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MonthClosingsService } from './month-closings.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/user.decorator.js';
import { UserContext } from '../common/types.js';

@UseGuards(JwtAuthGuard, UserContextGuard, RolesGuard)
@Controller('month-closings')
export class MonthClosingsController {
  constructor(private readonly monthClosingsService: MonthClosingsService) {}

  @Get()
  list(@CurrentUser() user: UserContext) {
    return this.monthClosingsService.list(user.hotelId);
  }

  @Roles('ADMIN')
  @Post('close-previous')
  closePrevious(@CurrentUser() user: UserContext) {
    return this.monthClosingsService.closePrevious(user.hotelId);
  }

  @Roles('ADMIN')
  @Delete(':month')
  reopen(@CurrentUser() user: UserContext, @Param('month') month: string) {
    return this.monthClosingsService.reopen(user.hotelId, month);
  }
}
