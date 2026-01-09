#!/usr/bin/env node
/**
 * prediction-mcp CLI
 *
 * A feature-rich command-line interface for accessing prediction market data
 * from Kalshi and Polymarket.
 *
 * Design principles:
 * - Avoid "payload bombs": configurable output with field selection and filtering
 * - Good DX: rich help, aliases, examples
 * - Reuse MCP server's business logic: same clients, services, validation
 * - Inspired by gh CLI: subcommand structure, output formatting options
 *
 * Usage:
 *   pm kalshi markets list --limit 10
 *   pm poly market get --slug will-bitcoin-hit-100k --json
 *   pm kalshi search all --query "bitcoin" --fields ticker,title,yes_price
 */

import { z } from "zod";
import { kalshiCommand, polymarketCommand } from "./commands/index.js";
import { formatAuthStatus, getContext } from "./context.js";
import { formatOutput, type OutputOptions } from "./output.js";
import {
  type CommandDefinition,
  formatValidationErrors,
  generateHelp,
  generateRootHelp,
  parseArgs,
  resolveCommand,
  validateArgs,
} from "./parser.js";

// ============================================================
// Version
// ============================================================

const VERSION = "0.1.16";

// ============================================================
// Root Commands
// ============================================================

const statusCommand: CommandDefinition = {
  name: "status",
  description: "Show authentication and configuration status",
  aliases: ["auth", "whoami"],
  schema: z.object({}),
  handler: async () => {
    return formatAuthStatus();
  },
};

const versionCommand: CommandDefinition = {
  name: "version",
  description: "Show version information",
  aliases: ["v", "--version"],
  schema: z.object({}),
  handler: async () => {
    return `prediction-mcp CLI v${VERSION}`;
  },
};

const COMMANDS: Record<string, CommandDefinition> = {
  kalshi: kalshiCommand,
  polymarket: polymarketCommand,
  status: statusCommand,
  version: versionCommand,
};

// ============================================================
// Output Helper
// ============================================================

function print(message: string): void {
  process.stdout.write(`${message}\n`);
}

function printError(message: string): void {
  process.stderr.write(`${message}\n`);
}

// ============================================================
// Main CLI Entry Point
// ============================================================

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { command, args, globalOptions } = parseArgs(argv);

  // Handle --version at root level
  if (globalOptions.version) {
    print(`prediction-mcp CLI v${VERSION}`);
    return;
  }

  // Handle root --help
  if (command.length === 0 && globalOptions.help) {
    print(generateRootHelp(COMMANDS, VERSION));
    return;
  }

  // Handle empty command (show help)
  if (command.length === 0) {
    print(generateRootHelp(COMMANDS, VERSION));
    return;
  }

  // Resolve the command
  const resolved = resolveCommand(command, COMMANDS);

  if (!resolved) {
    printError(`Unknown command: ${command.join(" ")}`);
    printError(`Run 'pm --help' for usage information.`);
    process.exit(1);
  }

  // Handle --help for specific command
  if (globalOptions.help) {
    print(generateHelp(["pm", ...resolved.path], resolved.definition, VERSION));
    return;
  }

  // Check if command has subcommands but none specified
  if (
    resolved.definition.subcommands &&
    command.length === resolved.path.length
  ) {
    print(generateHelp(["pm", ...resolved.path], resolved.definition, VERSION));
    return;
  }

  // Validate arguments against schema
  const validation = validateArgs(args, resolved.definition.schema);
  if (!validation.success) {
    printError(formatValidationErrors(validation.errors!));
    printError(
      `\nRun 'pm ${resolved.path.join(" ")} --help' for usage information.`,
    );
    process.exit(1);
  }

  // Build output options
  const outputOptions: OutputOptions = {
    format: globalOptions.format,
    fields: globalOptions.fields,
    jq: globalOptions.jq,
    quiet: globalOptions.quiet,
    noHeaders: globalOptions.noHeaders,
    maxWidth: globalOptions.maxWidth,
    pretty: globalOptions.pretty,
  };

  // Initialize context with demo flag if specified
  try {
    await getContext({ demo: globalOptions.demo });
  } catch (error) {
    if (error instanceof Error) {
      printError(`Configuration error: ${error.message}`);
    } else {
      printError(`Configuration error: ${String(error)}`);
    }
    process.exit(1);
  }

  // Execute the handler
  try {
    const result = await resolved.definition.handler(
      validation.data,
      outputOptions,
    );

    // Format and output the result
    if (result !== undefined && result !== null) {
      if (typeof result === "string") {
        print(result);
      } else {
        const output = formatOutput(
          result,
          outputOptions,
          resolved.definition.defaultColumns,
        );
        print(output);
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      printError(formatValidationErrors(errors));
      process.exit(1);
    }

    if (error instanceof Error) {
      const message = error.message;

      // Network/connectivity errors
      if (
        message.includes("host_not_allowed") ||
        message.includes("Forbidden")
      ) {
        printError(`Network error: ${message}`);
        printError("\nThe API request was blocked. This may be due to:");
        printError("  - Network restrictions in your environment");
        printError("  - IP/region blocking by the API provider");
        process.exit(1);
      }

      if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
        printError(`Connection error: ${message}`);
        printError("\nCannot reach the API. Check your network connection.");
        process.exit(1);
      }

      // Auth errors
      if (message.includes("401") || message.includes("Unauthorized")) {
        printError(`Authentication error: ${message}`);
        printError(
          "\nFor Kalshi, ensure KALSHI_API_KEY and KALSHI_PRIVATE_KEY_PATH are set.",
        );
        process.exit(1);
      }

      if (message.includes("404") || message.includes("not found")) {
        printError(`Not found: ${message}`);
        process.exit(1);
      }

      if (message.includes("429") || message.includes("rate limit")) {
        printError(`Rate limited: ${message}`);
        printError("Please wait and try again.");
        process.exit(1);
      }

      printError(`Error: ${message}`);
      process.exit(1);
    }

    printError(`Unknown error: ${String(error)}`);
    process.exit(1);
  }
}

// Run the CLI
main().catch((error) => {
  printError(`Fatal error: ${String(error)}`);
  process.exit(1);
});
