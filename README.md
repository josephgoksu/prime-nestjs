# Prime NestJS Boilerplate

<p align="center">
  <img src="documentation/prime-nestjs.jpg" width="600" alt="prime-nestjs">
</p>

## Status

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Known Vulnerabilities](https://snyk.io/test/github/josephgoksu/prime-nestjs/badge.svg)](https://snyk.io/test/github/josephgoksu/prime-nestjs)
![Maintenance](https://img.shields.io/maintenance/yes/2024.svg)
![GitHub last commit](https://img.shields.io/github/last-commit/josephgoksu/prime-nestjs.svg)

## Project Stats

![GitHub issues](https://img.shields.io/github/issues/josephgoksu/prime-nestjs.svg)
![GitHub stars](https://img.shields.io/github/stars/josephgoksu/prime-nestjs.svg?style=social&label=Star)
![GitHub contributors](https://img.shields.io/github/contributors/josephgoksu/prime-nestjs.svg)
![GitHub package.json version](https://img.shields.io/github/package-json/v/josephgoksu/prime-nestjs.svg)
![GitHub](https://img.shields.io/github/languages/top/josephgoksu/prime-nestjs.svg)
![GitHub](https://img.shields.io/github/languages/count/josephgoksu/prime-nestjs.svg)
![GitHub](https://img.shields.io/github/languages/code-size/josephgoksu/prime-nestjs.svg)
![GitHub](https://img.shields.io/github/repo-size/josephgoksu/prime-nestjs.svg)

## Repository Activity

![GitHub](https://img.shields.io/github/commit-activity/m/josephgoksu/prime-nestjs.svg)
![GitHub](https://img.shields.io/github/commit-activity/w/josephgoksu/prime-nestjs.svg)
![GitHub](https://img.shields.io/github/commit-activity/y/josephgoksu/prime-nestjs.svg)
![GitHub](https://img.shields.io/github/commit-activity/w/josephgoksu/prime-nestjs.svg)

## 📖 Description

Enterprise-grade NestJS starter kit with battle-tested architecture and security-first design. Built for teams who need a robust foundation for scalable Node.js applications with:

### Key Features

- 📱 **NestJS** — Latest version with TypeScript support
- 🔐 **Security**
  - JWT Authentication with RSA256
  - Role-Based Access Control (RBAC)
  - Claims-Based Access Control (CBAC)
  - Helmet for secure HTTP headers
- 🏪 **Database**
  - PostgreSQL with TypeORM
  - Migration support
  - Database schema synchronization
- 🛠 **Development Tools**
  - Docker Compose setup
  - Environment configuration with Dotenv
  - Swagger API documentation
  - ESLint & Prettier configuration
  - Conventional commit linting
  - CodeQL security scanning
  - Jest testing framework
- 📚 **Documentation**
  - Swagger UI
  - Insomnia API collection

## 🏗 Project Structure

```
src/
├── auth/           # Authentication & authorization
├── config/         # Configuration modules
├── logger/         # Custom logging functionality
├── tasks/          # Task management module
├── users/          # User management module
├── app.module.ts   # Main application module
└── main.ts         # Application entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL
- Docker (optional)

### Quick Setup (Production)

```bash
bash ./setup.sh
```

### Development Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`

### Running the Application

```bash
# Development mode
npm run start

# Watch mode with hot-reload
npm run start:dev

# Production mode
npm run start:prod
```

### Database Management

```bash
# Sync database schema
npm run schema:sync

# Generate migration
npm run add:migration [MigrationName]

# Apply migrations
npm run apply:migration

# Revert last migration
npm run revert:migration
```

### Docker Support

```bash
# Build containers
npm run docker:build

# Start services
npm run docker:up

# Stop services
npm run docker:down
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🔒 Security Setup

### SSL Certificate Generation

#### 1. Generate RSA Private Key

```bash
openssl genrsa -out private_key.pem 2048

# Format key for environment variable
awk 'NF {sub(/\r/, ""); printf"%s\\n",$0;}' private_key.pem
```

#### 2. Extract Public Key

```bash
openssl rsa -in private_key.pem -outform PEM -pubout -out public_key.pem

# Format key for environment variable
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public_key.pem
```

## 📝 API Documentation

### Swagger UI

Access the Swagger documentation at `/api` when running the application.

### Insomnia Collection

1. Install Insomnia
2. Import the `endpoints.json` file
3. Start exploring the APIs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://josephgoksu.com">
        <img src="https://avatars.githubusercontent.com/u/6523823?v=3?s=100" width="100px;" alt=""/>
        <br />
        <sub><b>Joseph Goksu</b></sub>
      </a>
      <br />
      <a href="https://josephgoksu.com/aboutme" title="About me">📖</a>
    </td>
  </tr>
</table>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=josephgoksu/prime-nestjs&type=Timeline)](https://star-history.com/#josephgoksu/prime-nestjs&Timeline)
