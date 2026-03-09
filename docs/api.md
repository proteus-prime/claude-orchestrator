# API Documentation

## Base URL

```
http://localhost:3334/api
```

---

## Endpoints

### List Sessions

```
GET /api/sessions
```

Returns all Claude Code sessions with aggregated statistics.

#### Response

```json
{
  "sessions": [
    {
      "sessionId": "abc123-def456-789",
      "project": "home/ubuntu/my-project",
      "model": "claude-sonnet-4-20250514",
      "status": "completed",
      "inputTokens": 15000,
      "outputTokens": 3500,
      "cacheReadTokens": 12000,
      "cacheWriteTokens": 500,
      "toolCalls": ["read_file", "write_file", "bash"],
      "messageCount": 24,
      "lastActivity": "2026-03-07T08:30:00.000Z",
      "estimatedCost": 0.12
    }
  ],
  "stats": {
    "totalSessions": 15,
    "activeSessions": 2,
    "totalTokens": 250000,
    "totalCost": 3.45
  }
}
```

#### Session Object

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | Unique session identifier (UUID) |
| `project` | string | Project path (cleaned from directory name) |
| `model` | string | Claude model used (e.g., `claude-sonnet-4-20250514`) |
| `status` | string | `running` if modified in last 5 min, else `completed` |
| `inputTokens` | number | Total input tokens consumed |
| `outputTokens` | number | Total output tokens generated |
| `cacheReadTokens` | number | Tokens read from prompt cache |
| `cacheWriteTokens` | number | Tokens written to prompt cache |
| `toolCalls` | string[] | List of tool names invoked |
| `messageCount` | number | Total messages in session |
| `lastActivity` | string | ISO timestamp of last message |
| `estimatedCost` | number | Estimated cost in USD |

#### Stats Object

| Field | Type | Description |
|-------|------|-------------|
| `totalSessions` | number | Total session count |
| `activeSessions` | number | Sessions active in last 5 minutes |
| `totalTokens` | number | Sum of all input + output tokens |
| `totalCost` | number | Sum of all estimated costs |

---

### Get Session Details

```
GET /api/sessions/{sessionId}
```

Returns detailed information for a specific session.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `sessionId` | string | Session UUID |

#### Response

```json
{
  "session": {
    "sessionId": "abc123-def456-789",
    "project": "home/ubuntu/my-project",
    "model": "claude-sonnet-4-20250514",
    "status": "completed",
    "inputTokens": 15000,
    "outputTokens": 3500,
    "cacheReadTokens": 12000,
    "cacheWriteTokens": 500,
    "toolCalls": ["read_file", "write_file", "bash"],
    "messageCount": 24,
    "lastActivity": "2026-03-07T08:30:00.000Z",
    "estimatedCost": 0.12,
    "filePath": "/home/ubuntu/.claude/projects/-home-ubuntu-my-project/abc123-def456-789.jsonl"
  },
  "messages": [
    {
      "type": "user",
      "timestamp": "2026-03-07T08:25:00.000Z",
      "content": "Create a hello.js file"
    },
    {
      "type": "assistant",
      "timestamp": "2026-03-07T08:25:05.000Z",
      "content": "I'll create the file...",
      "model": "claude-sonnet-4-20250514",
      "toolCalls": ["write_file"],
      "usage": {
        "input_tokens": 1500,
        "output_tokens": 200,
        "cache_read_input_tokens": 1000
      }
    }
  ]
}
```

#### Error Response

```json
{
  "error": "Session not found"
}
```

Status: `404`

---

## Cost Calculation

Costs are estimated using Anthropic API pricing:

### Pricing Table (per 1M tokens)

| Model | Input | Output | Cache Read | Cache Write |
|-------|-------|--------|------------|-------------|
| Haiku | $0.80 | $4.00 | $0.08 | $1.00 |
| Sonnet | $3.00 | $15.00 | $0.30 | $3.75 |
| Opus | $15.00 | $75.00 | $1.50 | $18.75 |

### Formula

```
regularInput = inputTokens - cacheReadTokens - cacheWriteTokens
cost = (regularInput × inputRate) 
     + (cacheReadTokens × cacheReadRate)
     + (cacheWriteTokens × cacheWriteRate)
     + (outputTokens × outputRate)
```

---

## Usage Examples

### cURL

```bash
# List all sessions
curl http://localhost:3334/api/sessions

# Get specific session
curl http://localhost:3334/api/sessions/abc123-def456-789

# Pretty print with jq
curl -s http://localhost:3334/api/sessions | jq '.stats'
```

### JavaScript

```javascript
// Fetch all sessions
const res = await fetch('http://localhost:3334/api/sessions');
const { sessions, stats } = await res.json();

console.log(`Active: ${stats.activeSessions}`);
console.log(`Total cost: $${stats.totalCost.toFixed(2)}`);

// Find expensive sessions
const expensive = sessions
  .filter(s => s.estimatedCost > 1.0)
  .sort((a, b) => b.estimatedCost - a.estimatedCost);
```

### Python

```python
import requests

# Get sessions
r = requests.get('http://localhost:3334/api/sessions')
data = r.json()

# Print active sessions
for session in data['sessions']:
    if session['status'] == 'running':
        print(f"{session['project']}: {session['model']}")
```

---

## Rate Limits

No rate limits are enforced. The API reads from the local filesystem on each request.

For production deployments with many sessions, consider:
- Adding caching layer
- Reducing poll interval
- Implementing pagination
