# Configuration

All configuration comes from environment variables. `.env` is loaded in development, and `.env.example` lists every variable. The app validates them at startup and exits with a list of problems instead of starting half-configured.

## Variables

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `production` turns off Swagger and switches logs to JSON |
| `PORT` | `3000` | |
| `ALLOWED_ORIGINS` | | Comma-separated CORS origins |
| `TRUST_PROXY` | `false` | Behind a proxy or load balancer: a hop count (`1`) or the proxy subnets. Avoid `true`, which lets clients choose their own IP and get around rate limits |
| `POSTGRES_HOST` | | Required. `localhost` on your machine; Docker Compose sets `database` for the app container |
| `POSTGRES_PORT` | `5432` | |
| `POSTGRES_USER` | | Required |
| `POSTGRES_PASSWORD` | | |
| `POSTGRES_DB` | | Required |
| `POSTGRES_SSL` | `false` | |
| `POSTGRES_SSL_REJECT_UNAUTHORIZED` | `true` | Set `false` only for providers with self-signed certificates |
| `POSTGRES_POOL_SIZE` | `10` | Connections per app instance |
| `DB_RUN_MIGRATIONS` | `false` | `true` applies pending migrations at startup (Docker Compose sets it) |
| `PRIVATE_KEY`, `PUBLIC_KEY` | | Required. RSA, 2048 bits or more, matching pair. `npm run keys:generate` writes them |
| `JWT_EXPIRES_IN` | `15m` | Access token lifetime: a number with a unit (`15m`, `1h`, `7d`) |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | 1 to 365. Sliding: each refresh starts a new period |
| `THROTTLE_TTL_MS` | `60000` | Rate-limit window, at least 1000 |
| `THROTTLE_LIMIT` | `100` | Requests per window per client IP |
| `THROTTLE_AUTH_LIMIT` | `10` | Stricter limit for login, register and adding members |
| `LOG_LEVEL` | `info` in production, `debug` otherwise | `trace`, `debug`, `info`, `warn`, `error`, `fatal` or `silent` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | | Turns on tracing. See [observability.md](./observability.md) |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | | Traces-only endpoint, used instead of the one above |
| `OTEL_SERVICE_NAME` | `prime-nestjs` | |
| `OTEL_SDK_DISABLED` | `false` | `true` turns tracing off even with an endpoint |

Booleans must be `true` or `false`, and numbers must be plain digits. A typo like `POSTGRES_SSL=yes` stops the app at startup.

## Adding a variable

1. Add it with a default and a comment to `.env.example`.
2. Add a validated property to `EnvironmentVariables` in `src/config/env.validation.ts`.
3. Read it in `src/config/index.ts` and use it through `ConfigService`.

## Rate limiting

Every route is rate limited per client IP with an in-memory store. Health endpoints are exempt. With several app instances each one counts separately: use a shared store such as `@nest-lab/throttler-storage-redis` if you need one global limit.

## Database and migrations

```bash
npm run migration:generate -- src/migrations/AddThing   # from entity changes
npm run migration:run
npm run migration:revert
```

Register new entities in `src/config/database.ts` and new migrations in `src/migrations/index.ts`, as classes. A unit test fails when a migration file is not registered. `npm run schema:sync` exists for quick experiments, but do not use it on a database that migrations manage.
