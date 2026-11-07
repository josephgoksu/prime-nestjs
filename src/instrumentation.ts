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
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { HEALTH_PATHS } from './health/health-paths';

const enabled =
  process.env.OTEL_SDK_DISABLED !== 'true' && Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);

export const otelSdk = enabled
  ? new NodeSDK({
      resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'prime-nestjs' }),
      traceExporter: new OTLPTraceExporter(),
      // Tracing only. Without these the SDK also exports logs and metrics over OTLP
      // by default, which trace-only backends such as Jaeger reject. Logs go to stdout.
      logRecordProcessors: [],
      metricReaders: [],
      instrumentations: [
        // Probes would otherwise produce most of the spans.
        new HttpInstrumentation({ ignoreIncomingRequestHook: (req) => HEALTH_PATHS.has((req.url ?? '').split('?')[0]) }),
        new PgInstrumentation(),
        // Adds trace_id and span_id to every log line.
        new PinoInstrumentation({ disableLogSending: true }),
      ],
    })
  : undefined;

otelSdk?.start();

/**
 * Exports the remaining spans and stops tracing. Runs from LoggerModule's
 * onApplicationShutdown, after Nest has closed the HTTP server, so spans of
 * requests that finish while the server drains are exported too.
 */
export async function shutdownTracing(): Promise<void> {
  await otelSdk?.shutdown().catch(() => undefined);
}
