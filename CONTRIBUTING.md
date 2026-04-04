# Contributing to ContextLens

Thank you for your interest in contributing! ContextLens is an open-source tool for visualizing LLM context window management, and we welcome contributions from the community.

## How to Contribute

### 1. Fork and Branch

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/context-lens.git
   cd context-lens
   ```
3. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Use descriptive branch names like `fix/niah-heatmap-model-scale` or `feat/export-csv`.

### 2. Set Up the Project

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm --filter @workspace/context-lens run dev
```

The app runs on the port set by the `PORT` environment variable (default: 5173).

### 3. Make Your Changes

- Keep changes focused — one feature or fix per pull request
- Follow the existing code style (TypeScript, functional React components)
- All logic must remain client-side — no API keys, no backend calls
- Do not introduce telemetry or external data collection

### 4. Open a Pull Request

Push your branch to your fork and open a PR against `main` on this repository.

**What to expect from the security gate:**

Every pull request automatically triggers a multi-stage security pipeline before it can be merged:

| Check | What it does |
|-------|-------------|
| **Secret Scan** | Detects leaked API keys, tokens, and credentials (TruffleHog) |
| **Dependency Audit** | Flags known-vulnerable npm packages (`npm audit --audit-level=high`) |
| **CodeQL Analysis** | Static analysis for JavaScript/TypeScript security issues |
| **AI Pattern Scan** | Custom check for prompt injection strings, hardcoded external fetch targets, and `eval` misuse |

All four checks must pass before a merge is allowed. If any check fails, the PR will be blocked and you will see inline annotations explaining what was found. Fix the flagged issue and push a new commit — the checks will re-run automatically.

Once all checks pass, the repository owner receives an approval request via GitHub's notification system. Only after the owner approves does the merge proceed. This is intentional — it ensures every change to `main` has been reviewed by a human.

### 5. What Makes a Good PR

- A clear title and description explaining *what* changed and *why*
- No large unrelated refactors bundled in
- Source files only — no build artifacts or `node_modules`
- Tests or documented manual verification steps for non-trivial changes

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold its standards.

## Security Issues

Please do **not** open public GitHub issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
