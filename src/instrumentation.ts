/**
 * OpenTelemetry tracing. Imported first in main.ts so the instrumentations
 * can patch http, express, pg and pino before those modules load.
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
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const HEALTH_PATHS = ['/health/live', '/health/ready', '/health-check'];

const enabled =
  process.env.OTEL_SDK_DISABLED !== 'true' && Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);

export const otelSdk = enabled
  ? new NodeSDK({
      resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'prime-nestjs' }),
      traceExporter: new OTLPTraceExporter(),
      instrumentations: [
        // Probes would otherwise produce most of the spans.
        new HttpInstrumentation({ ignoreIncomingRequestHook: (req) => HEALTH_PATHS.includes((req.url ?? '').split('?')[0]) }),
        new ExpressInstrumentation(),
        new NestInstrumentation(),
        new PgInstrumentation(),
        // Adds trace_id and span_id to every log line.
        new PinoInstrumentation(),
      ],
    })
  : undefined;

if (otelSdk) {
  otelSdk.start();
  const shutdown = () => {
    otelSdk.shutdown().catch(() => undefined);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
