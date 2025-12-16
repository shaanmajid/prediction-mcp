<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->

# Prediction Markets MCP Server

MCP server for fetching prediction market data from Kalshi and Polymarket.

## Features

- Query markets by status, event, category, or series
- Get market details, orderbooks, and trade history
- Retrieve price history and market metadata
- Cross-platform market discovery (Kalshi + Polymarket)

## Kalshi Tools

- **kalshi_list_markets** - List available markets on Kalshi. Filter by status (open/closed/settled), event, or series.
- **kalshi_get_market** - Get detailed information about a specific Kalshi market including prices, volume, and settlement terms.
- **kalshi_get_orderbook** - Get the current orderbook for a Kalshi market. Note: Only returns bids (no asks) due to binary market reciprocity.
- **kalshi_get_trades** - Get recent trade history for Kalshi markets. Can filter by specific market ticker.
- **kalshi_get_series** - Get series metadata including title for URL construction. Series represent categories of related markets (e.g., endorsements, elections).
- **kalshi_get_event** - Get event metadata including title for URL construction. Events represent specific occurrences that can be traded on.
- **kalshi_search** - Search across Kalshi events and markets using keyword matching. Returns results ranked by relevance. Searches event titles, market titles, and candidate/outcome names (yes_sub_title).
- **kalshi_search_events** - Search Kalshi events by keyword. Returns events ranked by relevance based on title, subtitle, and ticker matches.
- **kalshi_search_markets** - Search Kalshi markets by keyword. Returns markets ranked by relevance. Searches title, yes_sub_title (candidate/outcome names), no_sub_title, and ticker.
- **kalshi_cache_stats** - Get search cache statistics including event/market counts and last refresh time. Optionally trigger a cache refresh.

## Polymarket Tools

- **polymarket_list_markets** - List available markets on Polymarket. Filter by status (open/closed) and category tags. Returns market metadata including question, prices, volume, and token IDs for CLOB operations.
- **polymarket_get_market** - Get detailed information about a specific Polymarket market by slug. Returns question, description, resolution criteria, current prices, volume, and token IDs.
- **polymarket_list_events** - List events on Polymarket. Events group related markets (e.g., '2024 Election' may contain multiple market questions).
- **polymarket_get_event** - Get detailed event information by slug. Events contain metadata and may include nested markets.
- **polymarket_list_tags** - List available category tags on Polymarket. Tags can be used to filter markets and events by category (e.g., Politics, Sports, Crypto).
- **polymarket_get_orderbook** - Get the current orderbook for a Polymarket outcome token. Returns both bids and asks with price and size. Use token_id from market's clobTokenIds field.
- **polymarket_get_price** - Get the current best price for a Polymarket outcome token. Specify BUY or SELL side.
- **polymarket_get_price_history** - Get historical price data for a Polymarket outcome token. Returns time series of price points. Defaults to last 24 hours with hourly resolution.

See [Tools Reference](tools/reference.md) for parameters and usage.

## Quick Start

```bash
bun install
cp .env.example .env  # Add your Kalshi credentials (Polymarket is public)
bun run scripts/bootstrap.ts --interactive
```

## Links

- [Configuration](configuration.md)
- [Kalshi API Docs](https://docs.kalshi.com)
- [Polymarket API Docs](https://docs.polymarket.com)
- [MCP Specification](https://modelcontextprotocol.io)
