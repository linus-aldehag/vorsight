# Security Policy

## Legal and Responsible Use

Vörsight is designed for **legal, transparent monitoring** purposes only. Users must:
- Have legal authority to monitor the device and user
- Ensure the monitored party is aware of monitoring (except where legally permitted for minor children)
- Comply with all applicable privacy and monitoring laws

Misuse of this software for illegal surveillance, stalking, or unauthorized monitoring is strictly prohibited and may result in criminal penalties. Users assume all legal responsibility for their use of this software.

## Reporting a Vulnerability

If you discover a security vulnerability in Vörsight, please report it responsibly.

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please contact the maintainers privately:

- **Email**: Create a security advisory through GitHub's [private vulnerability reporting](../../security/advisories/new)
- **Alternatively**: Open a draft security advisory in this repository

We take security seriously and will respond to valid reports as quickly as possible.

## What to Include in Your Report

To help us address the issue quickly, please include:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** of the vulnerability
4. **Suggested fix** (if you have one)
5. **Your contact information** for follow-up questions

## Our Commitment

- We will acknowledge your report
- We will provide regular updates on our progress
- We will credit you in the release notes (unless you prefer to remain anonymous)
- We will work to release a fix as quickly as possible

## Supported Versions

We provide security updates for the latest release only. Please ensure you're using the most recent version before reporting an issue.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| Older   | :x:                |

## Security Best Practices

When deploying Vörsight:

1. **Use strong passphrases** for `WEB_PASSPHRASE`
2. **Never commit** `.env` files or secrets to version control
3. **Use HTTPS** for production deployments (consider reverse proxy with Let's Encrypt)
4. **Keep your system updated** - regularly update Node.js, .NET, and dependencies
5. **Restrict network access** - only allow necessary ports through your firewall
6. **Backup your database** regularly from `/opt/vorsight/data/vorsight.db`
7. **Use secure Google OAuth credentials** - restrict redirect URIs to your actual domain

## Scope

This security policy applies to:
- Vörsight Windows Service and Agent
- Vörsight Linux Server
- Vörsight Web Dashboard
- Deployment scripts and configurations

Thank you for helping keep Vörsight and its users safe!
