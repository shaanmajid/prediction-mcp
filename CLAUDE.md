# Prediction Markets MCP Server

## API Reference

Always consult these docs when working with platform APIs:

| Platform         | Documentation                                                     |
| ---------------- | ----------------------------------------------------------------- |
| Kalshi           | https://docs.kalshi.com/api-reference                             |
| Polymarket Gamma | https://docs.polymarket.com/developers/gamma-markets-api/overview |
| Polymarket CLOB  | https://docs.polymarket.com/#clob-api                             |
| MCP Protocol     | https://modelcontextprotocol.io/specification                     |

## Development Workflow

### Testing Changes

**All functional changes must be tested by invoking the MCP tools directly.**

1. Run `bun run scripts/bootstrap.ts` to register your worktree's server in `.mcp.json`
2. **Exit and resume your Claude Code session** — the server won't reload until restart
3. Invoke the tools you modified to verify they work correctly
4. Run `bun test` to ensure all tests pass

### Critical: Session Restart Required

MCP servers are loaded when the Claude Code session starts. If you:

- Add MCP config for the first time
- Update server code and need to test changes
- Modify tool definitions or handlers

**You must exit and resume the session to load the updated server.**

The bootstrap script reminds you of this, but it's easy to forget when iterating on code changes.

### Worktree Setup

Each git worktree needs its own `.mcp.json` pointing to its `index.ts`:

```bash
cd /path/to/your-worktree
bun install
bun run scripts/bootstrap.ts
# Exit and resume Claude Code session
```

## Architecture

```
index.ts                    Server entry point
src/
  clients/
    kalshi.ts               Kalshi SDK wrapper with bulk fetch
    polymarket.ts           Gamma API (REST) + CLOB SDK
  search/
    cache.ts                Tokenized search with scoring
    service.ts              Lazy initialization, refresh
  tools.ts                  MCP tool handlers
  validation.ts             Zod v4 schemas (generate JSON Schema)
scripts/
  bootstrap.ts              Register server with MCP clients
  generate-docs.ts          Generate docs/ from source
  check-docs.ts             CI freshness check
docs/                       Auto-generated—do not edit
```

## Platforms

### Kalshi

- SDK: `kalshi-typescript` v3.0.0
- Auth: API key + RSA private key
- Orderbook returns bids only (binary market reciprocity)
- SDK 3.0 uses `MarketApi` (singular)
- Production URL: `https://api.elections.kalshi.com/trade-api/v2`
- Demo URL: `https://demo-api.kalshi.co/trade-api/v2`

Set `KALSHI_USE_DEMO=true` to use the demo environment. Demo credentials are separate from production.

### Polymarket

- Gamma API: market discovery, events, tags (public, no auth)
- CLOB API: orderbooks, prices, trades
- SDK: `@polymarket/clob-client` for CLOB operations
- Markets identified by `slug`; CLOB uses `token_id` from `clobTokenIds`
- Orderbook returns both bids and asks
- No demo environment available (all operations are read-only)

## Search

Kalshi search uses an in-memory cache:

- Populates on first search (~7 seconds, ~18 API calls)
- Queries return in <1ms
- Refresh via `kalshi_cache_stats` with `refresh: true`
- Scores by field weight: titles (1.0), subtitles (0.8), tickers (0.5)

## Scripts

### bootstrap.ts

Registers the MCP server with Claude Code or other MCP clients:

```bash
bun run scripts/bootstrap.ts              # Project config (.mcp.json)
bun run scripts/bootstrap.ts --global     # User config (~/.claude.json)
bun run scripts/bootstrap.ts --interactive # Prompt for credentials
bun run scripts/bootstrap.ts --demo       # Use Kalshi demo environment
```

### generate-docs.ts

Generates documentation from source:

```bash
bun run docs:generate
```

Run after changing `src/tools.ts`, `src/validation.ts`, or environment variables.

### check-docs.ts

Validates docs match source:

```bash
bun run docs:check
```

CI runs this to catch stale documentation.

## Environment Variables

### Kalshi

```bash
KALSHI_API_KEY=...
KALSHI_PRIVATE_KEY_PATH=/path/to/key.pem   # or KALSHI_PRIVATE_KEY_PEM
KALSHI_USE_DEMO=true                        # optional, use demo environment
```

### Polymarket

```bash
POLYMARKET_GAMMA_HOST=...    # default: https://gamma-api.polymarket.com
POLYMARKET_CLOB_HOST=...     # default: https://clob.polymarket.com
POLYMARKET_CHAIN_ID=...      # default: 137 (Polygon)
```

## CI Pipeline

GitHub Actions runs on PRs and pushes to main:

- `format` — Prettier
- `typecheck` — TypeScript
- `lint` — ESLint
- `test` — Bun test with coverage (uses Kalshi demo environment)
- `security` — Dependency audit
- `secrets` — Gitleaks
- `docs` — Documentation freshness

All must pass before merge.

## Code Style

Write comments that add context the code cannot convey. Avoid:

- Restating what code does
- Changelog-style notes (use git history)
- Self-evident explanations

## MCP Best Practices

- Reference the spec: https://modelcontextprotocol.io/specification
- Keep `inputSchema` minimal: `type`, `properties`, `required` only
- Put examples in the tool `description`, not schema properties
