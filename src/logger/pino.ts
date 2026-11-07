import pino, { type Logger } from 'pino';

/**
 * The one pino instance for the process. JSON lines in production (ready for
 * Loki, CloudWatch, Datadog...), pretty output in development. When tracing
 * is on, the OpenTelemetry pino instrumentation adds trace_id and span_id.
 */
export function createPino(): Logger {
  const isProduction = process.env.NODE_ENV === 'production';
  const options = {
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    base: { pid: process.pid },
    redact: { paths: ['*.authorization', '*.cookie', '*.password', '*.access_token'], censor: '[redacted]' },
  };
  if (!isProduction) {
    return pino({ ...options, transport: { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid' } } });
  }
  // Asynchronous stdout keeps writes off the request path. Lines are written as
  // soon as the event loop is free, and flushLogs() runs on shutdown.
  return pino(options, pino.destination({ dest: 1, sync: false }));
}

export const rootLogger = createPino();

/** Writes any pending log lines. Called on application shutdown. */
export function flushLogs(): void {
  try {
    rootLogger.flush();
  } catch {
    // Nothing pending, or stdout is already closed.
  }
}
