import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { StaysService } from './stays.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/user.decorator.js';
import { UserContext } from '../common/types.js';
import { CreateStayDto } from './dto/create-stay.dto.js';
import { UpdateStayDto } from './dto/update-stay.dto.js';

@UseGuards(JwtAuthGuard, UserContextGuard, RolesGuard)
@Controller('stays')
export class StaysController {
  constructor(private readonly staysService: StaysService) {}

  @Get()
  list(@CurrentUser() user: UserContext) {
    return this.staysService.list(user.hotelId);
  }

  @Post()
  create(@CurrentUser() user: UserContext, @Body() dto: CreateStayDto) {
    return this.staysService.create(user, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: UserContext, @Param('id') id: string, @Body() dto: UpdateStayDto) {
    return this.staysService.update(user, id, dto);
  }
}
