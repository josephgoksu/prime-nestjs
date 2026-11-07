# AGENTS.md

Guidance for coding agents and contributors working in this repository.

## Stack

- NestJS 12 (CommonJS app code; the `@nestjs/*` packages are ESM and load through `require(esm)`)
- TypeScript 6, `module`/`moduleResolution: nodenext`, relative imports only (no `src/*` path alias)
- TypeORM 1 with PostgreSQL
- Vitest 5 with SWC (`unplugin-swc`) for unit and e2e tests
- ESLint 9 flat config (`eslint.config.mjs`) with typed `typescript-eslint` rules, Prettier
- Node.js `^22.13.0 || >=24.11.0` (24 LTS recommended)

## Commands

```bash
npm run start:dev        # watch mode
npm run build            # nest build -> dist/
npm test                 # unit tests (src/**/*.spec.ts)
npm run test:e2e         # e2e tests (test/**/*.e2e-spec.ts), needs Postgres + JWT keys
npm run test:cov         # coverage
npm run lint:check       # lint without fixing (CI)
npm run format:check     # prettier check (CI)
npm run lint             # lint and fix
npm run format           # prettier write
npm run schema:sync      # dev only: sync schema from entities
npm run migration:generate -- src/migrations/Name
npm run migration:run
npm run keys:generate    # RS256 key pair into .env (--force to rotate)
```

Run `lint:check`, `format:check`, `build`, `npm test` and, when you touch persistence or HTTP behavior, `test:e2e` before you push.

## Layout

```
src/
├── app.module.ts        # root module: config, TypeORM, schedule, feature modules
├── main.ts              # bootstrap: helmet, CORS, ValidationPipe, Swagger (non-production)
├── config/              # env-based config; database.ts is shared by the app and the TypeORM CLI
├── auth/                # login/register, JWT (RS256) strategy, JwtAuthGuard, RolesGuard
├── users/               # User entity, Role enum, UsersService
├── organizations/       # tenants: Organization, Membership (owner/admin/member), OrganizationGuard
├── tasks/               # example CRUD feature, personal or per organization
└── logger/              # LoggerService
test/                    # e2e tests
```

## Conventions

- One feature per module: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `entities/`.
- Validate every request body with class-validator DTOs. The global `ValidationPipe` uses `whitelist` and `forbidNonWhitelisted`.
- Register new entities in `src/config/database.ts` (`entities: [...]`) as classes, not globs. Globs load a second copy of each class under the test runner and the CLI, and TypeORM then cannot find metadata.
- Unit tests sit next to the code as `*.spec.ts` and use `vi.fn()` / `vi.mock()`. Mock repositories with `getRepositoryToken(Entity)`.
- Scope tenant data with `OrganizationGuard` and `@CurrentMembership()` (see `tasks/`): no `X-Organization-Id` header means personal scope; a caller who is not a member gets 404, not 403.
- Never log secrets, tokens or password hashes. Never return `password` from an endpoint.
- Configuration comes from environment variables only. Add every new variable to `.env.example`.

## Git

- Conventional commits: `type(scope): description` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`).
- One focused change per pull request.
