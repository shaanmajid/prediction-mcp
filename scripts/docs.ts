#!/usr/bin/env bun
/* eslint-disable no-console */
/**
 * Documentation CLI
 *
 * Unified script for generating and validating documentation.
 *
 * Usage:
 *   bun run scripts/docs.ts generate   # Generate docs from source
 *   bun run scripts/docs.ts check      # Validate docs match source (CI)
 */

import { z, type ZodTypeAny } from "zod";
import { serverSchema, type DocMeta } from "../src/env.js";
import { getToolsList } from "../src/tools.js";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Constants
// ============================================================

const DOCS_DIR = path.join(import.meta.dir, "../docs");
const REFERENCE_DIR = path.join(DOCS_DIR, "reference");

/** Files that are auto-generated (and safe to overwrite) */
export const AUTO_GENERATED_FILES = [
  "reference/configuration.md",
  "reference/tools.md",
];

// ============================================================
// Types
// ============================================================

interface EnvVarDoc {
  name: string;
  description: string;
  required: boolean;
  default?: string;
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

// ============================================================
// Environment Variable Extraction (from Zod schema)
// ============================================================

/**
 * Extract documentation metadata from a Zod schema.
 */
function extractSchemaDoc(name: string, schema: ZodTypeAny): EnvVarDoc {
  const meta = (schema.meta?.() ?? {}) as DocMeta;
  const description = meta.description || `Environment variable ${name}`;

  let defaultStr: string | undefined = meta.docDefault;
  if (!defaultStr) {
    try {
      const jsonSchema = z.toJSONSchema(schema, {
        io: "input",
        unrepresentable: "any",
      }) as { default?: unknown };
      if ("default" in jsonSchema && jsonSchema.default !== undefined) {
        defaultStr = String(jsonSchema.default);
      }
    } catch {
      // Transform schemas can't be converted - use docDefault from meta
    }
  }

  const isOptional = schema.isOptional() || defaultStr !== undefined;

  return {
    name,
    description,
    required: !isOptional,
    default: defaultStr,
  };
}

/**
 * Environment variable documentation derived from schema.
 */
function getEnvVarDocs(): EnvVarDoc[] {
  return Object.entries(serverSchema).map(([name, schema]) =>
    extractSchemaDoc(name, schema),
  );
}

// ============================================================
// Generators
// ============================================================

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateToolReference(): string {
  const tools = getToolsList();

  // Group tools by platform
  const kalshiTools = tools.filter((t) => t.name.startsWith("kalshi_"));
  const polymarketTools = tools.filter((t) => t.name.startsWith("polymarket_"));

  const lines: string[] = [
    "<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->",
    "",
    "# Tools Reference",
    "",
  ];

  // Helper to render a single tool
  const renderTool = (tool: (typeof tools)[0]) => {
    const schema = tool.inputSchema as JsonSchema;
    const required = new Set(schema.required || []);

    lines.push(`## \`${tool.name}\``);
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
          typeInfo = prop.enum.map((e) => `\`"${e}"\``).join(" | ");
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
          lines.push(`    - ${prop.description}`);
        }
        lines.push("");
      }
    } else {
      lines.push("No parameters.");
      lines.push("");
    }
  };

  // Kalshi section
  lines.push("## Kalshi");
  lines.push("");
  for (const tool of kalshiTools) {
    renderTool(tool);
  }

  // Polymarket section
  lines.push("## Polymarket");
  lines.push("");
  for (const tool of polymarketTools) {
    renderTool(tool);
  }

  return lines.join("\n");
}

function generateConfiguration(): string {
  const envVarDocs = getEnvVarDocs();
  const lines: string[] = [
    "<!-- AUTO-GENERATED. Run `bun run docs:generate` to update. -->",
    "",
    "# Configuration",
    "",
    "## Environment Variables",
    "",
  ];

  for (const env of envVarDocs) {
    const reqStr = env.required ? "**required**" : "optional";
    lines.push(`### \`${env.name}\``);
    lines.push("");
    lines.push(`${env.description} (${reqStr})`);
    if (env.default) {
      lines.push("");
      lines.push(`Default: \`${env.default}\``);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ============================================================
// Checkers
// ============================================================

interface CheckResult {
  valid: boolean;
  errors: string[];
}

function checkToolsInReference(): CheckResult {
  const errors: string[] = [];
  const refPath = path.join(REFERENCE_DIR, "tools.md");

  if (!fs.existsSync(refPath)) {
    return {
      valid: false,
      errors: [
        "reference/tools.md does not exist. Run `bun run docs:generate`.",
      ],
    };
  }

  const content = fs.readFileSync(refPath, "utf-8");
  const tools = getToolsList();

  for (const tool of tools) {
    const hasBacktickFormat = content.includes(`\`${tool.name}\``);
    const hasPlainFormat = content.includes(`## ${tool.name}`);
    if (!hasBacktickFormat && !hasPlainFormat) {
      errors.push(`Tool '${tool.name}' not documented in reference.md`);
    }

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

function checkIndexToolList(): CheckResult {
  const errors: string[] = [];
  const indexPath = path.join(DOCS_DIR, "index.md");

  if (!fs.existsSync(indexPath)) {
    return {
      valid: false,
      errors: ["index.md does not exist."],
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

function checkEnvVarsMatchSchema(): CheckResult {
  const errors: string[] = [];
  const configPath = path.join(REFERENCE_DIR, "configuration.md");

  if (!fs.existsSync(configPath)) {
    return {
      valid: false,
      errors: [
        "reference/configuration.md does not exist. Run `bun run docs:generate`.",
      ],
    };
  }

  const content = fs.readFileSync(configPath, "utf-8");
  const envVarDocs = getEnvVarDocs();

  for (const envVar of envVarDocs) {
    if (!content.includes(`### \`${envVar.name}\``)) {
      errors.push(
        `Env var '${envVar.name}' defined in env.ts but not documented in reference/configuration.md`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

function checkAutoGenMarkers(): CheckResult {
  const errors: string[] = [];

  for (const file of AUTO_GENERATED_FILES) {
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

// ============================================================
// Commands
// ============================================================

function runGenerate(): void {
  console.log("Generating documentation...\n");

  ensureDir(DOCS_DIR);
  ensureDir(REFERENCE_DIR);

  const files = [
    {
      path: path.join(REFERENCE_DIR, "tools.md"),
      content: generateToolReference(),
    },
    {
      path: path.join(REFERENCE_DIR, "configuration.md"),
      content: generateConfiguration(),
    },
  ];

  for (const file of files) {
    fs.writeFileSync(file.path, file.content);
    console.log(`  [ok] ${path.relative(process.cwd(), file.path)}`);
  }

  console.log("\nDone.");
}

function runCheck(): void {
  console.log("Checking documentation freshness...\n");

  const checks = [
    { name: "Tools in reference.md", fn: checkToolsInReference },
    { name: "Env vars match env.ts", fn: checkEnvVarsMatchSchema },
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

// ============================================================
// Exports (for testing)
// ============================================================

export {
  generateToolReference,
  generateConfiguration,
  getEnvVarDocs,
  extractSchemaDoc,
};

// ============================================================
// Main
// ============================================================

function printUsage(): void {
  console.log("Usage: bun run scripts/docs.ts <command>");
  console.log("");
  console.log("Commands:");
  console.log("  generate   Generate documentation from source code");
  console.log("  check      Validate documentation matches source (for CI)");
  process.exit(1);
}

// Only run CLI when executed directly (not when imported for testing)
const isDirectExecution =
  import.meta.path === Bun.main || process.argv[1]?.endsWith("docs.ts");

if (isDirectExecution) {
  const command = process.argv[2];

  switch (command) {
    case "generate":
      runGenerate();
      break;
    case "check":
      runCheck();
      break;
    default:
      printUsage();
  }
}
