# Security Policy

## Supported Versions

ContextLens is a single-version project. Security fixes are applied to the `main` branch immediately.

| Version | Supported |
|---------|-----------|
| latest (main) | ✅ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please report it privately through one of these channels:

1. **GitHub Private Vulnerability Reporting** — Use the "Security" tab on this repository to submit a private report.
2. **Direct message** — Contact the repository owner [@sherpadude](https://github.com/sherpadude) via GitHub.

### What to Include

- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional but appreciated)

## Response Timeline

- **Acknowledgment**: Within 48 hours of receiving your report
- **Assessment**: Within 5 business days
- **Fix**: Critical issues patched within 7 days; others within 30 days

## Security Design Principles

ContextLens is designed with security as a core constraint:

- **Fully client-side** — no server, no API calls, no data transmission
- **No telemetry** — zero user tracking or analytics
- **No external dependencies at runtime** — all processing happens in-browser
- **No stored credentials** — the app never asks for or stores API keys

Because there is no backend, the attack surface is limited to:
1. Supply-chain attacks on npm dependencies
2. Malicious input processed by the parser
3. XSS via crafted input strings

All PRs are automatically scanned for secrets, vulnerable dependencies, and suspicious patterns before merge.

## Disclosure Policy

We follow [coordinated vulnerability disclosure](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html). We ask that you give us a reasonable time to investigate and fix issues before public disclosure.
