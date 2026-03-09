# Setup Guide

## Prerequisites

- **Node.js 18+** — Required for Next.js 15
- **Claude Code CLI** — Installed and configured
- **npm** or **pnpm** — Package manager

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/proteus-prime/claude-orchestrator.git
cd claude-orchestrator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Application

```bash
npm run build
```

### 4. Start the Server

```bash
# Production mode (recommended)
npm run start -- -p 3334 -H 0.0.0.0

# Development mode (with hot reload)
npm run dev -- -p 3334
```

### 5. Open the Dashboard

Navigate to `http://localhost:3334` in your browser.

---

## Running as a Background Service

### Using tmux (Recommended)

```bash
# Create a new tmux session
tmux new-session -d -s orchestrator -c ~/claude-orchestrator \
  "npm run build && npm run start -- -p 3334 -H 0.0.0.0"

# View logs
tmux attach -t orchestrator

# Detach (keep running): Ctrl+B, then D

# Stop the service
tmux kill-session -t orchestrator
```

### Using systemd

Create `/etc/systemd/system/claude-orchestrator.service`:

```ini
[Unit]
Description=Claude Orchestrator Dashboard
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/claude-orchestrator
ExecStart=/usr/bin/npm run start -- -p 3334 -H 0.0.0.0
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable claude-orchestrator
sudo systemctl start claude-orchestrator

# Check status
sudo systemctl status claude-orchestrator

# View logs
journalctl -u claude-orchestrator -f
```

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start the application
cd ~/claude-orchestrator
npm run build
pm2 start npm --name "orchestrator" -- run start -- -p 3334 -H 0.0.0.0

# Auto-start on boot
pm2 startup
pm2 save
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port (can also use `-p` flag) |
| `HOST` | localhost | Bind address (use `-H 0.0.0.0` for external access) |

### Custom Claude Directory

By default, the dashboard looks for sessions in `~/.claude/projects/`. To change this, modify `CLAUDE_PROJECTS_DIR` in `src/lib/claude-sessions.ts`:

```typescript
const CLAUDE_PROJECTS_DIR = '/custom/path/to/claude/projects';
```

---

## Firewall Configuration

If accessing from another machine, ensure the port is open:

```bash
# UFW (Ubuntu)
sudo ufw allow 3334/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 3334 -j ACCEPT
```

---

## Verifying Installation

### 1. Check Claude Code Sessions Exist

```bash
ls ~/.claude/projects/
```

You should see directories starting with `-` (e.g., `-home-ubuntu-myproject`).

### 2. Check API Response

```bash
curl http://localhost:3334/api/sessions | jq
```

### 3. Create a Test Session

Run Claude Code in any directory:

```bash
cd /tmp
claude -p "Say hello"
```

The session should appear in the dashboard within 5 seconds.

---

## Troubleshooting

### No Sessions Showing

1. Verify Claude Code is installed: `claude --version`
2. Check sessions exist: `ls ~/.claude/projects/`
3. Ensure Next.js can read the directory (permissions)

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3334

# Kill the process
kill -9 <PID>
```

### API Errors

Check the Next.js server logs:

```bash
# If running in tmux
tmux attach -t orchestrator

# If running with systemd
journalctl -u claude-orchestrator -f
```

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

---

## Updating

```bash
cd ~/claude-orchestrator
git pull origin main
npm install
npm run build

# Restart the service
tmux kill-session -t orchestrator
tmux new-session -d -s orchestrator -c ~/claude-orchestrator \
  "npm run start -- -p 3334 -H 0.0.0.0"
```

---

## Security Considerations

- The dashboard exposes session data including prompts and tool calls
- Bind to `127.0.0.1` instead of `0.0.0.0` if external access isn't needed
- Consider adding authentication for production use (e.g., nginx basic auth)
- Session logs may contain sensitive information from Claude Code operations
