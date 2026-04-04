# Contributing to ContextLens

Thank you for your interest in contributing to ContextLens! This document explains how to get started, what to expect from the review process, and how our automated security gate works.

## Table of Contents

- [Getting Started](#getting-started)
- [Branching & Pull Requests](#branching--pull-requests)
- [The Automated Security Gate](#the-automated-security-gate)
- [Code Style](#code-style)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/context-lens.git
   cd context-lens
   ```
3. **Install dependencies** (requires [pnpm](https://pnpm.io/)):
   ```bash
   pnpm install
   ```
4. **Start the development server:**
   ```bash
   pnpm --filter @workspace/context-lens run dev
   ```
5. Create a new branch for your change:
   ```bash
   git checkout -b feat/my-feature
   ```

---

## Branching & Pull Requests

- All changes **must** go through a pull request targeting `main`. Direct pushes to `main` are blocked.
- Branch names should follow the convention: `feat/`, `fix/`, `docs/`, `chore/`.
- Keep PRs focused — one logical change per PR.
- Add a clear description of what changed and why.
- Link any related issues using `Closes #<issue>` in the PR body.

---

## The Automated Security Gate

Every pull request automatically runs a multi-stage security pipeline before it can be merged. Here is what happens and what you need to know:

### Stage 1 — Secret Scanning
We use [TruffleHog](https://github.com/trufflesecurity/trufflehog) to detect leaked API keys, tokens, credentials, and other secrets in your diff. **Do not commit secrets.** If you need to test with a real API key locally, use a `.env` file that is already in `.gitignore`.

### Stage 2 — Dependency Audit
`npm audit --audit-level=high` is run across the entire monorepo. PRs that introduce high or critical severity dependency vulnerabilities will fail. If you are upgrading a dependency that has a known vulnerability, please note that explicitly in your PR description.

### Stage 3 — CodeQL Static Analysis
GitHub's CodeQL analyzes the JavaScript/TypeScript codebase for common vulnerability patterns (injection, prototype pollution, etc.). This runs on every PR and takes 2–5 minutes.

### Stage 4 — AI-Specific Pattern Scan
A custom Node.js scanner checks for patterns that are especially risky in AI tooling:
- Prompt injection strings (e.g., `ignore previous instructions`, `system:` overrides)
- Hard-coded external URLs in `fetch`/`XMLHttpRequest` calls that are not the project's own API
- Use of `eval()` or the `Function` constructor

If your PR fails this check legitimately (e.g., you are adding a test fixture with an injection string), leave a comment explaining the context and a maintainer can approve an exception.

### Stage 5 — Owner Approval Gate
After all security checks pass, the workflow pauses and emails the repository owner for final approval. Only after they click **Approve** in GitHub does the merge status check turn green. This ensures a human reviews every merge into `main`.

**What this means for you:** After your PR passes all automated checks, you may need to wait up to 24 hours for the owner approval step. This is by design. You will see a pending status check called `Merge Gate / await-owner-approval` while it waits.

---

## Code Style

- We use **Prettier** for formatting. Run `pnpm prettier --write .` before committing.
- TypeScript strict mode is enabled. Do not use `any` unless absolutely necessary and documented.
- Keep components small and composable.
- All new logic should live in `src/lib/` as pure functions where possible.

---

## Reporting Bugs

Please open a GitHub Issue. If the bug is security-related, follow the [Security Policy](SECURITY.md) instead of opening a public issue.

---

## Feature Requests

Open a GitHub Issue with the `enhancement` label. Describe the use case, not just the feature. We are especially interested in contributions that improve the educational value of the Explore mode scenarios or add new compression strategies to the Simulate mode.
