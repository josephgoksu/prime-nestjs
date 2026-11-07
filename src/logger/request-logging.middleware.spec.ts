import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { rootLogger } from './pino';
import { requestLogging, resolveRequestId } from './request-logging.middleware';

describe('resolveRequestId', () => {
  it('reuses a well-formed incoming id', () => {
    expect(resolveRequestId('trace-abc_123')).toBe('trace-abc_123');
  });

  it('generates a UUID when the header is missing, unsafe or too long', () => {
    for (const header of [undefined, 'bad id\ninjected', 'x'.repeat(200), ['a', 'b']]) {
      expect(resolveRequestId(header)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    }
  });
});

describe('requestLogging', () => {
  function run(url: string, status: number, header?: string, finished = true) {
    const res = Object.assign(new EventEmitter(), { statusCode: status, writableFinished: finished, setHeader: vi.fn() });
    const req = { headers: header ? { 'x-request-id': header } : {}, originalUrl: url, method: 'GET' } as unknown as Request & { id?: string };
    const next = vi.fn() as NextFunction;
    requestLogging(req, res as unknown as Response, next);
    res.emit('close');
    return { req, res, next };
  }

  let info: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    info = vi.spyOn(rootLogger, 'info').mockImplementation(() => undefined);
    error = vi.spyOn(rootLogger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('sets req.id and echoes it in the response header', () => {
    const { req, res, next } = run('/tasks', 200, 'abc-1');
    expect(req.id).toBe('abc-1');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'abc-1');
    expect(next).toHaveBeenCalled();
  });

  it('logs one line per request, at error level only for 5xx', () => {
    run('/tasks?page=2', 200);
    run('/tasks', 404);
    run('/tasks', 503);

    expect(info).toHaveBeenCalledWith(expect.objectContaining({ path: '/tasks', status: 200, method: 'GET' }), 'request completed');
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }), 'request completed');
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('logs requests the client aborted before the response finished', () => {
    run('/tasks', 200, 'gone-1', false);
    expect(info).toHaveBeenCalledWith(expect.objectContaining({ reqId: 'gone-1', aborted: true }), 'request aborted');
  });

  it('does not log health probes', () => {
    run('/health/live', 200);
    run('/health/ready', 200);
    expect(info).not.toHaveBeenCalled();
  });
});
