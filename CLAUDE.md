# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Running the Application
```bash
# Development with hot-reload
npm run start:dev

# Production mode
npm run start:prod

# Run tests
npm test

# Run specific test file
npm test -- src/auth/auth.service.spec.ts

# Run e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Code Quality
```bash
# Format code
npm run format

# Lint and fix
npm run lint
```

### Database Management
```bash
# Sync database schema (development only)
npm run schema:sync

# Generate new migration
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Docker Operations
```bash
# Build and start all services
npm run docker:up

# Stop all services
npm run docker:down
```

## Architecture Overview

This is a NestJS application following a modular architecture with the following key patterns:

### Module Structure
- **Core Modules**: `AppModule` serves as the root module, importing all feature modules
- **Feature Modules**: Each feature (auth, users, tasks) is encapsulated in its own module with controllers, services, entities, and DTOs
- **Configuration**: Global configuration via `ConfigModule` using environment variables

### Authentication & Authorization
- JWT-based authentication using RSA256 algorithm
- Role-Based Access Control (RBAC) with roles defined in `src/users/enums/role.enum.ts`
- JWT strategy implementation in `src/auth/strategy/jwt.strategy.ts`
- Guards for authentication (`JwtAuthGuard`) and authorization (`RolesGuard`)

### Database Architecture
- PostgreSQL with TypeORM
- Entities extend base TypeORM entities
- Database configuration in `src/config/database.ts`
- Support for migrations and synchronization
- Connection pooling and SSL support

### Key Architectural Decisions
1. **Modular Design**: Each feature is self-contained with its own module, making the codebase scalable
2. **Security First**: JWT with RSA256, helmet for headers, role-based access control
3. **Environment Configuration**: All sensitive data and configuration through environment variables
4. **TypeORM Integration**: Database operations are abstracted through repositories
5. **API Documentation**: Swagger/OpenAPI integration for automatic API documentation at `/api`

### Directory Structure Patterns
- DTOs in `dto/` subdirectories for request/response validation
- Entities in `entities/` subdirectories for database models
- Services contain business logic
- Controllers handle HTTP requests and responses
- Guards and strategies in respective subdirectories

### Testing Strategy
- Unit tests alongside source files (`.spec.ts`)
- E2E tests in `test/` directory
- Jest as the testing framework
- Test database configuration should mirror development setup

### Environment Variables
Key environment variables defined in `.env`:
- Database connection (POSTGRES_*)
- JWT keys (PRIVATE_KEY, PUBLIC_KEY)
- Application port (PORT)
- Node environment (NODE_ENV)