import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { UsersDTO } from '../users/dto/create-user.dto';

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
}
