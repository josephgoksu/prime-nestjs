import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/strategy/jwt-auth.guard';
import { RolesGuard } from './auth/strategy/roles.guard';
import { Roles } from './custom.decorator';
import { Role } from './users/enums/role.enum';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): object {
    return this.appService.getHello();
  }

  @Get('/health-check')
  healthCheck(): object {
    return this.appService.healthCheck();
  }

  @Post('/echo')
  echo(@Body() body) {
    return body;
  }

  @Post('/premium-echo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.premium)
  premiumEcho(@Body() body) {
    return body;
  }
}
