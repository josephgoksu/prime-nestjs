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

const STACK_TRACE = /\n\s+at /;

/**
 * Routes Nest's logger (and every `new Logger(Context)`) to pino.
 * Passed to NestFactory.create() in main.ts.
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
    // A lone stack, as in Logger.error(err, err.stack), is not a context.
    const args = [...params];
    const last = args[args.length - 1];
    const context = typeof last === 'string' && !STACK_TRACE.test(last) ? (args.pop() as string) : undefined;
    const fields: Record<string, unknown> = context ? { context } : {};

    if (message instanceof Error) {
      fields.err = message;
      this.logger[method](fields, message.message);
      return;
    }
    if ((level === 'error' || level === 'fatal') && typeof args[0] === 'string' && STACK_TRACE.test(args[0])) {
      fields.stack = args.shift();
    }
    // new Logger(ctx).error('msg') arrives as ('msg', undefined, ctx).
    const rest = args.filter((arg) => arg !== undefined);
    // pino serialises `err` (message, stack); an Error inside `params` would print as {}.
    const errIndex = rest.findIndex((arg) => arg instanceof Error);
    if (errIndex !== -1) {
      fields.err = rest.splice(errIndex, 1)[0];
    }
    if (rest.length > 0) {
      fields.params = rest;
    }
    if (typeof message === 'object' && message !== null) {
      this.logger[method]({ ...fields, ...message });
    } else {
      this.logger[method](fields, String(message));
    }
  }
}
