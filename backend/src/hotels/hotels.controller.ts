import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { HotelsService } from './hotels.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/user.decorator.js';
import { UserContext } from '../common/types.js';
import { UpdateHotelDto } from './dto/update-hotel.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@UseGuards(JwtAuthGuard, UserContextGuard, RolesGuard)
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get('me')
  getMyHotel(@CurrentUser() user: UserContext) {
    return this.hotelsService.getHotel(user.hotelId);
  }

  @Roles('ADMIN')
  @Patch('me')
  updateMyHotel(@CurrentUser() user: UserContext, @Body() dto: UpdateHotelDto) {
    return this.hotelsService.updateHotel(user.hotelId, dto);
  }
}
