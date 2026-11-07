import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { UsersDTO } from '../users/dto/create-user.dto';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './strategy/jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from '../users/entities/user.entity';
import { StrictThrottle } from '../custom.decorator';

/**
 * login and register use the stricter THROTTLE_AUTH_LIMIT to slow down brute force and signup abuse.
 * refresh, logout and me take no password and keep the global limit, so a browser app that calls
 * them on every page load is not throttled like a login form.
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @StrictThrottle()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDTO) {
    return this.authService.login(loginDto);
  }

  @StrictThrottle()
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
