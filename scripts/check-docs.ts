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
import { ENV_VAR_DOCS } from "./env-docs.js";
import * as fs from "fs";
import * as path from "path";

const DOCS_DIR = path.join(import.meta.dir, "../docs");

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

function checkEnvVarsInDocs(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const configPath = path.join(DOCS_DIR, "configuration.md");

  if (!fs.existsSync(configPath)) {
    return {
      valid: false,
      errors: ["configuration.md does not exist. Run `bun run docs:generate`."],
    };
  }

  const content = fs.readFileSync(configPath, "utf-8");

  // Check all env vars from ENV_VAR_DOCS are documented
  for (const envVar of ENV_VAR_DOCS) {
    if (!content.includes(`### ${envVar.name}`)) {
      errors.push(
        `Env var '${envVar.name}' defined in env.ts but not documented in configuration.md`,
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
    { name: "Env vars match env.ts", fn: checkEnvVarsInDocs },
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
