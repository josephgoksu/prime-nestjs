import { isSpanContextValid, trace } from '@opentelemetry/api';
import { startTracing } from './tracing';

describe('startTracing', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers a tracer provider and shuts down cleanly', async () => {
    // The Vitest config sets OTEL_SDK_DISABLED=true, which would make start() a no-op.
    vi.stubEnv('OTEL_SDK_DISABLED', 'false');
    vi.stubEnv('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', 'http://127.0.0.1:1/v1/traces');
    const sdk = startTracing();
    // Without a registered provider, spans get the all-zero, invalid context.
    expect(isSpanContextValid(trace.getTracer('test').startSpan('probe').spanContext())).toBe(true);
    await expect(sdk.shutdown()).resolves.toBeUndefined();
  });
});
