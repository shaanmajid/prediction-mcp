# Prediction Markets MCP Server

MCP server for fetching data from prediction markets (Kalshi, Polymarket, and more).

## Features

- **Kalshi Integration**: List markets, get prices, orderbook data, and trade history
- **Type-safe**: Built with TypeScript using official SDKs
- **MCP Protocol**: Standard Model Context Protocol implementation
- **Environment-based config**: Easy authentication via environment variables

## Installation

This project uses [mise](https://mise.jdx.dev/) to manage the bun runtime version.

```bash
# Install mise (if not already installed)
# See https://mise.jdx.dev/getting-started.html

# Install bun via mise (reads from .mise.toml)
mise install

# Activate mise (adds bun to PATH)
eval "$(mise activate bash)"  # or zsh, fish, etc.

# Install dependencies
bun install
```

Alternatively, run commands without activating mise:

```bash
mise install
mise exec -- bun install
```

Or if you have bun installed separately:

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

**With mise activated** (recommended):

```bash
bun test
bun run typecheck
bun run lint
bun run format
```

**Without mise activation:**

```bash
mise exec -- bun test
mise exec -- bun run typecheck
mise exec -- bun run lint
mise exec -- bun run format
```

### Pre-commit Hooks

Husky automatically runs type checking, linting, and formatting on git commits via lint-staged.

## Project Structure

```
.
├── src/
│   └── clients/
│       └── kalshi.ts          # Kalshi API client wrapper
├── index.ts                   # MCP server entry point (WIP)
├── package.json
├── tsconfig.json
├── eslint.config.js
├── .prettierrc.json
└── README.md
```

## Tech Stack

- **Runtime**: Bun (fast TypeScript execution, managed via mise)
- **Tool Manager**: mise (manages bun version)
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
