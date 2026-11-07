describe('instrumentation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('stays off when no OTLP endpoint is configured', async () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', '');
    vi.stubEnv('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', '');
    const { otelSdk } = await import('./instrumentation.js');
    expect(otelSdk).toBeUndefined();
  });

  it('stays off when OTEL_SDK_DISABLED=true, even with an endpoint', async () => {
    vi.stubEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318');
    vi.stubEnv('OTEL_SDK_DISABLED', 'true');
    const { otelSdk } = await import('./instrumentation.js');
    expect(otelSdk).toBeUndefined();
  });
});
