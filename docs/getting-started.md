<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->

# Getting Started

## Prerequisites

- [Bun](https://bun.sh/) v1.0+

## Installation

```bash
git clone https://github.com/shaanmajid/prediction-mcp.git
cd prediction-mcp
bun install
```

## Configuration (Optional)

All current tools fetch public market data and work without authentication.

To configure credentials for future account-specific features (balances, orders):

```bash
cp .env.example .env
```

See [Configuration](configuration.md) for details.

## Register with Claude

```bash
bun run scripts/bootstrap.ts --interactive
```

## Verify

Ask Claude: "List open markets on Kalshi"
