# Prediction Markets MCP Server

> **⚠️ Early Development:** This project is under active development. APIs may change without notice. Not recommended for production use.

An MCP server providing unified access to prediction market data from Kalshi and Polymarket.

## Features

- **Kalshi and Polymarket** — Query markets, orderbooks, prices, and trade history
- **Full-text search** — Find Kalshi events and markets by keyword
- **Rate limit handling** — Automatic retry with exponential backoff

## Installation

This server follows the standard [MCP configuration format](https://modelcontextprotocol.io/examples). Add it to your MCP client's configuration file.

### Configuration Format

All MCP clients use the same JSON structure:

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

### Client-Specific Locations

| Client            | Configuration File                                                        |
| ----------------- | ------------------------------------------------------------------------- |
| Claude Code       | `.mcp.json` (project root) or `~/.claude.json` (global)                   |
| Claude Desktop    | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |
| VS Code (Copilot) | `.vscode/mcp.json` or VS Code settings                                    |
| Cursor            | `.cursor/mcp.json` or Cursor settings                                     |

### Quick Setup (Claude Code)

For Claude Code users, a bootstrap script generates the configuration:

```bash
bun install
bun run scripts/bootstrap.ts              # Creates .mcp.json in project root
bun run scripts/bootstrap.ts --global     # Adds to ~/.claude.json
bun run scripts/bootstrap.ts --interactive # Prompts for Kalshi credentials
```

**Note:** After adding or updating MCP configuration, restart your MCP client to load the changes.

## Credentials

### Kalshi

Kalshi requires API credentials for authenticated requests:

```bash
KALSHI_API_KEY=your-api-key-id
KALSHI_PRIVATE_KEY_PATH=/path/to/private-key.pem
```

Get credentials at [kalshi.com/profile/api](https://kalshi.com/profile/api).

#### Demo Environment

Kalshi provides a [demo environment](https://demo.kalshi.co/) for testing with mock funds:

```bash
KALSHI_USE_DEMO=true
```

Demo credentials are separate from production—create a demo account at [demo.kalshi.co](https://demo.kalshi.co/).

### Polymarket

Polymarket tools work without authentication—all read operations are public.

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
  bootstrap.ts        # MCP registration helper
  generate-docs.ts    # Doc generator
  check-docs.ts       # Doc freshness check
```

## Links

- [Tool Reference](docs/tools/reference.md)
- [Kalshi API](https://docs.kalshi.com/api-reference)
- [Polymarket API](https://docs.polymarket.com)
- [MCP Protocol](https://modelcontextprotocol.io)
