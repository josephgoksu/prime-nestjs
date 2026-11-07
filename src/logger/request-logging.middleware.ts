import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { rootLogger } from './pino';
import { HEALTH_PATHS } from '../health/health-paths';

export const REQUEST_ID_HEADER = 'x-request-id';
const VALID_REQUEST_ID = /^[\w.:-]{1,128}$/;

/** The incoming X-Request-Id when it looks safe to log, otherwise a new UUID. */
export function resolveRequestId(header: string | string[] | undefined): string {
  return typeof header === 'string' && VALID_REQUEST_ID.test(header) ? header : randomUUID();
}

/**
 * Gives every request an id (echoed in the X-Request-Id response header and
 * available as req.id) and writes one log line when the response finishes or
 * the client goes away. main.ts mounts it with app.use() before any other
 * middleware, so requests rejected by helmet, CORS or the body parser
 * (malformed JSON, payload too large) are covered too.
 *
 * This is deliberately smaller than pino-http + nestjs-pino: no per-request
 * child logger and no AsyncLocalStorage, which cost about 30% of throughput
 * on simple endpoints in our benchmark. When tracing is on, use trace_id to
 * correlate a request with the logs written while handling it.
 */
export function requestLogging(req: Request & { id?: string }, res: Response, next: NextFunction): void {
  const id = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
  req.id = id;
  res.setHeader(REQUEST_ID_HEADER, id);

  const path = req.originalUrl.split('?')[0];
  if (!HEALTH_PATHS.has(path)) {
    const start = process.hrtime.bigint();
    // 'close' fires for every response, after 'finish' or when the connection drops first.
    res.once('close', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const status = res.statusCode;
      const aborted = !res.writableFinished;
      // 4xx are client mistakes, not incidents: keep them at info so warn/error stay actionable.
      const level = status >= 500 ? 'error' : 'info';
      const fields = { context: 'HTTP', reqId: id, method: req.method, path, status, ms };
      rootLogger[level](aborted ? { ...fields, aborted } : fields, aborted ? 'request aborted' : 'request completed');
    });
  }
  next();
}
