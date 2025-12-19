# Troubleshooting

Common issues and solutions when using the Prediction Markets MCP server.

---

## Server Not Loading

**Symptom:** Tools don't appear after adding configuration, or the server indicator doesn't show.

**Solutions:**

1. **Restart your MCP client** — MCP servers only load at startup. After adding or updating configuration, you must fully quit and restart your client (Claude Desktop, VS Code, Cursor, etc.).

2. **Check JSON syntax** — A trailing comma or missing bracket will silently break the config:

   ```json
   {
     "mcpServers": {
       "prediction-markets": {
         "command": "bun",
         "args": ["run", "/path/to/index.ts"] // ← no trailing comma here
       } // ← no trailing comma here
     }
   }
   ```

3. **Verify absolute paths** — Use full paths, not `~` or relative paths:

   ```json
   // ❌ Wrong
   "args": ["run", "~/prediction-mcp/index.ts"]

   // ✅ Correct
   "args": ["run", "/Users/yourname/prediction-mcp/index.ts"]
   ```

4. **Check that `bun` is in your PATH** — Run `which bun` in your terminal. If not found, install Bun or use the full path to the `bun` executable.

---

## Kalshi Authentication Errors

**Symptom:** `401 Unauthorized`, `Invalid signature`, or `Authentication failed` errors.

**Common causes:**

### Wrong API Key Type

Kalshi has separate credentials for production and demo environments. Demo credentials won't work on production, and vice versa.

| Environment | API Portal                                                       | Set `KALSHI_USE_DEMO` |
| ----------- | ---------------------------------------------------------------- | --------------------- |
| Production  | [kalshi.com/account/profile](https://kalshi.com/account/profile) | `false` or omit       |
| Demo        | [demo.kalshi.co](https://demo.kalshi.co)                         | `true`                |

### Private Key Path Issues

The private key path must be absolute and the file must exist:

```json
{
  "env": {
    "KALSHI_API_KEY": "your-api-key-id",
    "KALSHI_PRIVATE_KEY_PATH": "/Users/yourname/.kalshi/private-key.pem"
  }
}
```

!!! tip "Check your key file"
Run `cat /path/to/your/key.pem` — you should see `-----BEGIN RSA PRIVATE KEY-----` at the top.

### Using PEM String Instead of Path

If you prefer to inline the key (useful for CI/Docker), use `KALSHI_PRIVATE_KEY_PEM` instead:

```json
{
  "env": {
    "KALSHI_API_KEY": "your-api-key-id",
    "KALSHI_PRIVATE_KEY_PEM": "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
  }
}
```

---

## Polymarket Token ID Confusion

**Symptom:** "Invalid token_id" or confusion about what `token_id` to use.

**Cause:** Polymarket markets have separate token IDs for Yes/No outcomes. You can't use the market slug directly for orderbook or price queries.

**Solution:**

1. First, get market details using the slug:

   Ask: _"Get the Polymarket market with slug 'will-bitcoin-reach-100k-in-2024'"_

   This calls `polymarket_get_market` and returns `clobTokenIds` like:

   ```json
   {
     "clobTokenIds": ["12345678", "87654321"],
     "outcomes": ["Yes", "No"]
   }
   ```

2. Then use the token ID for orderbook/price queries:

   Ask: _"Get the orderbook for token 12345678"_

   This calls `polymarket_get_orderbook` with the correct token.

!!! note "Token ID mapping"
The first token ID corresponds to "Yes", the second to "No". The AI assistant handles this automatically when you ask naturally.

---

## Search Returns No Results

**Symptom:** Kalshi search queries return empty results.

**Possible causes:**

### Cache Not Yet Built

The first search takes ~7 seconds to build an in-memory cache of all Kalshi events and markets. Subsequent searches return in <1ms.

**Solution:** Wait for the first search to complete, then try again.

### Query Too Specific

The search uses keyword matching across event titles, subtitles, and tickers.

**Tips:**

- Use broader terms: "election" instead of "2024 US Presidential Election"
- Try alternative phrasings: "Fed" or "Federal Reserve" or "interest rate"
- Search events separately: Use `kalshi_search_events` to find event categories first

### Check Cache Status

Ask: _"Show Kalshi cache stats"_

This calls `kalshi_cache_stats` and shows:

- Number of events and markets cached
- Last refresh time
- Whether a refresh is needed

To force a refresh: _"Refresh the Kalshi search cache"_

---

## Rate Limiting

**Symptom:** Requests fail with rate limit errors, especially when making many rapid queries.

**Solution:** The server handles rate limiting automatically with exponential backoff. If you're seeing persistent rate limit errors:

1. **Slow down** — Wait a few seconds between requests
2. **Batch operations** — Ask for multiple pieces of information in one query
3. **Use search** — Instead of listing all markets, search for what you need

---

## Environment Variable Not Found

**Symptom:** Server starts but Kalshi tools fail with missing credentials.

**Cause:** The `env` block in your MCP config isn't being passed correctly.

**Check your configuration:**

=== "Claude Code / Cursor / VS Code"

    ```json
    {
      "mcpServers": {
        "prediction-markets": {
          "command": "bun",
          "args": ["run", "/path/to/prediction-mcp/index.ts"],
          "env": {
            "KALSHI_API_KEY": "your-key",
            "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
          }
        }
      }
    }
    ```

=== "Windsurf"

    ```json
    {
      "mcpServers": {
        "prediction-markets": {
          "command": "bun",
          "args": ["run", "/path/to/prediction-mcp/index.ts"],
          "env": {
            "KALSHI_API_KEY": "your-key",
            "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
          }
        }
      }
    }
    ```

=== "OpenCode"

    ```jsonc
    {
      "mcp": {
        "prediction-markets": {
          "type": "local",
          "command": ["bun", "run", "/path/to/prediction-mcp/index.ts"],
          "environment": {
            "KALSHI_API_KEY": "your-key",
            "KALSHI_PRIVATE_KEY_PATH": "/path/to/key.pem"
          }
        }
      }
    }
    ```

---

## Windows-Specific Issues

### "Cannot connect to MCP server"

**Cause:** Windows may not find `bun` in PATH when using just `"command": "bun"`.

**Solution:** Use the full path to the Bun executable:

```json
{
  "command": "C:\\Users\\yourname\\.bun\\bin\\bun.exe",
  "args": ["run", "C:\\path\\to\\prediction-mcp\\index.ts"]
}
```

### Path Backslash Escaping

In JSON, backslashes must be escaped:

```json
// ❌ Wrong
"KALSHI_PRIVATE_KEY_PATH": "C:\Users\name\key.pem"

// ✅ Correct
"KALSHI_PRIVATE_KEY_PATH": "C:\\Users\\name\\key.pem"
```

---

## Getting Help

If you're still stuck:

1. **Check the logs** — Most MCP clients have a way to view server logs:
   - VS Code: View → Output → select "MCP" from dropdown
   - Claude Desktop: Settings → Developer → View Logs
   - Cursor: Developer Tools (Ctrl/Cmd + Shift + I)

2. **Set debug logging** — Add `"LOG_LEVEL": "debug"` to your env block for verbose output

3. **Open an issue** — [github.com/shaanmajid/prediction-mcp/issues](https://github.com/shaanmajid/prediction-mcp/issues)
