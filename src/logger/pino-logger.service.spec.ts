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
