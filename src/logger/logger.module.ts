import { Module, OnApplicationShutdown } from '@nestjs/common';
import { shutdownTracing } from '../instrumentation';
import { LoggerService } from './logger.service';
import { flushLogs } from './pino';

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await shutdownTracing();
    flushLogs();
  }
}
