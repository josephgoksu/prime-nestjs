/**
 * OpenTelemetry tracing. Imported early in main.ts so the instrumentations
 * can patch http, pg and pino before those modules load.
 *
 * Spans: incoming and outgoing HTTP, and every Postgres query. Express and
 * Nest route spans are not included: their instrumentations do not support
 * Nest 12 (ESM) yet. The HTTP span still carries method, URL and status.
 *
 * Off by default. It starts only when OTEL_EXPORTER_OTLP_ENDPOINT (or
 * OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) is set, and OTEL_SDK_DISABLED=true
 * turns it off. Any OTLP/HTTP backend works: an OpenTelemetry Collector,
 * Jaeger, Grafana Tempo, Honeycomb, Datadog, New Relic and others.
 *
 * Standard OTEL_* variables apply, for example OTEL_SERVICE_NAME,
 * OTEL_EXPORTER_OTLP_HEADERS and OTEL_TRACES_SAMPLER / OTEL_TRACES_SAMPLER_ARG.
 */
import type { NodeSDK } from '@opentelemetry/sdk-node';

/**
 * Tracing is on when an OTLP endpoint is set and OTEL_SDK_DISABLED is not true.
 * Values are trimmed and OTEL_SDK_DISABLED is case-insensitive, as in the SDK, so
 * the SDK is not loaded when it would stay off anyway.
 */
export const tracingEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.OTEL_SDK_DISABLED?.trim().toLowerCase() !== 'true' &&
  Boolean(env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim());

// A synchronous require, not an import: the SDK must patch http, pg and pino before
// main.ts loads them, and only when tracing is on. Node resolves it to the compiled
// tracing.js, so it does not work under Vitest: the Vitest configs set OTEL_SDK_DISABLED.
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const otelSdk: NodeSDK | undefined = tracingEnabled() ? (require('./tracing') as typeof import('./tracing')).startTracing() : undefined;

/**
 * Exports the remaining spans and stops tracing. Runs from LoggerModule's
 * onApplicationShutdown, after Nest has closed the HTTP server, so spans of
 * requests that finish while the server drains are exported too.
 */
export async function shutdownTracing(): Promise<void> {
  await otelSdk?.shutdown().catch(() => undefined);
}
