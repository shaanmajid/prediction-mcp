# TODO & Roadmap

## High Priority

### Search & Discovery

- [ ] Implement `kalshi_search` MCP tool
  - [x] Client-side search implementation in KalshiClient
  - [x] Validation schemas
  - [ ] MCP tool registration and handler
  - [ ] Add caching layer with WebSocket-based invalidation (see [WebSocket API](https://docs.kalshi.com/websockets/market-&-event-lifecycle))

### Testing & Quality

- [ ] Comprehensive unit test coverage for all tools
  - [x] Stub tests for KalshiClient instantiation
  - [ ] Tests for listMarkets()
  - [ ] Tests for getMarketDetails()
  - [ ] Tests for getOrderBook()
  - [ ] Tests for getTrades()
  - [ ] Tests for getSeries()
  - [ ] Tests for getEvent()
  - [ ] Tests for search()
  - [ ] Mock API responses for deterministic testing

### Documentation

- [ ] Automated tool documentation in markdown (similar to OpenAPI for MCP)
  - [ ] Research if MCP tooling already exists for this
  - [ ] Integrate into pre-commit hooks
  - [ ] Auto-generate from tool schemas
- [ ] Exhaustive library of all required and optional config/environment variables
  - [ ] Document all environment variables
  - [ ] Add validation and helpful error messages
  - [ ] Example configurations for different setups

## Medium Priority

### Platform Integration

- [ ] Polymarket integration
  - [ ] Gamma API client implementation
  - [ ] CLOB API for orderbook/trading data
  - [ ] MCP tools for Polymarket
- [ ] Market comparison tools
  - [ ] Cross-platform market discovery
  - [ ] Price comparison utilities
  - [ ] Arbitrage detection

### Features

- [ ] Price history and candlestick data
  - [ ] Implement getMarketCandlesticks() wrapper
  - [ ] MCP tool for historical data
- [ ] WebSocket support for real-time updates
  - [ ] Market & event lifecycle stream
  - [ ] Live price updates
  - [ ] Order fill notifications

## Low Priority

### Nice to Have

- [ ] Manifold Markets integration (play money, lower priority)
- [ ] Metaculus integration (forecasting focused)
- [ ] Portfolio tracking tools
- [ ] Alerts and notifications

## Completed

- [x] Kalshi client implementation
- [x] Development tooling setup (ESLint, Prettier, Husky)
- [x] MCP server implementation (basic tools)
- [x] TypeScript type checking in pre-commit and CI
- [x] Series and event metadata tools for URL construction
- [x] Zod validation layer
- [x] Structured content responses (removed text fallbacks)

---

**Note**: This TODO list is tracked in version control. Update as tasks are completed or priorities change.
