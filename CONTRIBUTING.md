# Contributing to ContextLens

Thank you for your interest in contributing! ContextLens is an open-source tool for visualizing LLM context window management, and we welcome contributions from researchers, builders, and developers.

## How to Contribute

### 1. Fork and Clone

```bash
git clone https://github.com/sherpadude/context-lens.git
cd context-lens
pnpm install
```

### 2. Create a Branch

Always create a feature branch from `main`. Never push directly to `main` — direct pushes are blocked.

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 3. Make Your Changes

- Keep changes focused and small where possible
- Follow the existing code style (TypeScript, Tailwind, React)
- All logic should remain client-side — no API keys or backend calls
- Run `pnpm --filter @workspace/context-lens run dev` to test locally

### 4. Open a Pull Request

Push your branch and open a PR against `main`. Your PR will automatically trigger:

**Security Gate (required — all must pass before merge):**
- Secret scanning — checks for leaked API keys or credentials
- Dependency audit — `npm audit` for known vulnerabilities
- CodeQL static analysis — JavaScript/TypeScript code quality
- AI pattern scan — detects prompt injection strings, suspicious `eval` usage, and hard-coded external fetch targets

**Owner Approval Gate:**
After all security checks pass, the repository owner receives an email notification and must approve the merge before it can proceed. This is an intentional design choice for a security-focused tool.

### 5. What to Expect

- Automated checks run within ~2 minutes of opening a PR
- If any check fails, the PR cannot be merged until the issue is resolved
- Owner review happens within 48 hours for most PRs
- Small, well-scoped PRs are reviewed and merged faster

## Code Style

- **TypeScript** everywhere — no `any` types without justification
- **No backend dependencies** — ContextLens is intentionally client-side only
- **No telemetry** — we don't track users, ever
- Prefer descriptive variable names over comments

## Reporting Security Issues

Please do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for responsible disclosure guidelines.

## Questions?

Open a [GitHub Discussion](https://github.com/sherpadude/context-lens/discussions) or file an issue with the `question` label.
