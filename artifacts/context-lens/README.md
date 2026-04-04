# ContextLens

**Spatially visualize LLM context window management.** An open-source, fully client-side tool for AI researchers and builders who want to understand what's really happening inside their model's context window.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Security Gate](https://github.com/sherpadude/context-lens/actions/workflows/security-scan.yml/badge.svg)](https://github.com/sherpadude/context-lens/actions/workflows/security-scan.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## What is ContextLens?

LLMs have a fixed context window. What you put in it — and in what order — dramatically affects output quality. ContextLens makes this concrete and visual across three modes:

| Mode | Description |
|------|-------------|
| **Analyze** | Paste any prompt/conversation → get an instant spatial health report |
| **Explore** | Animated scenario walkthroughs teaching context poisoning, identity drift, and multi-agent isolation |
| **Simulate** | Compare three compression strategies side-by-side + NIAH recall heatmap |

## Features

- **Zero setup** — no API keys, no backend, runs entirely in-browser
- **Multi-format input** — OpenAI messages array, Anthropic Messages API format, JSONL, or plain text
- **Spatial context map** — see exactly how your tokens are allocated across segment types
- **Health scoring** — composite score across token efficiency, recency distribution, identity survival, and poison risk
- **Compression comparison** — sliding window vs. summarization vs. hard truncation
- **NIAH heatmap** — visualize needle-in-a-haystack retrieval degradation across context lengths
- **Cross-mode transfer** — click "Open in Analyze" from Explore to analyze the current scenario state
- **Local history** — save and revisit past reports from the History dropdown
- **WebSocket connect** — experimental UI placeholder for future live agent streaming (no real WebSocket handshake yet)

## Supported Input Formats

### Plain text
Any text pasted directly is treated as a single system-prompt segment.

### OpenAI Chat Completions format
```json
[
  { "role": "system", "content": "You are a helpful assistant." },
  { "role": "user", "content": "What is the capital of France?" },
  { "role": "assistant", "content": "Paris." }
]
```

Or the full request body:
```json
{
  "model": "gpt-4o",
  "messages": [...]
}
```

### Anthropic Messages API format
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "system": "You are a helpful assistant.",
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ]
}
```

### JSONL (one JSON object per line)
```
{"role":"system","content":"You are a helpful assistant."}
{"role":"user","content":"Hi!"}
{"role":"assistant","content":"Hello!"}
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm --filter @workspace/context-lens run dev
```

Visit `http://localhost:5173` (or whatever port Vite assigns).

## Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** (dark observatory theme)
- **Framer Motion** (scenario animations)
- All logic is client-side — no API calls, no telemetry

## Project Structure

```
src/
  data/          # Scenario definitions (scenarios.ts)
  lib/           # Core logic
    parser.ts    # Multi-format input parsing
    scoring.ts   # Health score + risk detection
    tokenizer.ts # Token estimation + cost projection
    compression.ts  # Sliding window, summarization, hard truncation
    niahData.ts  # NIAH heatmap data generation
    history.ts   # LocalStorage history
    models.ts    # Model registry (GPT-4o, Claude 3.5, Gemini 2.5, Llama 3.1)
  pages/         # AnalyzePage, ExplorePage, SimulatePage
  components/    # TopNav, UI primitives
  types/         # Shared TypeScript interfaces
```

## Concepts Covered

- **Context Poisoning** — how early errors anchor future responses (accuracy drops 39% per MSFT/Salesforce research)
- **Identity Drift** — system prompt dilution over long conversations
- **Multi-Agent Context Isolation** — leakage risks in orchestrator–subagent architectures
- **Memory Injection Attacks** — how jailbreaks exploit context structure
- **NIAH Degradation** — why models miss information at context boundaries

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

All pull requests automatically trigger a **Security Gate** that includes:
- Secret scanning (Gitleaks)
- Dependency vulnerability audit (`pnpm audit`)
- CodeQL static analysis
- AI pattern scan (checks for prompt injection, suspicious eval, unexpected external fetches)

PRs cannot be merged until all security checks pass **and** the repository owner approves.

## Security

If you find a vulnerability, please follow the [Security Policy](SECURITY.md) and **do not** open a public issue.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](LICENSE) for details.
