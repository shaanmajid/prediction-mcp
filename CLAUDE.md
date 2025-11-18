# Prediction Markets MCP Server

## Project Goal

Build an MCP server to fetch (and later compare) data across multiple prediction markets.

## Priority Data

1. Available markets/options including resolution terms
2. Current prices
3. Current order book
4. Price history and volume

## Target Platforms

### Kalshi (Priority 1)

- **SDK**: `kalshi-typescript` (official npm package)
- **Docs**: https://docs.kalshi.com/welcome
- **API**: CFTC-regulated, US-based prediction markets
- **Auth**: API key + RSA private key
- **Key Methods**:
  - `getMarkets()` - List markets
  - `getMarket(ticker)` - Get market details
  - `getMarketOrderBook(ticker)` - Get order book (bids only)
  - `getMarketCandlesticks()` - Price history
  - `getTrades()` - Trade history
- **Note**: Orderbook returns only bids (no asks) due to binary market reciprocity
- **Base URL**: https://api.elections.kalshi.com/trade-api/v2

### Polymarket (Priority 2)

- **Gamma API**: https://gamma-api.polymarket.com (read-only, public)
- **Docs**: https://docs.polymarket.com/developers/gamma-markets-api/overview
- **No official unified SDK** - use REST API directly
- **Key Endpoints**:
  - `GET /markets` - List markets
  - `GET /events` - List events
  - Market data includes prices, volume, liquidity
- **CLOB API**: Separate for orderbook/trading data
- **Auth**: Public read access, no key needed for market data

### Future Consideration

- **Manifold Markets**: Has API, uses play money (Mana)
- **Metaculus**: Academic/forecasting focused, less trading-oriented

## Architecture Decision

- **Language**: TypeScript (type safety)
- **Runtime**: Bun (performance + built-in TypeScript)
- **Approach**:
  - Use official Kalshi SDK
  - Direct REST calls for Polymarket Gamma API
  - Unified interface layer for MCP tools
  - Separate client classes per platform

## MCP Tools to Implement

1. `list_markets` - List available markets across platforms
2. `get_market_details` - Get detailed market info including resolution terms
3. `get_market_price` - Get current prices
4. `get_orderbook` - Get current order book
5. `get_price_history` - Get historical price/volume data
6. `compare_markets` - (Future) Compare similar markets across platforms

## Configuration

### Environment Variables

The server respects the following environment variables for Kalshi API authentication:

```bash
# Required for authenticated requests
KALSHI_API_KEY=your-api-key-id
KALSHI_PRIVATE_KEY_PATH=/path/to/private-key.pem
# OR
KALSHI_PRIVATE_KEY_PEM="-----BEGIN RSA PRIVATE KEY-----\n..."

# Optional - defaults to production API
KALSHI_BASE_PATH=https://api.elections.kalshi.com/trade-api/v2
# For demo/testing:
# KALSHI_BASE_PATH=https://demo-api.kalshi.co/trade-api/v2
```

### MCP Server Configuration

Example configuration for Claude Desktop (`claude_desktop_config.json`):

**Option 1: Using mise (recommended if you have mise installed):**

```json
{
  "mcpServers": {
    "prediction-markets": {
      "command": "mise",
      "args": ["exec", "--", "bun", "run", "/path/to/prediction-mcp/index.ts"],
      "env": {
        "KALSHI_API_KEY": "your-api-key",
        "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
      }
    }
  }
}
```

**Option 2: Using bun directly:**

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

## MCP Server Best Practices

When implementing or modifying MCP server functionality:

- **Always reference the official specification**: https://modelcontextprotocol.io/specification
- **Verify against the spec**: Don't assume features are supported without checking
- **Keep inputSchema minimal**: Only use `type`, `properties`, and `required` fields
- **Document in descriptions**: Put examples and usage guidance in the `description` field, not as separate schema properties

## Development Setup

This project uses [mise](https://mise.jdx.dev/) to manage the bun runtime.

```bash
# Install mise (if not already installed)
curl https://mise.run | sh

# Install bun via mise
mise install

# Activate mise (adds bun to PATH)
eval "$(mise activate bash)"  # or zsh, fish, etc.

# Install dependencies
bun install

# Run tests
bun test

# Lint and format
bun run lint
bun run format
```

**Without mise activation**, prefix commands with `mise exec --`:

```bash
mise exec -- bun install
mise exec -- bun test
```

**Tool Management:**

- Bun runtime version is managed by mise (configured in `.mise.toml`)
- Dependencies are managed by bun (bun.lock)
- Dependabot updates dependencies but NOT the bun runtime version
