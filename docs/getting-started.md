# Getting Started

Get up and running with Prediction Markets MCP in under 5 minutes.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ (for `npx`) or [Bun](https://bun.sh/) v1.0+ (for `bunx`)
- An MCP-compatible client (see supported clients below)

## Installation

This server is published on npm. No cloning or building required—just configure your MCP client to run it via `npx`.

## Register with Your MCP Client

Choose your client and follow the setup instructions.

!!! note "Configuration may vary"
MCP client configuration varies by tool—some support project-level, user-level, or both. The examples below show typical setups. Check your client's official documentation for the latest details.

!!! warning "Restart often required"
Most MCP clients load servers at startup. After adding or updating configuration, you may need to restart your client (or use a refresh button, depending on the client) to load changes.

=== "Claude Code"

    Add to `.mcp.json` in your project or `~/.claude.json` for global access:

    ```json
    {
      "mcpServers": {
        "prediction-markets": {
          "command": "npx",
          "args": ["-y", "prediction-mcp"],
          "env": {
            "KALSHI_API_KEY": "your-api-key",
            "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
          }
        }
      }
    }
    ```

    **Using Bun?** Replace `"command": "npx", "args": ["-y", "prediction-mcp"]` with `"command": "bunx", "args": ["prediction-mcp"]`.

=== "Claude Desktop"

    Edit `claude_desktop_config.json` at the path for your OS:

    | OS | Path |
    |----|------|
    | macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
    | Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

    !!! tip "Quick access"
        In Claude Desktop: **Settings → Developer → Edit Config**

    Add the following configuration:

    ```json
    {
      "mcpServers": {
        "prediction-markets": {
          "command": "npx",
          "args": ["-y", "prediction-mcp"],
          "env": {
            "KALSHI_API_KEY": "your-api-key",
            "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
          }
        }
      }
    }
    ```

=== "VS Code"

    VS Code has native MCP support.

    **Option 1: Workspace configuration**

    Create `.vscode/mcp.json` in your project:

    ```json
    {
      "servers": {
        "prediction-markets": {
          "command": "npx",
          "args": ["-y", "prediction-mcp"],
          "env": {
            "KALSHI_API_KEY": "your-api-key",
            "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
          }
        }
      }
    }
    ```

    **Option 2: Command Palette**

    1. Open Command Palette (Ctrl/Cmd + Shift + P)
    2. Run **MCP: Add Server**
    3. Enter the server configuration

    !!! info "More info"
        See [VS Code MCP documentation](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) for advanced features like input prompts and HTTP transport.

=== "Cursor"

    Create `.cursor/mcp.json` in your project root, or `~/.cursor/mcp.json` for global access:

    ```json
    {
      "mcpServers": {
        "prediction-markets": {
          "command": "npx",
          "args": ["-y", "prediction-mcp"],
          "env": {
            "KALSHI_API_KEY": "your-api-key",
            "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
          }
        }
      }
    }
    ```

    **Alternative: Settings UI**

    1. Go to **File → Preferences → Cursor Settings**
    2. Select **MCP**
    3. Click **Add Custom MCP**

    !!! info "More info"
        See [Cursor MCP documentation](https://cursor.com/docs/context/mcp) for environment variable interpolation and advanced configuration.

=== "Windsurf"

    Edit the MCP config file at `~/.codeium/windsurf/mcp_config.json`:

    ```json
    {
      "mcpServers": {
        "prediction-markets": {
          "command": "npx",
          "args": ["-y", "prediction-mcp"],
          "env": {
            "KALSHI_API_KEY": "your-api-key",
            "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
          }
        }
      }
    }
    ```

    **Alternative: Plugin Store**

    1. Click the **Plugins** icon in the Cascade panel
    2. Or go to **Windsurf Settings → Cascade → Plugins**

    !!! info "More info"
        See [Windsurf MCP documentation](https://docs.windsurf.com/windsurf/cascade/mcp) for team administration and whitelisting.

=== "Zed"

    Add to your Zed `settings.json` (Preferences → Settings):

    ```json
    {
      "context_servers": {
        "prediction-markets": {
          "command": "npx",
          "args": ["-y", "prediction-mcp"],
          "env": {
            "KALSHI_API_KEY": "your-api-key",
            "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
          }
        }
      }
    }
    ```

    Check the server status in the Agent Panel settings—a green indicator means it's active.

    !!! info "More info"
        See [Zed MCP documentation](https://zed.dev/docs/ai/mcp) for extension-based MCP servers.

=== "OpenCode"

    Create `opencode.jsonc` in your project root:

    ```jsonc
    {
      "$schema": "https://opencode.ai/config.json",
      "mcp": {
        "prediction-markets": {
          "type": "local",
          "command": ["npx", "-y", "prediction-mcp"],
          "enabled": true,
          "environment": {
            "KALSHI_API_KEY": "your-api-key",
            "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
          }
        }
      }
    }
    ```

    !!! info "More info"
        See [OpenCode MCP documentation](https://opencode.ai/docs/mcp-servers/) for remote servers and OAuth configuration.

---

## Verify It Works

Ask your AI assistant:

> "List open markets on Kalshi about the Federal Reserve"

Or for Polymarket (no credentials needed):

> "What are the top markets on Polymarket right now?"

If the server is working, you'll see market data in the response. If not, see [Troubleshooting](troubleshooting.md).

---

## Credentials

### Polymarket

No credentials required. All Polymarket tools work out of the box—read operations are public.

### Kalshi

Kalshi requires API credentials:

1. Create an account at [kalshi.com](https://kalshi.com)
2. Go to [kalshi.com/account/profile](https://kalshi.com/account/profile)
3. Generate an API key and download your private key

!!! tip "Demo environment"
Kalshi offers a [demo environment](https://demo.kalshi.co) with mock funds for testing. Demo credentials are separate from production—create a demo account at [demo.kalshi.co](https://demo.kalshi.co) first, then set `KALSHI_USE_DEMO=true` in your configuration.

See [Configuration](reference/configuration.md) for all environment variables.

---

## Next Steps

- [Configuration](reference/configuration.md) — Environment variables and advanced setup
- [Tools Reference](reference/tools.md) — Complete tool documentation with parameters
- [Troubleshooting](troubleshooting.md) — Common issues and solutions
