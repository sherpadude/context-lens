# ContextLens

An open-source React+Vite web app that spatially visualizes LLM context management for AI researchers and builders. Fully client-side, no API key required, MIT licensed.

## Architecture

- **Monorepo** managed with pnpm workspaces
- **Frontend**: React + Vite + TypeScript (`artifacts/context-lens/`)
- **API Server**: Express (`artifacts/api-server/`) — not used by ContextLens itself
- **No backend needed for ContextLens** — all logic is client-side

## ContextLens Feature Set

### Three Modes
1. **Analyze** — Paste a prompt or OpenAI JSON → get a Context Health Score (0–100) with full spatial breakdown
2. **Explore** — Animated scenario player for 3 pre-built demos (context poisoning, identity drift, multi-agent isolation)
3. **Simulate** — Side-by-side compression strategy comparison + NIAH (Needle in a Haystack) heatmap

### Core Logic (all in `src/lib/`)
- `scoring.ts` — Context Health Score engine (5-dimension scoring: structure, efficiency, diversity, integrity, compression)
- `parser.ts` — Parses plain text + OpenAI JSON format into typed `ContextWindow`
- `tokenizer.ts` — Token estimation + cost calculation (GPT-4o, Claude 3.5, Gemini 2.5, Llama 3.1)
- `compression.ts` — Three strategies: sliding window, summarization, hard compression
- `niahData.ts` — NIAH benchmark data + heatmap grid generation
- `segmentColors.ts` — Per-segment-type color scheme (purple=system, teal=identity, etc.)
- `history.ts` — localStorage-based score history
- `models.ts` — Model registry and metadata

### Demo Scenarios (in `src/data/scenarios.ts`)
- "The Poisoned Agent" — context poisoning demonstration
- "The Forgotten Soul" — identity/soul drift demonstration  
- "The Research Harness" — multi-agent context topology

## Design
- Dark observatory aesthetic (deep navy `#080d1a` background)
- Dark-mode only — no light mode
- Framer Motion animations for scenario playback
- Recharts/CSS Grid for heatmap visualization
- shadcn/ui components with custom dark theme overrides

## Key Decisions
- No backend, no auth, no API key needed
- `wouter` routing not needed — single-page mode switching via React state
- Google Fonts import must be FIRST line in index.css (PostCSS requirement)
- CSS custom properties use space-separated HSL values (no `hsl()` wrapper in variable definitions)

## Development

```bash
pnpm --filter @workspace/context-lens run dev
```

The app runs on port `24348` by default (configurable via `PORT` env var).

## GitHub / Git Workflow

- **Public repo**: https://github.com/sherpadude/context-lens
- **Branch**: `main` — protected; requires 1 owner approval + all security checks passing
- **CODEOWNERS**: all files require `@sherpadude` review
- **Local git**: Replit manages commits automatically at task end

### Pushing to GitHub

The `GITHUB_PERSONAL_ACCESS_TOKEN` secret (with `workflow` scope) is stored in Replit. After each task the agent pushes changes to GitHub.

### Security Gate (GitHub Actions)
- `security-scan.yml` — Gitleaks + pnpm audit + CodeQL + OSSF Scorecard + AI pattern scan (changed PR files only)
- `issue-triage.yml` — security keyword detection on issue open; adds label + posts SECURITY.md disclosure link
- `merge-gate.yml` — triggers via `workflow_run` after Security Gate; uses `environment: production-merge` with @sherpadude as required reviewer

### Branch Protection
Applied via `.github/scripts/setup-branch-protection.js`. Required status check names (format: `<workflow name> / <job name>`):
- `Security Gate / Secret Scanning`
- `Security Gate / Dependency Audit`
- `Security Gate / CodeQL Static Analysis`
- `Security Gate / OSSF Scorecard`
- `Security Gate / AI Pattern Scan`
- `Merge Gate — Owner Approval / Await Owner Approval`

Settings: enforce_admins=true, 1 required review (dismiss stale, require CODEOWNER), no force pushes, no deletions.
