import { describe, test, expect } from "bun:test";
import { z } from "zod";
import { env, kalshiConfig, polymarketConfig } from "./env.js";

/** Environment validation tests. */

// ============================================================
// Custom Boolean Validator Tests
// ============================================================

describe("booleanString validator", () => {
  // Recreate the validator for isolated testing
  const booleanString = z
    .enum(["true", "false", "1", "0"])
    .transform((v) => v === "true" || v === "1");

  test("transforms string booleans to actual booleans", () => {
    expect(booleanString.parse("true")).toBe(true);
    expect(booleanString.parse("false")).toBe(false);
    expect(booleanString.parse("1")).toBe(true);
    expect(booleanString.parse("0")).toBe(false);
  });

  test("rejects common boolean-like typos (strict validation)", () => {
    // This is the key behavior we care about — rejecting ambiguous values
    expect(() => booleanString.parse("TRUE")).toThrow();
    expect(() => booleanString.parse("yes")).toThrow();
    expect(() => booleanString.parse("on")).toThrow();
  });
});

// ============================================================
// Config Object Integration Tests
// ============================================================

describe("config objects", () => {
  test("kalshiConfig exposes validated env vars", () => {
    expect(typeof kalshiConfig.useDemo).toBe("boolean");
    // Optional fields should be string or undefined
    expect(
      kalshiConfig.apiKey === undefined ||
        typeof kalshiConfig.apiKey === "string",
    ).toBe(true);
  });

  test("polymarketConfig has required defaults", () => {
    expect(polymarketConfig.gammaHost).toMatch(/^https?:\/\//);
    expect(polymarketConfig.clobHost).toMatch(/^https?:\/\//);
    expect(polymarketConfig.chainId).toBeGreaterThan(0);
  });

  test("config objects reference same env values", () => {
    expect(kalshiConfig.useDemo).toBe(env.KALSHI_USE_DEMO);
    expect(polymarketConfig.chainId).toBe(env.POLYMARKET_CHAIN_ID);
  });
});
