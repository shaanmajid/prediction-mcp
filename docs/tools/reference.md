<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->

# Tools

## kalshi_list_markets

List available markets on Kalshi. Filter by status (open/closed/settled), event, or series.

**Parameters:**

- `status` ("open" | "closed" | "settled", optional)
  Filter markets by status. Options: 'open' (currently trading), 'closed' (trading ended, awaiting settlement), 'settled' (resolved with final outcome)

- `limit` (integer (min: 1, max: 1000), optional)
  Maximum number of markets to return per page. Must be between 1 and 1000. Defaults to 100.

- `eventTicker` (string, optional)
  Filter by event ticker (e.g., 'KXPRESIDENT'). Returns only markets belonging to this event.

- `seriesTicker` (string, optional)
  Filter by series ticker (e.g., 'PRES-2024'). Returns only markets belonging to this series category.

## kalshi_get_market

Get detailed information about a specific Kalshi market including prices, volume, and settlement terms.

**Parameters:**

- `ticker` (string (minLength: 1), required)
  Market ticker symbol (e.g., 'KXPRESIDENT-2024'). Uniquely identifies a specific tradable market.

## kalshi_get_orderbook

Get the current orderbook for a Kalshi market. Note: Only returns bids (no asks) due to binary market reciprocity.

**Parameters:**

- `ticker` (string (minLength: 1), required)
  Market ticker symbol (e.g., 'KXPRESIDENT-2024'). Returns current bids for this market. Note: Only bids are returned due to binary market reciprocity.

## kalshi_get_trades

Get recent trade history for Kalshi markets. Can filter by specific market ticker.

**Parameters:**

- `ticker` (string, optional)
  Filter trades by market ticker (e.g., 'KXPRESIDENT-2024'). If omitted, returns trades across all markets.

- `limit` (integer (min: 1, max: 1000), optional)
  Maximum number of trades to return per page. Must be between 1 and 1000. Defaults to 100.

## kalshi_get_series

Get series metadata including title for URL construction. Series represent categories of related markets (e.g., endorsements, elections).

**Parameters:**

- `seriesTicker` (string (minLength: 1), required)
  Series ticker symbol (e.g., 'PRES-2024'). Returns metadata about a series, which represents a category of related markets.

## kalshi_get_event

Get event metadata including title for URL construction. Events represent specific occurrences that can be traded on.

**Parameters:**

- `eventTicker` (string (minLength: 1), required)
  Event ticker symbol (e.g., 'KXPRESIDENT'). Returns metadata about an event, which represents a specific occurrence that can be traded on.
