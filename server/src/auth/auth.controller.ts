import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { CurrentUser } from '../common/decorators/user.decorator.js';
import { UserContext } from '../common/types.js';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard, UserContextGuard)
  @Get('me')
  me(@CurrentUser() user: UserContext) {
    return { user: {
      id: user.userId,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
      hotel_id: user.hotelId,
    }};
  }
}
