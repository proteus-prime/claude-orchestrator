# Architecture

## Overview

Claude Orchestrator is a Next.js application that provides real-time monitoring of Claude Code CLI sessions. It reads session logs directly from the filesystem and presents them through a React dashboard.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Dashboard UI                          │   │
│  │  - Session list with filters                            │   │
│  │  - Stats bar (total tokens, cost, active count)         │   │
│  │  - Session detail view                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                         fetch /api                               │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                     Next.js Server                               │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              API Routes (/api/sessions)                  │   │
│  │  - GET /api/sessions         → List all sessions        │   │
│  │  - GET /api/sessions/[id]    → Session details          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                    calls lib/claude-sessions.ts                  │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Session Parser Library                      │   │
│  │  - Scans ~/.claude/projects/                            │   │
│  │  - Parses JSONL session files                           │   │
│  │  - Extracts token usage, tool calls, timestamps         │   │
│  │  - Estimates costs based on model                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                          reads files
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                     Filesystem                                   │
│                              │                                   │
│  ~/.claude/projects/                                             │
│  ├── -home-ubuntu-my-project/                                   │
│  │   ├── abc123.jsonl        ← Session log                      │
│  │   └── def456.jsonl                                           │
│  ├── -tmp-worktree-feature/                                     │
│  │   └── ghi789.jsonl                                           │
│  └── ...                                                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
claude-orchestrator/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Main dashboard page
│   │   ├── layout.tsx               # Root layout
│   │   ├── session/
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx         # Session detail page
│   │   └── api/
│   │       └── sessions/
│   │           ├── route.ts         # GET /api/sessions
│   │           └── [sessionId]/
│   │               └── route.ts     # GET /api/sessions/[id]
│   ├── components/
│   │   ├── SessionCard.tsx          # Session card component
│   │   └── StatsBar.tsx             # Aggregated stats bar
│   └── lib/
│       └── claude-sessions.ts       # Core session parsing logic
├── docs/
│   ├── architecture.md              # This file
│   ├── api.md                       # API documentation
│   └── setup.md                     # Setup guide
├── public/                          # Static assets
└── package.json
```

## Core Components

### Session Parser (`lib/claude-sessions.ts`)

The heart of the application. Responsible for:

1. **Project Discovery** — Scans `~/.claude/projects/` for project directories (prefixed with `-`)
2. **Session Enumeration** — Lists all `.jsonl` files within each project
3. **JSONL Parsing** — Reads each file line-by-line, extracting:
   - Token usage (input, output, cache read, cache write)
   - Model information
   - Tool calls
   - Timestamps
4. **Status Detection** — Checks file modification time to determine if session is active
5. **Cost Estimation** — Calculates costs based on model-specific pricing

### Dashboard UI (`app/page.tsx`)

React client component that:

- Fetches session data from `/api/sessions`
- Polls every 5 seconds for real-time updates
- Provides filtering (all/running/completed)
- Displays aggregate statistics
- Renders session cards in a responsive grid

### Session Detail (`app/session/[sessionId]/page.tsx`)

Detailed view of a single session showing:

- Full token breakdown
- All tool calls made
- Message history
- Cost estimation

## Data Flow

1. **Claude Code** writes session logs to `~/.claude/projects/-<project-path>/<session-id>.jsonl`
2. **Dashboard** polls `/api/sessions` every 5 seconds
3. **API Route** calls `getAllSessions()` from the parser library
4. **Parser** scans filesystem, parses JSONL files, calculates stats
5. **API** enriches with cost estimates, returns JSON
6. **Dashboard** renders updated session list

## Session File Format

Claude Code writes JSONL files with messages like:

```jsonl
{"type":"user","timestamp":"2026-03-07T06:30:00Z","message":{"role":"user","content":"Create hello.js"}}
{"type":"assistant","timestamp":"2026-03-07T06:30:05Z","message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"I'll create..."},{"type":"tool_use","name":"write_file","input":{}}],"usage":{"input_tokens":1500,"output_tokens":200,"cache_read_input_tokens":1000}}}
{"type":"tool_result","content":"File created"}
```

The parser extracts:
- `type` — Message type (user/assistant/tool_result)
- `message.model` — Model used
- `message.usage` — Token counts
- `message.content[].type === 'tool_use'` — Tool invocations

## Performance Considerations

- **File I/O** — Sessions are read on every API call. For high-volume deployments, consider caching.
- **Large Sessions** — Very long sessions with thousands of messages may be slow to parse.
- **Polling Interval** — 5 seconds is a reasonable default; adjust based on needs.

## Extending

To add new features:

1. **New Stats** — Update `parseSessionFile()` in `claude-sessions.ts`
2. **New API Routes** — Add files under `app/api/`
3. **New UI Components** — Add to `components/`, import in pages
4. **Webhooks** — Add notification logic in API routes when sessions complete
