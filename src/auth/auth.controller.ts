import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { UsersDTO } from '../users/dto/create-user.dto';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './strategy/jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from '../users/entities/user.entity';

/** Stricter limit on credential endpoints to slow down brute force and signup abuse. */
const authLimit = () => parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '', 10) || 10;

@Throttle({ default: { limit: authLimit } })
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDTO) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: UsersDTO) {
    return this.authService.register(registerDto);
  }

  /** Exchanges a refresh token for a new access token and refresh token. The old refresh token stops working. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDTO) {
    return this.authService.refresh(dto.refresh_token);
  }

  /** Revokes the session that the refresh token belongs to. Access tokens stay valid until they expire. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefreshTokenDTO) {
    return this.authService.logout(dto.refresh_token);
  }

  /** The authenticated user. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    const { id, name, email, roles, isActive } = user;
    return { id, name, email, roles, isActive };
  }
}
