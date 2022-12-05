<p align="left">
  <img src="./showcase/prime-nestjs.jpg" width="500" alt="prime-nestjs">
</p>

Introducing the NestJS boilerplate, a comprehensive and modular starting point for your next Node.js project! Built with the latest version of NestJS, a powerful and flexible framework for building efficient and scalable server-side applications, this boilerplate includes support for TypeScript, PostgreSQL, and JWT authentication out of the box. Other features include configuration support with Dotenv, RBAC and CBAC for authorization, TypeORM for database interactions, Swagger for API documentation, and Docker Compose for container orchestration. Additionally, the boilerplate comes with pre-configured linting tools and secure HTTP headers with Helmet. Simply clone the repository, install the dependencies, and start building your next great idea!

## Out-of-box Solutions

**Built-in Features**

- 📱 **NestJS** — latest version
- 🎉 **TypeScript** - Type checking
- ⚙️ **Dotenv** - Supports environment variables
- 🗝 **Authentication** - JWT, RSA256
- 🏬 **Authorization** - RBAC, CBAC
- 🏪 **TypeORM** - Database ORM
- 🏪 **PostgreSQL** - Open-Source Relational Database
- 🧠 **Configuration** - Single config for all
- 📃 **Swagger** - API Documentation
- 🐳 **Docker Compose** - Container Orchestration
- 🔐 **Helmet** - secure HTTP headers
- 😴 **Insomnia** - Insomnia config for endpoints
- 📏 **ESLint** — Pluggable JavaScript linter
- 💖 **Prettier** - Opinionated Code Formatter
- ✨ **Commitlint** - Lint your conventional commits

**GitHub actions**

- 🕵️‍♂️ **Code Scanning** - Code scanning with CodeQL
- 🕵️‍♂️ **Megalinter** - analyzes 48 languages, 22 formats, 19 tooling formats, excessive copy-pastes, spelling mistakes and security issues

## Quick Setup (Production)

```bash
bash ./setup.sh
```

## Installation (Development)

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Endpoints

1. Install the insomnia app
2. Import the `endpoints.json` file
3. Enjoy

## Generate SSL certificates

1.  Generate an RSA private key, of size 2048, and output it to a file named key.pem:

```bash
openssl genrsa -out private_key.pem 2048
```

```bash
# It needs be copied&pasted from terminal manually
awk 'NF {sub(/\r/, ""); printf"%s\\n",$0;}' private_key.pem
```

2.  Extract the public key from the key pair, which can be used in a certificate:

```bash
openssl rsa -in private_key.pem -outform PEM -pubout -out public_key.pem
```

```bash
# It needs be copied&pasted from terminal manually
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public_key.pem
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for more information.

<!-- ## 🌸 Built with template -->

---

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->

<table>
  <tr>
    <td align="center"><a href="https://joeygoksu.com"><img src="https://avatars.githubusercontent.com/u/6523823?v=3?s=100" width="100px;" alt=""/><br /><sub><b>Joey Goksu</b></sub></a><br />
    <a href="https://joeygoksu.com/aboutme" title="About me">📖</a>
    </td>
</table>

<!-- ALL-CONTRIBUTORS-LIST:END -->

Made with ♥ by <a href="https://joeygoksu.com/">Joey Göksu</a>
