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
- **Testing** with Jest (unit + e2e)
- **Code Quality** with ESLint, Prettier, Husky, commitlint
- **Security** hardened with Helmet and CORS
- **Health Checks** built-in for production monitoring

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- PostgreSQL (or use Docker)

### Setup

```bash
git clone https://github.com/josephgoksu/prime-nestjs.git
cd prime-nestjs
npm install
cp .env.example .env

# Start with Docker (recommended)
npm run docker:up

# OR start locally
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
npm run schema:sync              # Sync database schema (dev only)
npm run migration:generate       # Generate migration from changes
npm run migration:run            # Apply pending migrations
npm run migration:revert         # Revert last migration
```

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
# Generate private key
openssl genrsa -out private_key.pem 2048

# Extract public key
openssl rsa -in private_key.pem -pubout -out public_key.pem

# Format for .env (single line)
awk 'NF {sub(/\r/, ""); printf"%s\\n",$0;}' private_key.pem
awk 'NF {sub(/\r/, ""); printf"%s\\n",$0;}' public_key.pem
```

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
