import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/user.decorator.js';
import { UserContext } from '../common/types.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';

@UseGuards(JwtAuthGuard, UserContextGuard, RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  list(@CurrentUser() user: UserContext) {
    return this.roomsService.list(user.hotelId);
  }

  @Post()
  create(@CurrentUser() user: UserContext, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(user.hotelId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: UserContext, @Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(user.hotelId, id, dto);
  }
}
