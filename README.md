# Prime NestJS

**Stop wiring up auth, databases, and configs from scratch. Start building your product.**

<p align="center">
  <img src="documentation/prime-nestjs.jpg" width="600" alt="prime-nestjs">
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://snyk.io/test/github/josephgoksu/prime-nestjs"><img src="https://snyk.io/test/github/josephgoksu/prime-nestjs/badge.svg" alt="Known Vulnerabilities"></a>
  <img src="https://img.shields.io/github/last-commit/josephgoksu/prime-nestjs.svg" alt="GitHub last commit">
  <img src="https://img.shields.io/github/stars/josephgoksu/prime-nestjs.svg?style=social&label=Star" alt="GitHub stars">
  <img src="https://img.shields.io/github/forks/josephgoksu/prime-nestjs.svg?style=social&label=Fork" alt="GitHub forks">
</p>

Production-ready NestJS starter kit. Clone it, configure your `.env`, and ship — auth, database, docs, and Docker are already done.

### What's Inside

- **JWT Authentication** (RSA256) with Role-Based Access Control
- **PostgreSQL + TypeORM** with migrations and connection pooling
- **Swagger API Docs** auto-generated at `/api`
- **Docker Compose** — one command to run everything
- **Testing** with Vitest (unit + e2e)
- **Code Quality** with ESLint, Prettier, Husky, commitlint
- **Security** hardened with Helmet and CORS
- **Health Checks** built-in for production monitoring

## Quick Start

### Prerequisites

- Node.js 22.13+ or 24.11+ (24 LTS recommended)
- PostgreSQL (or use Docker)

### Setup

```bash
git clone https://github.com/josephgoksu/prime-nestjs.git
cd prime-nestjs
./setup.sh            # .env, JWT keys, npm ci, Postgres in Docker, migrations
npm run start:dev
```

`./setup.sh --docker` runs the app in Docker too, and `./setup.sh --no-docker` uses the Postgres set in `.env`. The script keeps an existing `.env` and existing keys, so it is safe to run again.

Without the script (for example on Windows without bash):

```bash
npm ci
cp .env.example .env
npm run keys:generate     # writes PRIVATE_KEY and PUBLIC_KEY to .env
docker compose up -d --wait database
npm run migration:run
npm run start:dev
```

API available at `http://localhost:3000` | Swagger docs at `http://localhost:3000/api`

## Development

### Available Scripts

```bash
npm run start:dev     # Development with hot-reload
npm run build         # Build for production
npm run start:prod    # Run production build
npm run test          # Run unit tests
npm run test:e2e      # Run e2e tests
npm run test:cov      # Generate coverage report
npm run lint          # Lint and fix code
npm run format        # Format code with Prettier
```

### Database

```bash
npm run migration:run                                   # Apply pending migrations
npm run migration:generate -- src/migrations/AddThing   # Generate a migration from entity changes
npm run migration:revert                                # Revert the last migration
npm run schema:sync                                     # Dev only: sync schema without migrations
```

Register each new migration class in `src/migrations/index.ts`. A unit test fails if one is missing. Set `DB_RUN_MIGRATIONS=true` to apply pending migrations on startup (Docker Compose does this).

### Docker

```bash
npm run docker:build   # Build containers
npm run docker:up      # Start all services
npm run docker:down    # Stop all services
```

## Project Structure

```
src/
├── auth/           # JWT authentication & guards
├── config/         # App configuration
├── tasks/          # Task management feature
├── users/          # User management
└── main.ts         # Application entry
```

## Environment Variables

```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=mysecretpassword
POSTGRES_DB=postgres

# App
PORT=3000
NODE_ENV=development

# Auth (generate your own keys - see Security section)
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
```

## Security

### Generate RSA Keys

```bash
npm run keys:generate               # fills PRIVATE_KEY/PUBLIC_KEY in .env if unset
npm run keys:generate -- --force    # rotates them: current access tokens stop working, clients renew them with their refresh token
npm run -s keys:generate -- --print # prints them, for a secret manager (-s keeps npm's banner out of the output)
```

The app refuses to start with keys under 2048 bits or a private and public key that do not match. Use different keys for each environment and keep production keys in your secret manager, not in `.env` files in the repository.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

[MIT](LICENSE) © [Joseph Goksu](https://josephgoksu.com)

---

If this saved you time, consider giving it a star. It helps others find it.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=josephgoksu/prime-nestjs&type=Timeline)](https://star-history.com/#josephgoksu/prime-nestjs&Timeline)
