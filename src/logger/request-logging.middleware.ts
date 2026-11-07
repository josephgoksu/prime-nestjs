import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { rootLogger } from './pino';

export const REQUEST_ID_HEADER = 'x-request-id';
const VALID_REQUEST_ID = /^[\w.:-]{1,128}$/;
const QUIET_PATHS = new Set(['/health/live', '/health/ready', '/health-check']);

/** The incoming X-Request-Id when it looks safe to log, otherwise a new UUID. */
export function resolveRequestId(header: string | string[] | undefined): string {
  return typeof header === 'string' && VALID_REQUEST_ID.test(header) ? header : randomUUID();
}

/**
 * Gives every request an id (echoed in the X-Request-Id response header and
 * available as req.id) and writes one log line when the response finishes.
 *
 * This is deliberately smaller than pino-http + nestjs-pino: no per-request
 * child logger and no AsyncLocalStorage, which cost about 30% of throughput
 * on simple endpoints in our benchmark. When tracing is on, use trace_id to
 * correlate a request with the logs written while handling it.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(req: Request & { id?: string }, res: Response, next: NextFunction) {
    const id = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
    req.id = id;
    res.setHeader(REQUEST_ID_HEADER, id);

    const path = req.originalUrl.split('?')[0];
    if (!QUIET_PATHS.has(path)) {
      const start = process.hrtime.bigint();
      res.once('finish', () => {
        const status = res.statusCode;
        // 4xx are client mistakes, not incidents: keep them at info so warn/error stay actionable.
        const level = status >= 500 ? 'error' : 'info';
        rootLogger[level](
          { context: 'HTTP', reqId: id, method: req.method, path, status, ms: Number(process.hrtime.bigint() - start) / 1e6 },
          'request completed',
        );
      });
    }
    next();
  }
}
