<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->

# Configuration

## Environment Variables

### KALSHI_API_KEY

Your Kalshi API key ID (**required**)

### KALSHI_PRIVATE_KEY_PATH

Path to RSA private key PEM file (optional)

### KALSHI_PRIVATE_KEY_PEM

RSA private key as PEM string (alternative to PATH) (optional)

### KALSHI_BASE_PATH

API endpoint override (optional)

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
