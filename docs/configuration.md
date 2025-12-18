<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->

# Configuration

## Environment Variables

### KALSHI_API_KEY

Your Kalshi API key ID. Required for authenticated operations (optional)

### KALSHI_PRIVATE_KEY_PATH

Path to RSA private key PEM file. Use this OR KALSHI_PRIVATE_KEY_PEM (optional)

### KALSHI_PRIVATE_KEY_PEM

RSA private key as PEM string. Use this OR KALSHI_PRIVATE_KEY_PATH (optional)

### KALSHI_USE_DEMO

Use Kalshi demo environment (demo.kalshi.co). Accepts: true, false, 1, 0 (optional)

Default: `false`

### KALSHI_BASE_PATH

API endpoint override (advanced). Overrides KALSHI_USE_DEMO if set (optional)

### POLYMARKET_GAMMA_HOST

Polymarket Gamma API host for market discovery (optional)

Default: `https://gamma-api.polymarket.com`

### POLYMARKET_CLOB_HOST

Polymarket CLOB API host for orderbook/trading data (optional)

Default: `https://clob.polymarket.com`

### POLYMARKET_CHAIN_ID

Polygon chain ID for Polymarket CLOB client (optional)

Default: `137`

### LOG_LEVEL

Logging verbosity: trace, debug, info, warn, error, fatal (optional)

Default: `info`

## Setup

1. Get API credentials at [kalshi.com/profile/api](https://kalshi.com/profile/api)
2. Set environment variables or pass config to client

### Claude Desktop

Add to `claude_desktop_config.json`:

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
