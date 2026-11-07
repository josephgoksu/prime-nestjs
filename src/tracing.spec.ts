import { startTracing } from './tracing';

describe('startTracing', () => {
  it('starts an SDK that shuts down cleanly', async () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', 'http://127.0.0.1:1/v1/traces');
    const sdk = startTracing();
    await expect(sdk.shutdown()).resolves.toBeUndefined();
    vi.unstubAllEnvs();
  });
});
