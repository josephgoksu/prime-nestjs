import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/strategy/jwt-auth.guard';
import { RolesGuard } from './auth/strategy/roles.guard';
import { Roles } from './custom.decorator';
import { Role } from './users/enums/role.enum';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): { message: string } {
    return this.appService.getHello();
  }

  @Get('/health-check')
  healthCheck(): { message: string } {
    return this.appService.healthCheck();
  }

  @Post('/echo')
  @UseGuards(JwtAuthGuard)
  echo(@Body() body: Record<string, unknown>) {
    return body;
  }

  @Post('/premium-echo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.premium)
  premiumEcho(@Body() body: Record<string, unknown>) {
    return body;
  }
}
