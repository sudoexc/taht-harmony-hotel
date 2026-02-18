import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { UserContextGuard } from '../common/guards/user-context.guard.js';
import { CurrentUser } from '../common/decorators/user.decorator.js';
import { UserContext } from '../common/types.js';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setAuthCookie(res: Response, token: string) {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    const cookieDomain = this.config.get<string>('COOKIE_DOMAIN');

    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      domain: cookieDomain || undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  @Post('auth/register')
  async register(@Res({ passthrough: true }) res: Response, @Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    this.setAuthCookie(res, result.access_token);
    return { user: result.user };
  }

  @Post('auth/login')
  async login(@Res({ passthrough: true }) res: Response, @Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    this.setAuthCookie(res, result.access_token);
    return { user: result.user };
  }

  @Post('auth/logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { ok: true };
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
