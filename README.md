# Prediction Markets MCP Server

MCP server for fetching prediction market data from Kalshi (Polymarket planned).

## Features

- **Kalshi integration** — list markets, prices, orderbooks, and trade history
- **Type-safe** — TypeScript with official Kalshi SDK
- **MCP protocol** — standard Model Context Protocol server
- **Auto-retry** — exponential backoff on rate limits (HTTP 429)

## Installation

```bash
bun install
```

## Configuration

### Environment Variables

```bash
# Kalshi API credentials (required for authenticated requests)
KALSHI_API_KEY=your-api-key-id
KALSHI_PRIVATE_KEY_PATH=/path/to/private-key.pem
# OR provide the key directly as PEM string
KALSHI_PRIVATE_KEY_PEM="-----BEGIN RSA PRIVATE KEY-----..."

# Optional: Override API endpoint (defaults to production)
KALSHI_BASE_PATH=https://api.elections.kalshi.com/trade-api/v2
```

**Getting Kalshi API credentials:**

1. Sign up at https://kalshi.com
2. Generate API key at https://kalshi.com/profile/api
3. Download your private key file

### MCP Server Setup

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "prediction-markets": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/prediction-mcp/index.ts"],
      "env": {
        "KALSHI_API_KEY": "your-api-key",
        "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
      }
    }
  }
}
```

## Available Methods

### Kalshi Client

```typescript
import { KalshiClient } from "./src/clients/kalshi";

const client = new KalshiClient();

// List markets
const markets = await client.listMarkets({ status: "open", limit: 10 });

// Get market details
const market = await client.getMarketDetails("TICKER");

// Get orderbook (bids only - binary market reciprocity)
const orderbook = await client.getOrderBook("TICKER");

// Get trade history
const trades = await client.getTrades({ ticker: "TICKER", limit: 100 });
```

## Development

```bash
# Run tests
bun test

# Type check
bun run typecheck

# Lint code
bun run lint
bun run lint:fix

# Format code
bun run format
bun run format:check

# Generate documentation (after changing tools or env vars)
bun run docs:generate

# Preview docs locally (requires uv: https://docs.astral.sh/uv/)
uv tool install mkdocs --with mkdocs-material
bun run docs:serve
```

### Pre-commit Hooks

Husky automatically runs type checking, linting, and formatting on git commits via lint-staged.

## Project Structure

```
.
├── index.ts                   # MCP server entry point
├── src/
│   ├── clients/
│   │   └── kalshi.ts          # Kalshi API client wrapper
│   ├── tools.ts               # MCP tool definitions
│   ├── tools.test.ts          # Integration tests
│   └── validation.ts          # Zod schemas for tool arguments
├── scripts/
│   ├── bootstrap.ts           # Claude Desktop registration
│   ├── generate-docs.ts       # Documentation generator
│   └── check-docs.ts          # CI doc freshness check
├── docs/                      # Auto-generated documentation
├── package.json
├── tsconfig.json
└── mkdocs.yml
```

## Tech Stack

- **Runtime**: Bun (fast TypeScript execution)
- **Language**: TypeScript
- **Testing**: Bun's built-in test runner
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Git Hooks**: Husky + lint-staged

## API Documentation

- **Kalshi API Docs**: https://docs.kalshi.com
- **Kalshi TypeScript SDK**: https://www.npmjs.com/package/kalshi-typescript
- **MCP Protocol**: https://modelcontextprotocol.io

## Contributing & Roadmap

See [TODO.md](./TODO.md) for the full roadmap, planned features, and contribution opportunities.
