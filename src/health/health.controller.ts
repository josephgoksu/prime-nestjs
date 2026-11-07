import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Liveness: the process is up and serving HTTP. Use it for restart decisions.
 * Readiness: dependencies (Postgres) answer. Use it to route traffic.
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.db.pingCheck('database', { timeout: 1500 })]);
  }
}
