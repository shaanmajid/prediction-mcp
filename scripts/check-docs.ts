#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * Documentation Freshness Checker
 *
 * Validates that generated documentation is up-to-date with source code.
 * Used in CI to fail builds if docs are stale.
 *
 * Exit codes:
 *   0 - Docs are up-to-date
 *   1 - Docs are stale (need regeneration)
 */

import { getToolsList } from "../src/tools.js";
import * as fs from "fs";
import * as path from "path";

const DOCS_DIR = path.join(import.meta.dir, "../docs");
const SRC_DIR = path.join(import.meta.dir, "../src");

// Env vars that are documented in generate-docs.ts
const DOCUMENTED_ENV_VARS = [
  // Kalshi
  "KALSHI_API_KEY",
  "KALSHI_PRIVATE_KEY_PATH",
  "KALSHI_PRIVATE_KEY_PEM",
  "KALSHI_USE_DEMO",
  "KALSHI_BASE_PATH",
  // Polymarket
  "POLYMARKET_GAMMA_HOST",
  "POLYMARKET_CLOB_HOST",
  "POLYMARKET_CHAIN_ID",
];

function checkToolsInReference(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const refPath = path.join(DOCS_DIR, "tools/reference.md");

  if (!fs.existsSync(refPath)) {
    return {
      valid: false,
      errors: [
        "tools/reference.md does not exist. Run `bun run docs:generate`.",
      ],
    };
  }

  const content = fs.readFileSync(refPath, "utf-8");
  const tools = getToolsList();

  for (const tool of tools) {
    // Check tool name exists (format: ## tool_name)
    if (!content.includes(`## ${tool.name}`)) {
      errors.push(`Tool '${tool.name}' not documented in reference.md`);
    }

    // Check description matches
    if (!content.includes(tool.description)) {
      errors.push(`Tool '${tool.name}' description out of sync`);
    }

    // Check parameters are documented
    const schema = tool.inputSchema as {
      properties?: Record<string, unknown>;
      required?: string[];
    };
    if (schema.properties) {
      for (const paramName of Object.keys(schema.properties)) {
        if (!content.includes(paramName)) {
          errors.push(
            `Parameter '${paramName}' of tool '${tool.name}' not documented`,
          );
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function checkEnvVarsInConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const configPath = path.join(DOCS_DIR, "configuration.md");

  if (!fs.existsSync(configPath)) {
    return {
      valid: false,
      errors: ["configuration.md does not exist. Run `bun run docs:generate`."],
    };
  }

  const content = fs.readFileSync(configPath, "utf-8");

  // Expected env vars from source code
  const expectedEnvVars = [
    "KALSHI_API_KEY",
    "KALSHI_PRIVATE_KEY_PATH",
    "KALSHI_PRIVATE_KEY_PEM",
    "KALSHI_BASE_PATH",
  ];

  for (const envVar of expectedEnvVars) {
    if (!content.includes(envVar)) {
      errors.push(`Environment variable '${envVar}' not documented`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function checkIndexToolList(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const indexPath = path.join(DOCS_DIR, "index.md");

  if (!fs.existsSync(indexPath)) {
    return {
      valid: false,
      errors: ["index.md does not exist. Run `bun run docs:generate`."],
    };
  }

  const content = fs.readFileSync(indexPath, "utf-8");
  const tools = getToolsList();

  for (const tool of tools) {
    if (!content.includes(tool.name)) {
      errors.push(`Tool '${tool.name}' not listed in index.md`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function findEnvVarsInSource(): Set<string> {
  const envVars = new Set<string>();
  const envVarPattern = /process\.env\.([A-Z_][A-Z0-9_]*)/g;

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts")
      ) {
        const content = fs.readFileSync(fullPath, "utf-8");
        let match;
        while ((match = envVarPattern.exec(content)) !== null) {
          if (match[1]) envVars.add(match[1]);
        }
      }
    }
  }

  scanDir(SRC_DIR);
  return envVars;
}

function checkEnvVarsInSource(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const sourceEnvVars = findEnvVarsInSource();
  const documentedSet = new Set(DOCUMENTED_ENV_VARS);

  // Check for undocumented env vars in source
  for (const envVar of sourceEnvVars) {
    if (!documentedSet.has(envVar)) {
      errors.push(
        `Env var '${envVar}' found in source but not documented. Add it to ENV_VARS in generate-docs.ts`,
      );
    }
  }

  // Check for documented env vars not in source (stale docs)
  for (const envVar of DOCUMENTED_ENV_VARS) {
    if (!sourceEnvVars.has(envVar)) {
      errors.push(
        `Env var '${envVar}' documented but not found in source. Remove from ENV_VARS in generate-docs.ts`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

function checkAutoGenMarkers(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const autoGenFiles = [
    "index.md",
    "configuration.md",
    "tools/reference.md",
    "getting-started.md",
  ];

  for (const file of autoGenFiles) {
    const filePath = path.join(DOCS_DIR, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (!content.includes("AUTO-GENERATED")) {
        errors.push(`${file} is missing auto-generation marker`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

async function main() {
  console.log("Checking documentation freshness...\n");

  const checks = [
    { name: "Tools in reference.md", fn: checkToolsInReference },
    { name: "Env vars in configuration.md", fn: checkEnvVarsInConfig },
    { name: "Env vars match source code", fn: checkEnvVarsInSource },
    { name: "Tools in index.md", fn: checkIndexToolList },
    { name: "Auto-generation markers", fn: checkAutoGenMarkers },
  ];

  let allValid = true;
  const allErrors: string[] = [];

  for (const check of checks) {
    const result = check.fn();
    const status = result.valid ? "[ok]" : "[FAIL]";
    console.log(`${status} ${check.name}`);

    if (!result.valid) {
      allValid = false;
      for (const error of result.errors) {
        console.log(`   └─ ${error}`);
        allErrors.push(error);
      }
    }
  }

  console.log("");

  if (!allValid) {
    console.log("FAIL: Documentation is out of sync with source code!");
    console.log("");
    console.log("To fix, run:");
    console.log("  bun run docs:generate");
    console.log("");
    process.exit(1);
  }

  console.log("OK: Documentation is up-to-date with source code.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error checking docs:", err);
  process.exit(1);
});
