import pino, { type DestinationStream, type Logger } from 'pino';

// Top level (objects passed to the logger are merged into the line) and one level down.
const SECRET_KEYS = ['authorization', 'cookie', 'password', 'access_token'];

type Destination = DestinationStream & { flushSync(): void };

const isProduction = process.env.NODE_ENV === 'production';

/** LOG_LEVEL when pino knows it. validateEnv() reports a bad value at startup; pino would throw a less clear error first. */
function logLevel(): string {
  const requested = process.env.LOG_LEVEL;
  if (requested && (requested === 'silent' || Object.hasOwn(pino.levels.values, requested))) {
    return requested;
  }
  return isProduction ? 'info' : 'debug';
}

function createDestination(): Destination {
  if (!isProduction) {
    try {
      return pino.transport({ target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid' } });
    } catch {
      // pino-pretty is a dev dependency, so production installs (npm ci --omit=dev) lack it,
      // for example a Docker image run with NODE_ENV=development. Fall back to JSON lines.
    }
  }
  // Asynchronous stdout keeps writes off the request path. Lines are written as
  // soon as the event loop is free, and flushLogs() runs on shutdown.
  return pino.destination({ dest: 1, sync: false });
}

const destination = createDestination();

/**
 * The one pino instance for the process. JSON lines in production (ready for
 * Loki, CloudWatch, Datadog...), pretty output in development. When tracing
 * is on, the OpenTelemetry pino instrumentation adds trace_id and span_id.
 */
export const rootLogger: Logger = pino(
  {
    level: logLevel(),
    base: { pid: process.pid },
    redact: { paths: SECRET_KEYS.flatMap((key) => [key, `*.${key}`]), censor: '[redacted]' },
  },
  destination,
);

/** Writes any pending log lines synchronously. Called on application shutdown. */
export function flushLogs(): void {
  try {
    destination.flushSync();
  } catch {
    // Nothing pending, or stdout is already closed.
  }
}
