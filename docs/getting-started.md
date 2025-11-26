<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->

# Getting Started

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- Kalshi account with API access

## Installation

```bash
git clone https://github.com/shaanmajid/prediction-mcp.git
cd prediction-mcp
bun install
```

## Configuration

```bash
cp .env.example .env
```

Edit `.env` with your Kalshi API credentials. See [Configuration](configuration.md).

## Register with Claude

```bash
bun run scripts/bootstrap.ts --interactive
```

## Verify

Ask Claude: "List open markets on Kalshi"
