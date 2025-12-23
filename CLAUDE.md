# Prediction Markets MCP Server

> **For users:** Install via npm with `npx prediction-mcp`. See [README.md](README.md) for setup instructions.
>
> **This file is for contributors** developing the server itself.

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
index.ts                    Server entry point, MCP handlers, error classification
index.test.ts               Integration tests for server initialization
src/
  clients/
    kalshi.ts               Kalshi SDK wrapper with bulk fetch and rate limiting
    kalshi.test.ts          Kalshi client unit tests
    polymarket.ts           Gamma API (REST) + CLOB SDK with rate limiting
    polymarket.test.ts      Polymarket client unit tests
  search/
    index.ts                Exports for search module
    cache.ts                Kalshi tokenized search with scoring
    cache.test.ts           Kalshi cache unit tests
    service.ts              Kalshi search: lazy init, refresh
    service.test.ts         Kalshi service unit tests
    polymarket-cache.ts     Polymarket tokenized search cache
    polymarket-cache.test.ts
    polymarket-service.ts   Polymarket search service
    polymarket-service.test.ts
    scoring.ts              Shared scoring utilities
    scoring.test.ts         Scoring algorithm tests
    integration.test.ts     Cross-platform search integration tests
  env.ts                    Environment config (Zod + t3-env)
  env.test.ts               Environment validation tests
  logger.ts                 Pino logger configuration
  tools.ts                  MCP tool handlers (22 tools total)
  tools.test.ts             Tool handler unit tests
  validation.ts             Zod v4 schemas (generate JSON Schema)
  validation.test.ts        Schema validation tests
scripts/
  bootstrap.ts              Register server with MCP clients
  docs.ts                   Generate/check docs (subcommands)
  docs.test.ts              Documentation generation tests
docs/                       Auto-generated—do not edit manually
```

## Tools

The server provides 22 MCP tools across two platforms:

### Kalshi (11 tools)

| Tool                      | Description                                           |
| ------------------------- | ----------------------------------------------------- |
| `kalshi_list_markets`     | List markets with filters (status, event, series)     |
| `kalshi_get_market`       | Get detailed market info by ticker                    |
| `kalshi_get_orderbook`    | Get current orderbook (bids only)                     |
| `kalshi_get_trades`       | Get recent trade history                              |
| `kalshi_get_series`       | Get series metadata by ticker                         |
| `kalshi_get_event`        | Get event metadata by ticker                          |
| `kalshi_search`           | Search events and markets with keyword matching       |
| `kalshi_search_events`    | Search events only                                    |
| `kalshi_search_markets`   | Search markets only                                   |
| `kalshi_cache_stats`      | Get/refresh search cache statistics                   |
| `kalshi_get_price_history`| Get historical candlestick (OHLCV) data               |

### Polymarket (11 tools)

| Tool                          | Description                                       |
| ----------------------------- | ------------------------------------------------- |
| `polymarket_list_markets`     | List markets with filters (status, tags)          |
| `polymarket_get_market`       | Get detailed market info by slug                  |
| `polymarket_list_events`      | List events with filters                          |
| `polymarket_get_event`        | Get event details by slug                         |
| `polymarket_list_tags`        | List available category tags                      |
| `polymarket_get_orderbook`    | Get orderbook (bids and asks)                     |
| `polymarket_get_price`        | Get current best price (BUY/SELL)                 |
| `polymarket_get_price_history`| Get historical price data                         |
| `polymarket_search`           | Search events and markets with keyword matching   |
| `polymarket_search_events`    | Search events only                                |
| `polymarket_search_markets`   | Search markets only                               |
| `polymarket_cache_stats`      | Get/refresh search cache statistics               |

## Platforms

### Kalshi

- SDK: `kalshi-typescript` v3.0.0
- Auth: API key + RSA private key
- Orderbook returns bids only (binary market reciprocity)
- SDK 3.0 uses `MarketApi` (singular) and `EventsApi`
- Production URL: `https://api.elections.kalshi.com/trade-api/v2`
- Demo URL: `https://demo-api.kalshi.co/trade-api/v2`
- Rate limiting: Automatic retry with exponential backoff on 429 responses

Set `KALSHI_USE_DEMO=true` to use the demo environment. Demo credentials are separate from production.

### Polymarket

- Gamma API: Market discovery, events, tags (public, no auth)
- CLOB API: Orderbooks, prices, trades, price history
- SDK: `@polymarket/clob-client` for CLOB operations
- Markets identified by `slug`; CLOB uses `token_id` from `clobTokenIds`
- Orderbook returns both bids and asks
- Rate limiting: Automatic retry with exponential backoff on 429 responses
- No demo environment available (all operations are read-only)

## Search

Both platforms use in-memory caches for fast tokenized search:

### Kalshi
- Populates on first search (~7 seconds, uses `fetchAllEventsWithMarkets`)
- Queries return in <1ms
- Refresh via `kalshi_cache_stats` with `refresh: true`
- Scores by field weight: titles (1.0), subtitles (0.8), tickers (0.5)

### Polymarket
- Populates on first search (~40 seconds for full cache)
- Refresh via `polymarket_cache_stats` with `refresh: true`
- Uses same scoring algorithm as Kalshi
- Searches: question, groupItemTitle, slug, description, outcomes

### Background Prefetch
On server startup, both caches are populated in the background (`prefetchSearchCaches()`). This is non-blocking—the server starts immediately while caches populate. Failures are logged but don't prevent server operation.

## Scripts

### bootstrap.ts

Registers the MCP server with Claude Code or other MCP clients:

```bash
bun run scripts/bootstrap.ts              # Project config (.mcp.json)
bun run scripts/bootstrap.ts --global     # User config (~/.claude.json)
bun run scripts/bootstrap.ts --interactive # Prompt for credentials
bun run scripts/bootstrap.ts --demo       # Use Kalshi demo environment
```

### docs.ts

Unified documentation CLI with subcommands:

```bash
bun run docs:generate    # Generate docs from source
bun run docs:check       # Validate docs match source (CI)
bun run docs:serve       # Preview docs at localhost:8000
bun run docs:build       # Build static docs site
```

Run `docs:generate` after changing `src/tools.ts`, `src/validation.ts`, or `src/env.ts`.

## Environment Variables

### Kalshi

| Variable                  | Description                                       | Default     |
| ------------------------- | ------------------------------------------------- | ----------- |
| `KALSHI_API_KEY`          | API key ID for authentication                     | —           |
| `KALSHI_PRIVATE_KEY_PATH` | Path to RSA private key PEM file                  | —           |
| `KALSHI_PRIVATE_KEY_PEM`  | RSA private key as PEM string (alternative)       | —           |
| `KALSHI_USE_DEMO`         | Use demo environment (`true`/`false`)             | `false`     |
| `KALSHI_BASE_PATH`        | API endpoint override (advanced)                  | —           |

### Polymarket

| Variable                | Description                            | Default                              |
| ----------------------- | -------------------------------------- | ------------------------------------ |
| `POLYMARKET_GAMMA_HOST` | Gamma API host for market discovery    | `https://gamma-api.polymarket.com`   |
| `POLYMARKET_CLOB_HOST`  | CLOB API host for orderbook/trading    | `https://clob.polymarket.com`        |
| `POLYMARKET_CHAIN_ID`   | Polygon chain ID                       | `137`                                |

### Logging

| Variable    | Description                                        | Default |
| ----------- | -------------------------------------------------- | ------- |
| `LOG_LEVEL` | Logging verbosity: trace, debug, info, warn, error, fatal | `info`  |

## CI Pipeline

GitHub Actions runs on PRs and pushes to main:

| Job        | Description                                     |
| ---------- | ----------------------------------------------- |
| `format`   | Biome format check                              |
| `typecheck`| TypeScript type checking                        |
| `lint`     | Biome lint                                      |
| `test`     | Bun test with coverage (uses Kalshi demo env)   |
| `docs`     | Documentation freshness check                   |

Coverage is uploaded to Codecov. All jobs must pass before merge.

### Pre-commit Hooks

Husky runs lint-staged on commit:
- TypeScript files: Biome check + TypeScript type checking
- JSON/Markdown files: Biome format

## Testing

Tests are colocated with source files using the `.test.ts` suffix:

```bash
bun test                  # Run all tests
bun test --coverage       # With coverage report
bun test src/tools.test.ts # Run specific test file
```

Tests use Bun's built-in test runner. CI runs with `KALSHI_USE_DEMO=true` to avoid production API load.

## Code Style

Write comments that add context the code cannot convey. Avoid:

- Restating what code does
- Changelog-style notes (use git history)
- Self-evident explanations

### Formatting

Code is formatted with Biome. Run `bun run format` before committing.

## MCP Best Practices

- Reference the spec: https://modelcontextprotocol.io/specification
- Keep `inputSchema` minimal: `type`, `properties`, `required` only
- Put examples in the tool `description`, not schema properties
- Use Zod v4's native `toJSONSchema()` for schema generation
- Tool handlers receive `ToolContext` with both clients and search services
- Return structured data via `structuredContent` for successful responses
- Return error JSON via `content` array with `isError: true` for failures

## Error Handling

The server classifies errors into standardized codes:

| Code                  | Condition                                      |
| --------------------- | ---------------------------------------------- |
| `ValidationError`     | Zod schema validation failure                  |
| `APIError`            | Network or API-related errors                  |
| `NotFoundError`       | Unknown tool or resource not found             |
| `AuthenticationError` | Unauthorized or forbidden responses            |
| `RateLimitError`      | Rate limit exceeded                            |
| `UnknownError`        | All other errors                               |

Both clients implement automatic retry with exponential backoff for 429 (rate limit) responses.
