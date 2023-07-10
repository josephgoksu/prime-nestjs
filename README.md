# NestJS Boilerplate

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![GitHub issues](https://img.shields.io/github/issues/joeygoksu/prime-nestjs.svg)
[![Known Vulnerabilities](https://snyk.io/test/github/joeygoksu/prime-nestjs/badge.svg)](https://snyk.io/test/github/joeygoksu/prime-nestjs)
![GitHub stars](https://img.shields.io/github/stars/joeygoksu/prime-nestjs.svg?style=social&label=Star&maxAge=2592000)

<p align="left">
  <img src="documentation/prime-nestjs.jpg" width="600" alt="prime-nestjs">
</p>

## 📖 Description

![Open Source Love](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)
![Maintenance](https://img.shields.io/maintenance/yes/2023.svg)
![GitHub last commit](https://img.shields.io/github/last-commit/joeygoksu/prime-nestjs.svg)
![GitHub repo size](https://img.shields.io/github/repo-size/joeygoksu/prime-nestjs.svg)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/joeygoksu/prime-nestjs.svg)
![GitHub top language](https://img.shields.io/github/languages/top/joeygoksu/prime-nestjs.svg)
![GitHub language count](https://img.shields.io/github/languages/count/joeygoksu/prime-nestjs.svg)
![GitHub contributors](https://img.shields.io/github/contributors/joeygoksu/prime-nestjs.svg)
![GitHub commit activity the past week, 4 weeks, year](https://img.shields.io/github/commit-activity/y/joeygoksu/prime-nestjs.svg)
![GitHub commit activity the past week, 4 weeks, year](https://img.shields.io/github/commit-activity/m/joeygoksu/prime-nestjs.svg)
![GitHub commit activity the past week, 4 weeks, year](https://img.shields.io/github/commit-activity/w/joeygoksu/prime-nestjs.svg)
![GitHub package.json version](https://img.shields.io/github/package-json/v/joeygoksu/prime-nestjs.svg)

Introducing the NestJS boilerplate - a great way to get started on your next Node.js project! It's built using the latest version of NestJS, which is a powerful and flexible framework for creating efficient and scalable server-side applications. The boilerplate includes TypeScript, PostgreSQL, and JWT authentication right out of the box, so you don't have to worry about setting those up yourself.

Other awesome features include configuration support with Dotenv, RBAC and CBAC for authorization, TypeORM for interacting with databases, Swagger for API documentation, and Docker Compose for container orchestration. Plus, the boilerplate also comes with pre-configured linting tools and secure HTTP headers with Helmet.

Getting started is easy - just clone the repository, install the dependencies, and you're ready to start building your next great idea!

## 🚀 Features

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
- 🕵️‍♂️ **Code Scanning** - Code scanning with CodeQL

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

Made with ♥ by <a href="https://josephgoksu.com/">Joseph Göksu</a>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=josephgoksu/prime-nestjs&type=Timeline)](https://star-history.com/#josephgoksu/prime-nestjs&Timeline)

