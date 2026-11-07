/**
 * The OpenTelemetry SDK setup. instrumentation.ts loads this file only when
 * tracing is on, so an app without an OTLP endpoint does not load the SDK
 * (about 30 MB of memory and 130 ms of startup).
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { HEALTH_PATHS } from './health/health-paths';

export function startTracing(): NodeSDK {
  const sdk = new NodeSDK({
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
  });
  sdk.start();
  return sdk;
}
