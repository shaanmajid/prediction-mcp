#!/usr/bin/env bun
/**
 * Bootstrap script for registering the prediction-markets MCP server with MCP clients.
 *
 * Usage:
 *   bun run scripts/bootstrap.ts              # Project-level config (.mcp.json)
 *   bun run scripts/bootstrap.ts --global     # Global config (~/.claude.json)
 *   bun run scripts/bootstrap.ts --interactive # Prompt for credentials
 *   bun run scripts/bootstrap.ts --demo       # Use Kalshi demo environment
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as readline from "readline";

// ANSI colors for terminal output
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

const GLOBAL_CONFIG_PATH = path.join(os.homedir(), ".claude.json");
const BACKUP_SUFFIX = ".backup";

interface ClaudeConfig {
  mcpServers?: Record<string, MCPServerConfig>;
  [key: string]: unknown;
}

interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface CredentialStatus {
  apiKey: string | undefined;
  privateKeyPath: string | undefined;
}

function resolvePackageRoot(): string {
  const scriptDir = import.meta.dir;
  return path.resolve(scriptDir, "..");
}

function verifyIndexExists(packageRoot: string): string {
  const indexPath = path.join(packageRoot, "index.ts");
  if (!fs.existsSync(indexPath)) {
    console.error(
      colors.red(`✗ Could not find index.ts at ${indexPath}`),
      "\n  Are you running from the correct directory?",
    );
    process.exit(1);
  }
  return indexPath;
}

function readConfig(configPath: string): ClaudeConfig {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const content = fs.readFileSync(configPath, "utf-8");
  try {
    return JSON.parse(content) as ClaudeConfig;
  } catch {
    console.error(
      colors.red(`✗ ${configPath} contains invalid JSON.`),
      "\n  Please fix it manually before running this script.",
    );
    process.exit(1);
  }
}

function backupConfig(configPath: string): void {
  if (fs.existsSync(configPath)) {
    const backupPath = configPath + BACKUP_SUFFIX;
    fs.copyFileSync(configPath, backupPath);
    console.log(colors.dim(`  Backed up existing config to ${backupPath}`));
  }
}

function writeConfig(configPath: string, config: ClaudeConfig): void {
  const content = JSON.stringify(config, null, 2);
  fs.writeFileSync(configPath, content, "utf-8");
}

function getCredentialsFromEnv(): CredentialStatus {
  return {
    apiKey: process.env.KALSHI_API_KEY,
    privateKeyPath: process.env.KALSHI_PRIVATE_KEY_PATH,
  };
}

function printCredentialStatus(creds: CredentialStatus): void {
  const hasApiKey = !!creds.apiKey;
  const hasPrivateKey = !!creds.privateKeyPath;

  // Polymarket status (always available)
  console.log(
    colors.green("✓ Polymarket tools ready (no credentials required)"),
  );

  // Kalshi status
  if (hasApiKey && hasPrivateKey) {
    console.log(
      colors.green("✓ Kalshi credentials configured from environment"),
    );
  } else {
    console.log(
      colors.yellow("\nℹ Kalshi credentials not found in environment:"),
    );
    console.log(
      `  • KALSHI_API_KEY: ${hasApiKey ? colors.green("set") : colors.dim("not set")}`,
    );
    console.log(
      `  • KALSHI_PRIVATE_KEY_PATH: ${hasPrivateKey ? colors.green("set") : colors.dim("not set")}`,
    );
    console.log(
      colors.dim(
        "\n  Kalshi tools require credentials for authenticated requests.",
      ),
    );
    console.log(
      colors.dim(
        "  Run with --interactive to configure, or set env vars and re-run.",
      ),
    );
  }
}

function buildMCPServerConfig(
  indexPath: string,
  creds?: CredentialStatus,
  useDemo?: boolean,
): MCPServerConfig {
  const config: MCPServerConfig = {
    command: "bun",
    args: ["run", indexPath],
  };

  if (creds?.apiKey || creds?.privateKeyPath || useDemo) {
    config.env = {};
    if (creds?.apiKey) {
      config.env.KALSHI_API_KEY = creds.apiKey;
    }
    if (creds?.privateKeyPath) {
      config.env.KALSHI_PRIVATE_KEY_PATH = creds.privateKeyPath;
    }
    if (useDemo) {
      config.env.KALSHI_USE_DEMO = "true";
    }
  }

  return config;
}

async function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith("y"));
    });
  });
}

async function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.setEncoding("utf8");

    let input = "";

    const onData = (char: string) => {
      // Handle Ctrl+C
      if (char === "\x03") {
        console.log("\n");
        process.exit(1);
      }
      // Handle Enter
      if (char === "\r" || char === "\n") {
        if (stdin.isTTY) {
          stdin.setRawMode(wasRaw ?? false);
        }
        stdin.removeListener("data", onData);
        stdin.pause();
        console.log(); // New line after hidden input
        resolve(input);
        return;
      }
      // Handle Backspace
      if (char === "\x7f" || char === "\b") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return;
      }
      // Regular character
      input += char;
      process.stdout.write("•");
    };

    stdin.on("data", onData);
  });
}

async function promptVisible(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function validatePrivateKeyPath(keyPath: string): boolean {
  if (!fs.existsSync(keyPath)) {
    return false;
  }
  return true;
}

async function interactiveCredentialSetup(): Promise<CredentialStatus | null> {
  console.log();
  const wantsCreds = await promptYesNo("Configure Kalshi credentials? (y/n): ");
  if (!wantsCreds) {
    return null;
  }

  const apiKey = await promptHidden("API Key: ");
  if (!apiKey.trim()) {
    console.log(colors.yellow("  Skipping credentials (empty API key)"));
    return null;
  }

  let privateKeyPath = "";
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    privateKeyPath = await promptVisible("Private key path: ");
    privateKeyPath = privateKeyPath.trim();

    // Expand ~ to home directory
    if (privateKeyPath.startsWith("~")) {
      privateKeyPath = path.join(os.homedir(), privateKeyPath.slice(1));
    }

    if (!privateKeyPath) {
      console.log(colors.yellow("  Skipping private key (empty path)"));
      break;
    }

    if (validatePrivateKeyPath(privateKeyPath)) {
      console.log(colors.green("✓ Verified private key exists"));
      break;
    }

    attempts++;
    if (attempts < maxAttempts) {
      console.log(
        colors.yellow(
          `  File not found. Try again (${maxAttempts - attempts} attempts remaining):`,
        ),
      );
    } else {
      console.log(colors.red("  Max attempts reached. Skipping private key."));
      privateKeyPath = "";
    }
  }

  return {
    apiKey: apiKey.trim(),
    privateKeyPath: privateKeyPath || undefined,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isInteractive = args.includes("--interactive") || args.includes("-i");
  const isGlobal = args.includes("--global") || args.includes("-g");
  const useDemo = args.includes("--demo") || args.includes("-d");

  // Step 1: Resolve paths
  const packageRoot = resolvePackageRoot();
  const indexPath = verifyIndexExists(packageRoot);

  // Step 2: Determine config path
  const configPath = isGlobal
    ? GLOBAL_CONFIG_PATH
    : path.join(packageRoot, ".mcp.json");

  const scopeLabel = isGlobal ? "global" : "project";
  console.log(colors.dim(`Using ${scopeLabel} config: ${configPath}`));
  if (useDemo) {
    console.log(colors.yellow("Using Kalshi demo environment"));
  }
  console.log();

  // Step 3: Read existing config
  const config = readConfig(configPath);

  // Step 4: Backup existing config
  backupConfig(configPath);

  // Step 5: Get credentials
  let creds = getCredentialsFromEnv();

  // Step 6: Register the MCP server
  config.mcpServers = config.mcpServers || {};
  config.mcpServers["prediction-markets"] = buildMCPServerConfig(
    indexPath,
    creds,
    useDemo,
  );

  // Step 7: Write config
  writeConfig(configPath, config);

  console.log(colors.green("✓ Registered prediction-markets MCP server"));
  console.log(colors.dim(`  Path: ${indexPath}`));
  if (useDemo) {
    console.log(colors.dim("  Environment: Kalshi demo"));
  }

  // Step 8: Handle credentials
  if (isInteractive) {
    const interactiveCreds = await interactiveCredentialSetup();
    if (interactiveCreds) {
      // Update config with interactive credentials
      creds = interactiveCreds;
      config.mcpServers["prediction-markets"] = buildMCPServerConfig(
        indexPath,
        creds,
        useDemo,
      );
      writeConfig(configPath, config);
      console.log(colors.green("\n✓ Credentials configured"));
    } else {
      printCredentialStatus(creds);
    }
  } else {
    printCredentialStatus(creds);
  }

  // Step 9: Show next steps
  if (!isGlobal) {
    console.log(
      colors.dim(
        "\nNote: Project-level config requires approval on first use.",
      ),
    );
    console.log(
      colors.dim(
        "Consider adding .mcp.json to .gitignore if it contains credentials.",
      ),
    );
  }
  console.log(
    colors.dim("\nRestart your MCP client to pick up the new configuration."),
  );
}

main().catch((error) => {
  console.error(colors.red("✗ Unexpected error:"), error.message);
  process.exit(1);
});
