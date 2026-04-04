# ContextLens

**Spatially visualize LLM context window management.** An open-source, fully client-side tool for AI researchers and builders who want to understand what's really happening inside their model's context window.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Security Gate](https://github.com/sherpadude/context-lens/actions/workflows/security-scan.yml/badge.svg)](https://github.com/sherpadude/context-lens/actions/workflows/security-scan.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## What is ContextLens?

LLMs have a fixed context window. What you put in it — and in what order — dramatically affects output quality. ContextLens makes this concrete and visual:

| Mode | Description |
|------|-------------|
| **Analyze** | Paste any prompt/conversation → get an instant spatial health report |
| **Explore** | Animated scenario walkthroughs teaching context poisoning, identity drift, and multi-agent isolation |
| **Simulate** | Compare three compression strategies side-by-side + NIAH recall heatmap |

## Features

- **Zero setup** — no API keys, no backend, runs entirely in-browser
- **Multi-format input** — OpenAI messages array, Anthropic Messages API, JSONL, or plain text
- **Health scoring** — composite score across token efficiency, recency, identity survival, and poison risk
- **NIAH heatmap** — visualize needle-in-a-haystack retrieval degradation
- **Compression comparison** — sliding window vs. summarization vs. hard truncation

## Getting Started

```bash
npm install -g pnpm
pnpm install
pnpm --filter @workspace/context-lens run dev
```

## Repository Structure

```
artifacts/context-lens/   # React + Vite + TypeScript app (main artifact)
.github/
  workflows/              # CI/CD: security gate, issue triage, merge gate
  scripts/                # ai-pattern-scan.js, setup-branch-protection.js
LICENSE
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

All pull requests automatically trigger a **Security Gate**:
- Secret scanning (Gitleaks)
- Dependency audit (`pnpm audit --audit-level=high`)
- CodeQL static analysis
- OSSF Scorecard
- AI pattern scan (prompt injection, suspicious eval, unexpected external fetch, hard-coded keys)

PRs require all security checks to pass **and** owner approval before merging.

## Security

If you find a vulnerability, please follow [SECURITY.md](SECURITY.md) — do **not** open a public issue.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](LICENSE).
