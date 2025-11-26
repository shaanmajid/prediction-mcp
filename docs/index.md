<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->

# Prediction Markets MCP Server

MCP server for fetching prediction market data from Kalshi.

## Features

- Query markets by status, event, or series
- Get market details, orderbooks, and trade history
- Retrieve series and event metadata

## Tools

- **kalshi_list_markets** - List available markets on Kalshi. Filter by status (open/closed/settled), event, or series.
- **kalshi_get_market** - Get detailed information about a specific Kalshi market including prices, volume, and settlement terms.
- **kalshi_get_orderbook** - Get the current orderbook for a Kalshi market. Note: Only returns bids (no asks) due to binary market reciprocity.
- **kalshi_get_trades** - Get recent trade history for Kalshi markets. Can filter by specific market ticker.
- **kalshi_get_series** - Get series metadata including title for URL construction. Series represent categories of related markets (e.g., endorsements, elections).
- **kalshi_get_event** - Get event metadata including title for URL construction. Events represent specific occurrences that can be traded on.

See [Tools Reference](tools/reference.md) for parameters and usage.

## Quick Start

```bash
bun install
cp .env.example .env  # Add your Kalshi credentials
bun run scripts/bootstrap.ts --interactive
```

## Links

- [Configuration](configuration.md)
- [Kalshi API Docs](https://docs.kalshi.com)
- [MCP Specification](https://modelcontextprotocol.io)
