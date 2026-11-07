import type { Logger } from 'pino';
import { PinoLoggerService } from './pino-logger.service';

describe('PinoLoggerService', () => {
  const pino = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn(), fatal: vi.fn(), isLevelEnabled: vi.fn(() => true) };
  const service = new PinoLoggerService(pino as unknown as Logger);

  afterEach(() => vi.clearAllMocks());

  it('maps Nest levels to pino and keeps the context', () => {
    service.log('started', 'Bootstrap');
    service.verbose('detail', 'Router');
    expect(pino.info).toHaveBeenCalledWith({ context: 'Bootstrap' }, 'started');
    expect(pino.trace).toHaveBeenCalledWith({ context: 'Router' }, 'detail');
  });

  it('keeps the stack that Nest passes to error()', () => {
    service.error('boom', 'Error: boom\n    at x', 'ExceptionsHandler');
    expect(pino.error).toHaveBeenCalledWith({ context: 'ExceptionsHandler', stack: 'Error: boom\n    at x' }, 'boom');
  });

  it('serialises Error objects under err', () => {
    const err = new Error('db down');
    service.error(err, 'TypeOrm');
    expect(pino.error).toHaveBeenCalledWith({ context: 'TypeOrm', err }, 'db down');
  });

  it('keeps an Error passed after the message', () => {
    const err = new Error('connect ECONNREFUSED');
    service.error('Error during application bootstrap:', err, 'Bootstrap');
    expect(pino.error).toHaveBeenCalledWith({ context: 'Bootstrap', err }, 'Error during application bootstrap:');
  });

  it('drops the undefined stack Nest adds for contextual error() calls', () => {
    service.error('plain', undefined, 'TasksService');
    expect(pino.error).toHaveBeenCalledWith({ context: 'TasksService' }, 'plain');
  });

  it('does not take a lone stack for the context', () => {
    const err = new Error('hook failed');
    service.error(err, err.stack);
    expect(pino.error).toHaveBeenCalledWith({ err }, 'hook failed');
  });

  it('merges object messages into the log line', () => {
    service.warn({ userId: 1, msg: 'rehash failed' }, 'AuthService');
    expect(pino.warn).toHaveBeenCalledWith({ context: 'AuthService', userId: 1, msg: 'rehash failed' });
  });

  it('skips disabled levels', () => {
    pino.isLevelEnabled.mockReturnValueOnce(false);
    service.debug('hidden');
    expect(pino.debug).not.toHaveBeenCalled();
  });
});
