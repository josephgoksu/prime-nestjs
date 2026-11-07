import { Module, OnApplicationShutdown } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { flushLogs } from './pino';

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule implements OnApplicationShutdown {
  onApplicationShutdown() {
    flushLogs();
  }
}
