/**
 * CLI Argument Parser
 *
 * A lightweight argument parser that:
 * - Supports subcommands (kalshi markets list)
 * - Validates with Zod schemas
 * - Provides rich help output
 * - Handles global options
 */

import { z } from "zod";
import type { OutputFormat, OutputOptions } from "./output.js";

// ============================================================
// Types
// ============================================================

export interface CommandDefinition {
  name: string;
  description: string;
  aliases?: string[];
  /** Argument schema for validation */
  schema: z.ZodType;
  /** Default columns for table output */
  defaultColumns?: string[];
  /** Handler function */
  handler: (args: unknown, output: OutputOptions) => Promise<unknown>;
  /** Examples for help text */
  examples?: string[];
  /** Subcommands (for nested command groups) */
  subcommands?: Record<string, CommandDefinition>;
}

export interface GlobalOptions {
  format: OutputFormat;
  fields?: string[];
  jq?: string;
  quiet: boolean;
  noHeaders: boolean;
  maxWidth: number;
  pretty: boolean;
  help: boolean;
  version: boolean;
  demo: boolean;
}

export interface ParseResult {
  command: string[];
  args: Record<string, unknown>;
  globalOptions: GlobalOptions;
}

// ============================================================
// Argument Parsing
// ============================================================

/**
 * Parse a single argument value, handling various formats
 */
function parseArgValue(value: string): unknown {
  // Boolean shortcuts
  if (value === "true") return true;
  if (value === "false") return false;

  // Numbers
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return Number.parseFloat(value);

  // JSON arrays/objects
  if (
    (value.startsWith("[") && value.endsWith("]")) ||
    (value.startsWith("{") && value.endsWith("}"))
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

/**
 * Parse command line arguments into structured format
 */
export function parseArgs(argv: string[]): ParseResult {
  const globalOptions: GlobalOptions = {
    format: "table",
    quiet: false,
    noHeaders: false,
    maxWidth: 50,
    pretty: true,
    help: false,
    version: false,
    demo: false,
  };

  const command: string[] = [];
  const args: Record<string, unknown> = {};
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i]!;

    // Global options
    if (arg === "--help" || arg === "-h") {
      globalOptions.help = true;
      i++;
      continue;
    }

    if (arg === "--version" || arg === "-v") {
      globalOptions.version = true;
      i++;
      continue;
    }

    if (arg === "--format" || arg === "-f") {
      globalOptions.format = (argv[++i] ?? "table") as OutputFormat;
      i++;
      continue;
    }

    if (arg === "--json") {
      globalOptions.format = "json";
      i++;
      continue;
    }

    if (arg === "--table") {
      globalOptions.format = "table";
      i++;
      continue;
    }

    if (arg === "--csv") {
      globalOptions.format = "csv";
      i++;
      continue;
    }

    if (arg === "--tsv") {
      globalOptions.format = "tsv";
      i++;
      continue;
    }

    if (arg === "--plain") {
      globalOptions.format = "plain";
      i++;
      continue;
    }

    if (arg === "--fields" || arg === "-F") {
      const fieldsArg = argv[++i] ?? "";
      globalOptions.fields = fieldsArg.split(",").map((f) => f.trim());
      i++;
      continue;
    }

    if (arg === "--jq") {
      globalOptions.jq = argv[++i];
      i++;
      continue;
    }

    if (arg === "--quiet" || arg === "-q") {
      globalOptions.quiet = true;
      i++;
      continue;
    }

    if (arg === "--no-headers") {
      globalOptions.noHeaders = true;
      i++;
      continue;
    }

    if (arg === "--max-width") {
      globalOptions.maxWidth = Number.parseInt(argv[++i] ?? "50", 10);
      i++;
      continue;
    }

    if (arg === "--no-pretty") {
      globalOptions.pretty = false;
      i++;
      continue;
    }

    if (arg === "--demo") {
      globalOptions.demo = true;
      i++;
      continue;
    }

    // Named arguments: --key=value or --key value
    if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      if (eqIndex > 0) {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        args[toCamelCase(key)] = parseArgValue(value);
      } else {
        const key = arg.slice(2);
        const nextArg = argv[i + 1];
        // Check if next arg is a value or another flag
        if (nextArg && !nextArg.startsWith("-")) {
          args[toCamelCase(key)] = parseArgValue(nextArg);
          i++;
        } else {
          // Boolean flag
          args[toCamelCase(key)] = true;
        }
      }
      i++;
      continue;
    }

    // Short options: -k=value or -k value
    if (arg.startsWith("-") && arg.length === 2) {
      const key = arg.slice(1);
      const nextArg = argv[i + 1];
      if (nextArg && !nextArg.startsWith("-")) {
        args[key] = parseArgValue(nextArg);
        i++;
      } else {
        args[key] = true;
      }
      i++;
      continue;
    }

    // Positional argument (command path)
    command.push(arg);
    i++;
  }

  return { command, args, globalOptions };
}

/**
 * Convert kebab-case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Convert camelCase to kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

// ============================================================
// Help Generation
// ============================================================

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function colorize(text: string, color: keyof typeof COLORS): string {
  // Check if output supports colors
  if (!process.stdout.isTTY) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

/**
 * Generate help text for a command
 */
export function generateHelp(
  commandPath: string[],
  definition: CommandDefinition,
  version: string,
): string {
  const lines: string[] = [];
  const cmdName = commandPath.join(" ") || "pm";

  // Header
  lines.push(colorize(definition.description, "bold"));
  lines.push("");

  // Usage
  lines.push(colorize("USAGE:", "yellow"));
  if (definition.subcommands) {
    lines.push(`  ${cmdName} <command> [options]`);
  } else {
    lines.push(`  ${cmdName} [options]`);
  }
  lines.push("");

  // Subcommands
  if (definition.subcommands) {
    lines.push(colorize("COMMANDS:", "yellow"));
    const subNames = Object.keys(definition.subcommands).sort();
    const maxLen = Math.max(...subNames.map((n) => n.length));

    for (const name of subNames) {
      const sub = definition.subcommands[name]!;
      const padding = " ".repeat(maxLen - name.length + 2);
      const aliasStr = sub.aliases?.length
        ? ` (${sub.aliases.join(", ")})`
        : "";
      lines.push(
        `  ${colorize(name, "cyan")}${padding}${sub.description}${colorize(aliasStr, "dim")}`,
      );
    }
    lines.push("");
  }

  // Arguments from schema - check if it's an object with a shape
  if (definition.schema && "shape" in definition.schema) {
    const shape = (definition.schema as z.ZodObject<Record<string, z.ZodType>>)
      .shape;
    const keys = Object.keys(shape);

    // Only show arguments section if there are actual arguments
    if (keys.length > 0) {
      lines.push(colorize("ARGUMENTS:", "yellow"));

      for (const [key, fieldSchema] of Object.entries(shape)) {
        const kebabKey = toKebabCase(key);
        const desc = fieldSchema.description ?? "";
        const isOptional = fieldSchema.isOptional();
        const optLabel = isOptional
          ? colorize("(optional)", "dim")
          : colorize("(required)", "green");
        lines.push(`  --${kebabKey}  ${desc} ${optLabel}`);
      }
      lines.push("");
    }
  }

  // Global options
  lines.push(colorize("OUTPUT OPTIONS:", "yellow"));
  lines.push(
    "  --format, -f <format>  Output format: json, table, csv, tsv, plain",
  );
  lines.push("  --json                 Shorthand for --format json");
  lines.push("  --table                Shorthand for --format table (default)");
  lines.push("  --csv                  Shorthand for --format csv");
  lines.push(
    "  --fields, -F <fields>  Comma-separated list of fields to include",
  );
  lines.push("  --jq <filter>          JQ-style filter expression");
  lines.push("  --quiet, -q            Suppress non-data output");
  lines.push("  --no-headers           Omit headers in table/csv output");
  lines.push(
    "  --max-width <n>        Max column width for table output (default: 50)",
  );
  lines.push("  --no-pretty            Disable JSON pretty printing");
  lines.push("");

  lines.push(colorize("GENERAL OPTIONS:", "yellow"));
  lines.push("  --help, -h             Show help for command");
  lines.push("  --version, -v          Show version");
  lines.push("  --demo                 Use Kalshi demo environment");
  lines.push("");

  // Examples
  if (definition.examples?.length) {
    lines.push(colorize("EXAMPLES:", "yellow"));
    for (const example of definition.examples) {
      lines.push(`  ${colorize("$", "dim")} ${example}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate root help text
 */
export function generateRootHelp(
  commands: Record<string, CommandDefinition>,
  version: string,
): string {
  const lines: string[] = [];

  lines.push(colorize("prediction-mcp CLI", "bold"));
  lines.push(colorize(`Version ${version}`, "dim"));
  lines.push("");
  lines.push("Access prediction market data from Kalshi and Polymarket.");
  lines.push("");

  lines.push(colorize("USAGE:", "yellow"));
  lines.push("  pm <platform> <resource> <action> [options]");
  lines.push("  pm kalshi markets list --limit 10");
  lines.push("  pm poly market get --slug will-trump-win");
  lines.push("");

  lines.push(colorize("PLATFORMS:", "yellow"));
  const platforms = Object.keys(commands).sort();
  const maxLen = Math.max(...platforms.map((n) => n.length));

  for (const name of platforms) {
    const cmd = commands[name]!;
    const padding = " ".repeat(maxLen - name.length + 2);
    const aliasStr = cmd.aliases?.length
      ? colorize(` (${cmd.aliases.join(", ")})`, "dim")
      : "";
    lines.push(
      `  ${colorize(name, "cyan")}${padding}${cmd.description}${aliasStr}`,
    );
  }
  lines.push("");

  lines.push(colorize("OUTPUT OPTIONS:", "yellow"));
  lines.push(
    "  --format, -f <format>  Output format: json, table, csv, tsv, plain",
  );
  lines.push(
    "  --fields, -F <fields>  Select specific fields (reduces output size)",
  );
  lines.push("  --jq <filter>          JQ-style filtering");
  lines.push("  --quiet, -q            Minimal output");
  lines.push("");

  lines.push(colorize("EXAMPLES:", "yellow"));
  lines.push(
    `  ${colorize("$", "dim")} pm kalshi markets list --limit 5 --status open`,
  );
  lines.push(
    `  ${colorize("$", "dim")} pm kalshi market get --ticker KXPRESIDENT --json`,
  );
  lines.push(
    `  ${colorize("$", "dim")} pm kalshi search --query "bitcoin" --fields ticker,title,yes_price`,
  );
  lines.push(
    `  ${colorize("$", "dim")} pm poly markets list --json --jq ".[] | .slug"`,
  );
  lines.push(
    `  ${colorize("$", "dim")} pm poly market get --slug will-btc-hit-100k --csv`,
  );
  lines.push("");

  lines.push(colorize("DOCUMENTATION:", "yellow"));
  lines.push("  https://shaanmajid.github.io/prediction-mcp/");
  lines.push("");

  lines.push(
    `Run ${colorize("pm <command> --help", "cyan")} for more information on a command.`,
  );

  return lines.join("\n");
}

// ============================================================
// Command Resolution
// ============================================================

export interface ResolvedCommand {
  definition: CommandDefinition;
  path: string[];
  remainingArgs: Record<string, unknown>;
}

/**
 * Resolve a command path to its definition
 */
export function resolveCommand(
  commandPath: string[],
  commands: Record<string, CommandDefinition>,
): ResolvedCommand | null {
  if (commandPath.length === 0) {
    return null;
  }

  const [first, ...rest] = commandPath;

  // Find matching command (including aliases)
  let definition: CommandDefinition | undefined;
  let matchedName: string | undefined;

  for (const [name, cmd] of Object.entries(commands)) {
    if (name === first || cmd.aliases?.includes(first!)) {
      definition = cmd;
      matchedName = name;
      break;
    }
  }

  if (!definition || !matchedName) {
    return null;
  }

  // If there are more path segments and this command has subcommands, recurse
  if (rest.length > 0 && definition.subcommands) {
    const subResult = resolveCommand(rest, definition.subcommands);
    if (subResult) {
      return {
        ...subResult,
        path: [matchedName, ...subResult.path],
      };
    }
  }

  return {
    definition,
    path: [matchedName],
    remainingArgs: {},
  };
}

// ============================================================
// Validation
// ============================================================

export interface ValidationResult {
  success: boolean;
  data?: unknown;
  errors?: string[];
}

/**
 * Validate arguments against a Zod schema
 */
export function validateArgs(
  args: Record<string, unknown>,
  schema: z.ZodType,
): ValidationResult {
  const result = schema.safeParse(args);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return { success: false, errors };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: string[]): string {
  const lines = [colorize("Validation errors:", "yellow")];
  for (const error of errors) {
    lines.push(`  ${colorize("*", "cyan")} ${error}`);
  }
  return lines.join("\n");
}
