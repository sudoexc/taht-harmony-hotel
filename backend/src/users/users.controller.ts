import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/user.decorator.js';
import { UserContext } from '../common/types.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';

@UseGuards(JwtAuthGuard, UserContextGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@CurrentUser() user: UserContext) {
    return this.usersService.listUsers(user.hotelId);
  }

  @Post()
  create(@CurrentUser() user: UserContext, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(user.hotelId, dto);
  }

  @Patch(':id/role')
  updateRole(@CurrentUser() user: UserContext, @Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateRole(user.hotelId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: UserContext, @Param('id') id: string) {
    return this.usersService.removeUser(user.hotelId, user.userId, id);
  }
}
