<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->

# Configuration

## Environment Variables

### KALSHI_API_KEY

Your Kalshi API key ID. Not required for public market data (current tools) (optional)

### KALSHI_PRIVATE_KEY_PATH

Path to RSA private key PEM file. Provide this OR `KALSHI_PRIVATE_KEY_PEM` (optional)

### KALSHI_PRIVATE_KEY_PEM

RSA private key as PEM string. Provide this OR `KALSHI_PRIVATE_KEY_PATH` (optional)

### KALSHI_BASE_PATH

API endpoint override. Use `https://demo-api.kalshi.co/trade-api/v2` for testing (optional)

Default: `https://api.elections.kalshi.com/trade-api/v2`

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
