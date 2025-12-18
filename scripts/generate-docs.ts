#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * Documentation Generator
 *
 * Generates markdown documentation from source code.
 * Run with: bun run docs:generate
 */

import { getToolsList } from "../src/tools.js";
import { ENV_VAR_DOCS } from "../src/env.js";
import * as fs from "fs";
import * as path from "path";

const DOCS_DIR = path.join(import.meta.dir, "../docs");
const TOOLS_DIR = path.join(DOCS_DIR, "tools");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

interface JsonSchemaProperty {
  type?: string;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
}

interface JsonSchema {
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

function generateToolReference(): string {
  const tools = getToolsList();
  const lines: string[] = [
    "<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->",
    "",
    "# Tools",
    "",
  ];

  for (const tool of tools) {
    const schema = tool.inputSchema as JsonSchema;
    const required = new Set(schema.required || []);

    lines.push(`## ${tool.name}`);
    lines.push("");
    lines.push(tool.description);
    lines.push("");

    if (schema.properties && Object.keys(schema.properties).length > 0) {
      lines.push("**Parameters:**");
      lines.push("");

      for (const [name, prop] of Object.entries(schema.properties)) {
        const isReq = required.has(name);
        let typeInfo = prop.type || "string";

        if (prop.enum) {
          typeInfo = prop.enum.map((e) => `"${e}"`).join(" | ");
        }

        const constraints: string[] = [];
        if (prop.minimum !== undefined)
          constraints.push(`min: ${prop.minimum}`);
        if (prop.maximum !== undefined)
          constraints.push(`max: ${prop.maximum}`);
        if (prop.minLength !== undefined)
          constraints.push(`minLength: ${prop.minLength}`);

        const constraintStr =
          constraints.length > 0 ? ` (${constraints.join(", ")})` : "";
        const reqStr = isReq ? "required" : "optional";

        lines.push(`- \`${name}\` (${typeInfo}${constraintStr}, ${reqStr})`);
        if (prop.description) {
          lines.push(`  ${prop.description}`);
        }
        lines.push("");
      }
    } else {
      lines.push("No parameters.");
      lines.push("");
    }
  }

  return lines.join("\n");
}

function generateConfiguration(): string {
  const lines: string[] = [
    "<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->",
    "",
    "# Configuration",
    "",
    "## Environment Variables",
    "",
  ];

  for (const env of ENV_VAR_DOCS) {
    const reqStr = env.required ? "**required**" : "optional";
    lines.push(`### ${env.name}`);
    lines.push("");
    lines.push(`${env.description} (${reqStr})`);
    if (env.default) {
      lines.push("");
      lines.push(`Default: \`${env.default}\``);
    }
    lines.push("");
  }

  lines.push("## Setup");
  lines.push("");
  lines.push(
    "1. Get API credentials at [kalshi.com/profile/api](https://kalshi.com/profile/api)",
  );
  lines.push("2. Set environment variables or pass config to client");
  lines.push("");
  lines.push("### Claude Desktop");
  lines.push("");
  lines.push("Add to `claude_desktop_config.json`:");
  lines.push("");
  lines.push("```json");
  lines.push(
    JSON.stringify(
      {
        mcpServers: {
          "prediction-markets": {
            command: "bun",
            args: ["run", "/path/to/prediction-mcp/index.ts"],
            env: {
              KALSHI_API_KEY: "your-api-key",
              KALSHI_PRIVATE_KEY_PATH: "/path/to/key.pem",
            },
          },
        },
      },
      null,
      2,
    ),
  );
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}

function generateIndex(): string {
  const tools = getToolsList();

  const kalshiTools = tools.filter((t) => t.name.startsWith("kalshi_"));
  const polymarketTools = tools.filter((t) => t.name.startsWith("polymarket_"));

  const kalshiToolList = kalshiTools
    .map((t) => `- **${t.name}** - ${t.description}`)
    .join("\n");

  const polymarketToolList = polymarketTools
    .map((t) => `- **${t.name}** - ${t.description}`)
    .join("\n");

  return `<!-- AUTO-GENERATED. Run \`bun run docs:generate\` to update. -->

# Prediction Markets MCP Server

MCP server for fetching prediction market data from Kalshi and Polymarket.

## Features

- Query markets by status, event, category, or series
- Get market details, orderbooks, and trade history
- Retrieve price history and market metadata
- Cross-platform market discovery (Kalshi + Polymarket)

## Kalshi Tools

${kalshiToolList}

## Polymarket Tools

${polymarketToolList}

See [Tools Reference](tools/reference.md) for parameters and usage.

## Quick Start

\`\`\`bash
bun install
cp .env.example .env  # Add your Kalshi credentials (Polymarket is public)
bun run scripts/bootstrap.ts --interactive
\`\`\`

## Links

- [Configuration](configuration.md)
- [Kalshi API Docs](https://docs.kalshi.com)
- [Polymarket API Docs](https://docs.polymarket.com)
- [MCP Specification](https://modelcontextprotocol.io)
`;
}

function generateGettingStarted(): string {
  return `<!-- AUTO-GENERATED. Run \`bun run docs:generate\` to update. -->

# Getting Started

## Prerequisites

- [Bun](https://bun.sh/) v1.0+

## Installation

\`\`\`bash
git clone https://github.com/shaanmajid/prediction-mcp.git
cd prediction-mcp
bun install
\`\`\`

## Configuration (Optional)

All current tools fetch public market data and work without authentication.

To configure credentials for future account-specific features (balances, orders):

\`\`\`bash
cp .env.example .env
\`\`\`

See [Configuration](configuration.md) for details.

## Register with Claude

\`\`\`bash
bun run scripts/bootstrap.ts --interactive
\`\`\`

## Verify

Ask Claude: "List open markets on Kalshi"
`;
}

async function main() {
  console.log("Generating documentation...\n");

  ensureDir(DOCS_DIR);
  ensureDir(TOOLS_DIR);

  const files = [
    {
      path: path.join(TOOLS_DIR, "reference.md"),
      content: generateToolReference(),
    },
    {
      path: path.join(DOCS_DIR, "configuration.md"),
      content: generateConfiguration(),
    },
    { path: path.join(DOCS_DIR, "index.md"), content: generateIndex() },
    {
      path: path.join(DOCS_DIR, "getting-started.md"),
      content: generateGettingStarted(),
    },
  ];

  for (const file of files) {
    fs.writeFileSync(file.path, file.content);
    console.log(`  [ok] ${path.relative(process.cwd(), file.path)}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
