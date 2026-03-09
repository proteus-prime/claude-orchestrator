# 🦀 Claude Orchestrator

A real-time monitoring dashboard for Claude Code sessions. Track token usage, costs, and worker activity across all your Claude Code processes.

![Dashboard](docs/assets/dashboard-preview.png)

## Features

- **Real-time Session Monitoring** — See all active and completed Claude Code sessions
- **Token Usage Tracking** — Input, output, cache read, and cache write tokens per session
- **Cost Estimation** — Automatic cost calculation based on model pricing (Haiku/Sonnet/Opus)
- **Tool Call Visibility** — See which tools each session has invoked
- **Session Details** — Drill into individual sessions for full message history
- **Auto-refresh** — Dashboard polls every 5 seconds for live updates

## Quick Start

```bash
# Clone the repo
git clone https://github.com/proteus-prime/claude-orchestrator.git
cd claude-orchestrator

# Install dependencies
npm install

# Build and start (production)
npm run build
npm run start -- -p 3334 -H 0.0.0.0

# Or run in development mode
npm run dev -- -p 3334
```

Open `http://localhost:3334` to view the dashboard.

## Requirements

- Node.js 18+
- Claude Code CLI installed (`~/.claude/projects/` must exist)
- Active Claude Code sessions to monitor

## How It Works

Claude Code stores session logs as JSONL files in `~/.claude/projects/`. This dashboard:

1. Scans all project directories under `~/.claude/projects/`
2. Parses each `.jsonl` session file for usage statistics
3. Aggregates token counts and estimates costs
4. Serves everything via a Next.js API + React frontend

See [docs/architecture.md](docs/architecture.md) for detailed information.

## Running as a Service

For persistent monitoring, run in a tmux session:

```bash
# Create tmux session
tmux new-session -d -s orchestrator -c ~/claude-orchestrator \
  "npm run build && npm run start -- -p 3334 -H 0.0.0.0"

# Attach to view logs
tmux attach -t orchestrator

# Detach: Ctrl+B, D
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/sessions` | List all sessions with stats |
| `GET /api/sessions/[sessionId]` | Get details for a specific session |

See [docs/api.md](docs/api.md) for response schemas.

## Configuration

Environment variables (optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `CLAUDE_HOME` | `~/.claude` | Claude config directory |

## Cost Calculation

Pricing is based on Anthropic's API rates (March 2026):

| Model | Input | Output | Cache Read | Cache Write |
|-------|-------|--------|------------|-------------|
| Haiku | $0.80/M | $4.00/M | $0.08/M | $1.00/M |
| Sonnet | $3.00/M | $15.00/M | $0.30/M | $3.75/M |
| Opus | $15.00/M | $75.00/M | $1.50/M | $18.75/M |

## Related Projects

- **[proteus-integrations](https://github.com/proteus-prime/proteus-integrations)** — Linear orchestrator for automated issue processing
- **[DevClaw](https://github.com/openclaw/devclaw)** — Full-featured code orchestration plugin

## License

MIT
