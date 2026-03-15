# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | Yes                |
| < 2.0   | No                 |

Only the latest major version receives security patches.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Use one of these channels instead:

1. **GitHub Private Vulnerability Reporting** (preferred) - go to the [Security tab](https://github.com/josephgoksu/prime-nestjs/security/advisories/new) and submit a private advisory.
2. **Email** - send details to josephgoksu@gmail.com.

### What to Include

- Description of the vulnerability and its potential impact
- Steps to reproduce or a proof of concept
- Affected version(s)
- Any suggested fix (optional, but appreciated)

### Response Timeline

- **Initial acknowledgment**: within 48 hours
- **Triage and confirmation**: within 5 business days
- **Fix and release**: depends on severity, targeting 30 days for critical issues

### Disclosure Policy

This project follows coordinated vulnerability disclosure:

- Reporters will be kept informed throughout the process
- Fixes will be released before or alongside public disclosure
- A GitHub Security Advisory will be published with the fix
- Credit will be given to the reporter unless they prefer to remain anonymous

## Security Best Practices for Users

If you are deploying this boilerplate to production, make sure to:

- Generate your own RSA key pair for JWT signing (do not use the example keys)
- Set `ALLOWED_ORIGINS` to your actual domain(s), never use `*`
- Set `NODE_ENV=production` to disable Swagger UI
- Enable `POSTGRES_SSL=true` with proper certificate verification
- Use strong, unique values for all database credentials
- Keep dependencies up to date with `npm audit`
