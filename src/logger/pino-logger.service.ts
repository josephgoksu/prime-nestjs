import { LoggerService, LogLevel } from '@nestjs/common';
import type { Logger } from 'pino';
import { rootLogger } from './pino';

const LEVELS: Record<LogLevel, 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'> = {
  verbose: 'trace',
  debug: 'debug',
  log: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'fatal',
};

/**
 * Routes Nest's logger (and every `new Logger(Context)`) to pino.
 * Installed with app.useLogger() in main.ts.
 */
export class PinoLoggerService implements LoggerService {
  constructor(private readonly logger: Logger = rootLogger) {}

  log(message: unknown, ...params: unknown[]) {
    this.write('log', message, params);
  }
  error(message: unknown, ...params: unknown[]) {
    this.write('error', message, params);
  }
  warn(message: unknown, ...params: unknown[]) {
    this.write('warn', message, params);
  }
  debug(message: unknown, ...params: unknown[]) {
    this.write('debug', message, params);
  }
  verbose(message: unknown, ...params: unknown[]) {
    this.write('verbose', message, params);
  }
  fatal(message: unknown, ...params: unknown[]) {
    this.write('fatal', message, params);
  }

  private write(level: LogLevel, message: unknown, params: unknown[]) {
    const method = LEVELS[level];
    if (!this.logger.isLevelEnabled(method)) return;

    // Nest passes the context as the last string argument, and for errors a stack before it.
    const args = [...params];
    const context = typeof args[args.length - 1] === 'string' ? (args.pop() as string) : undefined;
    const fields: Record<string, unknown> = context ? { context } : {};

    if (message instanceof Error) {
      fields.err = message;
      this.logger[method](fields, message.message);
      return;
    }
    if (level === 'error' && typeof args[0] === 'string' && args[0].includes('\n')) {
      fields.stack = args.shift();
    }
    if (args.length > 0) {
      fields.params = args;
    }
    if (typeof message === 'object' && message !== null) {
      this.logger[method]({ ...fields, ...message });
    } else {
      this.logger[method](fields, String(message));
    }
  }
}
