# Prediction Markets MCP Server

An MCP server that fetches prediction market data from Kalshi and Polymarket.

## Features

- **Kalshi and Polymarket** — Query markets, orderbooks, prices, and trade history
- **Full-text search** — Find Kalshi events and markets by keyword
- **Rate limit handling** — Automatic retry with exponential backoff

## Quick Start

```bash
bun install
bun run scripts/bootstrap.ts --interactive
```

The bootstrap script registers this server with Claude Code or Claude Desktop and prompts for your Kalshi credentials.

## Configuration

### Kalshi

Kalshi requires API credentials for authenticated requests:

```bash
KALSHI_API_KEY=your-api-key-id
KALSHI_PRIVATE_KEY_PATH=/path/to/private-key.pem
```

Get credentials at [kalshi.com/profile/api](https://kalshi.com/profile/api).

### Polymarket

Polymarket tools work without authentication—all read operations are public.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "prediction-markets": {
      "command": "bun",
      "args": ["run", "/path/to/prediction-mcp/index.ts"],
      "env": {
        "KALSHI_API_KEY": "your-api-key",
        "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
      }
    }
  }
}
```

## Available Tools

See [docs/tools/reference.md](docs/tools/reference.md) for the full tool reference with parameters.

Run `bun run docs:generate` after modifying tools to keep documentation in sync.

## Development

```bash
bun test              # Run tests
bun run typecheck     # Type check
bun run lint          # Lint
bun run format        # Format
```

Pre-commit hooks run these checks automatically via Husky.

### Documentation

```bash
bun run docs:generate  # Regenerate docs from source
bun run docs:check     # Verify docs match source (CI uses this)
bun run docs:serve     # Preview at localhost:8000
```

## Project Structure

```
index.ts              # Server entry point
src/
  clients/
    kalshi.ts         # Kalshi API client
    polymarket.ts     # Polymarket Gamma + CLOB client
  search/
    cache.ts          # Search index
    service.ts        # Search lifecycle
  tools.ts            # MCP tool handlers
  validation.ts       # Zod schemas
scripts/
  bootstrap.ts        # MCP registration
  generate-docs.ts    # Doc generator
  check-docs.ts       # Doc freshness check
```

## Links

- [Tool Reference](docs/tools/reference.md)
- [Kalshi API](https://docs.kalshi.com/api-reference)
- [Polymarket API](https://docs.polymarket.com)
- [MCP Protocol](https://modelcontextprotocol.io)
