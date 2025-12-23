<p align="center">
  <img src="docs/assets/logo.png" alt="Prediction Markets MCP" width="400">
</p>

# Prediction Markets MCP Server

[![CI](https://github.com/shaanmajid/prediction-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/shaanmajid/prediction-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/shaanmajid/prediction-mcp/graph/badge.svg)](https://codecov.io/gh/shaanmajid/prediction-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An MCP server providing unified access to prediction market data from [Kalshi](https://kalshi.com) and [Polymarket](https://polymarket.com).

> [!WARNING]
> This project is in early development. APIs may change without notice.

## Why Use This?

Prediction markets aggregate crowd wisdom into real-time probabilities. This MCP server lets you:

- **Unify platforms** — Query Kalshi and Polymarket through one interface
- **Use natural language** — Ask "What are the odds?" instead of parsing JSON APIs
- **Get real-time data** — Access prices, orderbooks, and trade history instantly
- **Search efficiently** — Full-text search across thousands of markets in <1ms

Instead of manually browsing market websites or writing API integration code, ask your AI assistant directly.

## What Can You Ask?

Once connected, try these natural language queries:

- _"What are the current odds on Polymarket for the next Fed rate decision?"_
- _"Show me all open Kalshi markets about the 2024 election"_
- _"Search Kalshi for markets about climate change"_
- _"Show me the orderbook for the next Fed rate decision on Kalshi"_

## Quick Start

Add to your MCP client configuration (e.g., `~/.claude.json` for Claude Code):

```json
{
  "mcpServers": {
    "prediction-markets": {
      "command": "npx",
      "args": ["-y", "prediction-mcp"],
      "env": {
        "KALSHI_API_KEY": "your-api-key",
        "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
      }
    }
  }
}
```

> **Note:** Polymarket works without credentials. Kalshi credentials are optional but required for authenticated operations.

Restart your MCP client to load the server.

📖 **[Full documentation](https://shaanmajid.github.io/prediction-mcp/)** — Setup guides for 7 MCP clients, troubleshooting, and more.

## Installation

This server is published on npm and runs via `npx`. No cloning or building required.

### Configuration Format

Most MCP clients use the same JSON structure:

```json
{
  "mcpServers": {
    "prediction-markets": {
      "command": "npx",
      "args": ["-y", "prediction-mcp"],
      "env": {
        "KALSHI_API_KEY": "your-api-key",
        "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
      }
    }
  }
}
```

**Alternative runtimes:** If you prefer Bun, use `"command": "bunx"` and `"args": ["prediction-mcp"]`.

### Client-Specific Locations

| Client            | Configuration File                                                        |
| ----------------- | ------------------------------------------------------------------------- |
| Claude Code       | `.mcp.json` (project root) or `~/.claude.json` (global)                   |
| Claude Desktop    | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |
| VS Code (Copilot) | `.vscode/mcp.json` (uses `"servers"` key instead of `"mcpServers"`)       |
| Cursor            | `.cursor/mcp.json` or Cursor settings                                     |

See the [Getting Started guide](docs/getting-started.md) for detailed setup instructions for all supported clients.

## Credentials

### Kalshi

Kalshi requires API credentials for authenticated requests:

```bash
KALSHI_API_KEY=your-api-key-id
KALSHI_PRIVATE_KEY_PATH=/path/to/private-key.pem
```

Get credentials at [kalshi.com/account/profile](https://kalshi.com/account/profile).

#### Demo Environment

Kalshi provides a [demo environment](https://demo.kalshi.co/) for testing with mock funds:

```bash
KALSHI_USE_DEMO=true
```

Demo credentials are separate from production—create a demo account at [demo.kalshi.co](https://demo.kalshi.co/).

### Polymarket

Polymarket tools work without authentication—all read operations are public.

## Available Tools

| Platform   | Tools                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Kalshi     | `kalshi_list_markets`, `kalshi_get_market`, `kalshi_get_orderbook`, `kalshi_get_trades`, `kalshi_search`, etc. |
| Polymarket | `polymarket_list_markets`, `polymarket_get_market`, `polymarket_get_orderbook`, `polymarket_get_price`, etc.   |

See [Tools Reference](docs/reference/tools.md) for the full tool reference with parameters.

Run `bun run docs:generate` after modifying tools to keep documentation in sync.

## Development

For contributors working on this project:

```bash
git clone https://github.com/shaanmajid/prediction-mcp.git
cd prediction-mcp
bun install

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
  docs.ts             # Doc generator CLI
```

## Links

- [Documentation](https://shaanmajid.github.io/prediction-mcp/) (hosted) · [docs/](docs/) (source)
- [Tools Reference](docs/reference/tools.md)
- [Configuration](docs/reference/configuration.md)
- [Kalshi API](https://docs.kalshi.com/api-reference)
- [Polymarket API](https://docs.polymarket.com)
- [MCP Protocol](https://modelcontextprotocol.io)
