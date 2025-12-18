// src/config.test.ts
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { ConfigSchema } from "./config.js";

describe("ConfigSchema", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all config-related env vars
    delete process.env.KALSHI_API_KEY;
    delete process.env.KALSHI_PRIVATE_KEY_PATH;
    delete process.env.KALSHI_PRIVATE_KEY_PEM;
    delete process.env.KALSHI_USE_DEMO;
    delete process.env.POLYMARKET_GAMMA_HOST;
    delete process.env.POLYMARKET_CLOB_HOST;
    delete process.env.POLYMARKET_CHAIN_ID;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("applies defaults when env vars are missing", () => {
    const result = ConfigSchema.safeParse(process.env);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kalshi.useDemo).toBe(false);
      expect(result.data.kalshi.apiKey).toBeUndefined();
      expect(result.data.polymarket.gammaHost).toBe(
        "https://gamma-api.polymarket.com",
      );
      expect(result.data.polymarket.clobHost).toBe(
        "https://clob.polymarket.com",
      );
      expect(result.data.polymarket.chainId).toBe(137);
      expect(result.data.logLevel).toBe("info");
    }
  });

  test("parses valid env vars", () => {
    process.env.KALSHI_API_KEY = "test-key";
    process.env.KALSHI_USE_DEMO = "true";
    process.env.POLYMARKET_CHAIN_ID = "80001";
    process.env.LOG_LEVEL = "debug";

    const result = ConfigSchema.safeParse(process.env);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kalshi.apiKey).toBe("test-key");
      expect(result.data.kalshi.useDemo).toBe(true);
      expect(result.data.polymarket.chainId).toBe(80001);
      expect(result.data.logLevel).toBe("debug");
    }
  });

  test("fails on invalid URL", () => {
    process.env.POLYMARKET_GAMMA_HOST = "not-a-url";

    const result = ConfigSchema.safeParse(process.env);

    expect(result.success).toBe(false);
  });

  test("fails on invalid chain ID", () => {
    process.env.POLYMARKET_CHAIN_ID = "not-a-number";

    const result = ConfigSchema.safeParse(process.env);

    expect(result.success).toBe(false);
  });

  test("fails on invalid log level", () => {
    process.env.LOG_LEVEL = "invalid";

    const result = ConfigSchema.safeParse(process.env);

    expect(result.success).toBe(false);
  });

  test("coerces boolean strings", () => {
    process.env.KALSHI_USE_DEMO = "false";

    const result = ConfigSchema.safeParse(process.env);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kalshi.useDemo).toBe(false);
    }
  });
});
