# Observability

## Health checks

| Path | Use it for | Checks |
|---|---|---|
| `GET /health/live` | Liveness probe | The process answers |
| `GET /health/ready` | Readiness probe | Postgres answers a ping within 1.5 s (cached for 1 s) |

Both are exempt from rate limiting and are not logged or traced, so probes do not flood your logs. `GET /health-check` is kept for older setups.

On `SIGTERM` the app stops taking new connections, finishes the requests in flight, flushes logs and exported spans, and exits.

## Logs

Logs are written with [pino](https://getpino.io): JSON lines in production, readable colored output in development.

- One line per request: method, path, status, duration and request id. 5xx responses are logged at `error`, everything else at `info`.
- Every response carries an `X-Request-Id` header. A client can send its own (up to 128 safe characters) to correlate logs across services; otherwise the app generates one.
- Passwords, access and refresh tokens, cookies and the `Authorization` header are redacted.
- Set `LOG_LEVEL` to change the level.

Inject `LoggerService` in your own code:

```ts
constructor(private readonly logger: LoggerService) {}

this.logger.log('Invoice sent', InvoicesService.name);
```

## Tracing

Tracing uses [OpenTelemetry](https://opentelemetry.io) and is off by default. When it is off, the SDK is not even loaded. Set an OTLP/HTTP endpoint to turn it on:

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=my-api
```

Any OTLP/HTTP backend works: an OpenTelemetry Collector, Jaeger, Grafana Tempo, Honeycomb, Datadog, New Relic and others. You get spans for incoming and outgoing HTTP requests and for every Postgres query, and each log line carries `trace_id` and `span_id`. The standard `OTEL_*` variables apply, for example `OTEL_EXPORTER_OTLP_HEADERS` for an API key and `OTEL_TRACES_SAMPLER` for sampling.

Try it locally with Jaeger:

```bash
docker run --rm -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npm run start:dev
# open http://localhost:16686
```

Nest route and Express middleware spans are not included yet: their instrumentations do not support NestJS 12 (ESM) at the time of writing. The HTTP span still records the method, URL and status.
