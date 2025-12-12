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
- **Note**: SDK 3.0 uses `MarketApi` (singular). Multivariate events require separate `getMultivariateEvents()` call.
- **Base URL**: https://api.elections.kalshi.com/trade-api/v2

### Polymarket (Priority 2) ✅ Implemented

- **Gamma API**: https://gamma-api.polymarket.com (read-only, public)
- **CLOB API**: https://clob.polymarket.com (orderbook, prices, trades)
- **Docs**: https://docs.polymarket.com/developers/gamma-markets-api/overview
- **SDK**: `@polymarket/clob-client@5.0.0` (for CLOB operations)
- **Auth**: **No authentication required** for all read operations
- **Key Methods**:
  - `listMarkets()` - List markets with filtering
  - `getMarket(slug)` - Get market details by slug
  - `listEvents()` / `getEvent(slug)` - Event discovery
  - `listTags()` - Category tags for filtering
  - `getOrderBook(tokenId)` - Full bid/ask orderbook
  - `getPrice(tokenId, side)` - Current best price
  - `getTrades(tokenId)` - Trade history
  - `getPriceHistory(tokenId)` - Historical price data
- **Note**: Markets use `slug` for identification. CLOB operations use `token_id` (from market's `clobTokenIds` field)
- **Note**: Orderbook returns both bids AND asks (unlike Kalshi's bids-only)

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

#### Kalshi (Required for Kalshi tools)

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

#### Polymarket (Optional - works without configuration)

All Polymarket read operations are public and require no authentication.
Optional overrides:

```bash
# Optional host overrides (defaults shown)
POLYMARKET_GAMMA_HOST=https://gamma-api.polymarket.com
POLYMARKET_CLOB_HOST=https://clob.polymarket.com
POLYMARKET_CHAIN_ID=137  # Polygon mainnet
```

### MCP Server Configuration

Example configuration for Claude Desktop (`claude_desktop_config.json`):

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

## Code Style

**Comments:**

- Avoid self-explanatory comments that restate what the code does
- Focus on **normative state** (what the code is and why) not historical state (what it used to be)
- Omit changelog-style comments explaining past changes - use git history for that
- Write comments that add context the code alone cannot convey

## Development Setup

```bash
# Install dependencies
bun install

# Run tests
bun test

# Lint and format
bun run lint
bun run format

# Pre-commit hooks are automatically set up via Husky
```

## Documentation

Documentation in `docs/` is auto-generated from source code. After modifying tools (`src/tools.ts`, `src/validation.ts`) or environment variables, regenerate with:

```bash
bun run docs:generate
```

CI validates docs are in sync via `bun run docs:check`.

**Before creating a PR**, always run `bun run docs:generate` if you modified tools or configuration.

### Previewing Docs Locally

```bash
# Install mkdocs with material theme (one-time)
uv tool install mkdocs --with mkdocs-material

# Serve locally
bun run docs:serve
```
