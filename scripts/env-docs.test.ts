import { describe, test, expect } from "bun:test";
import { ENV_VAR_DOCS, type EnvVarDoc } from "./env-docs.js";

/**
 * Documentation extraction tests.
 *
 * Tests that ENV_VAR_DOCS correctly extracts metadata from serverSchema.
 */

describe("ENV_VAR_DOCS metadata extraction", () => {
  test("contains all expected env vars", () => {
    const expectedNames = [
      "KALSHI_API_KEY",
      "KALSHI_PRIVATE_KEY_PATH",
      "KALSHI_PRIVATE_KEY_PEM",
      "KALSHI_USE_DEMO",
      "KALSHI_BASE_PATH",
      "POLYMARKET_GAMMA_HOST",
      "POLYMARKET_CLOB_HOST",
      "POLYMARKET_CHAIN_ID",
      "LOG_LEVEL",
    ];

    const actualNames = ENV_VAR_DOCS.map((doc) => doc.name);
    expect(actualNames).toEqual(expectedNames);
  });

  test("all docs have descriptions from .meta()", () => {
    for (const doc of ENV_VAR_DOCS) {
      expect(doc.description).toBeTruthy();
      expect(doc.description.length).toBeGreaterThan(10);
    }
  });

  test("correctly identifies required vs optional", () => {
    const findDoc = (name: string): EnvVarDoc | undefined =>
      ENV_VAR_DOCS.find((d) => d.name === name);

    // All Kalshi auth vars are optional (public data works without auth)
    expect(findDoc("KALSHI_API_KEY")?.required).toBe(false);
    expect(findDoc("KALSHI_PRIVATE_KEY_PATH")?.required).toBe(false);

    // Vars with defaults are not required
    expect(findDoc("KALSHI_USE_DEMO")?.required).toBe(false);
    expect(findDoc("POLYMARKET_GAMMA_HOST")?.required).toBe(false);
    expect(findDoc("LOG_LEVEL")?.required).toBe(false);
  });

  test("correctly extracts default values", () => {
    const findDoc = (name: string): EnvVarDoc | undefined =>
      ENV_VAR_DOCS.find((d) => d.name === name);

    expect(findDoc("KALSHI_USE_DEMO")?.default).toBe("false");
    expect(findDoc("POLYMARKET_GAMMA_HOST")?.default).toBe(
      "https://gamma-api.polymarket.com",
    );
    expect(findDoc("POLYMARKET_CLOB_HOST")?.default).toBe(
      "https://clob.polymarket.com",
    );
    expect(findDoc("POLYMARKET_CHAIN_ID")?.default).toBe("137");
    expect(findDoc("LOG_LEVEL")?.default).toBe("info");
  });

  test("optional vars without defaults have no default field", () => {
    const findDoc = (name: string): EnvVarDoc | undefined =>
      ENV_VAR_DOCS.find((d) => d.name === name);

    expect(findDoc("KALSHI_API_KEY")?.default).toBeUndefined();
    expect(findDoc("KALSHI_BASE_PATH")?.default).toBeUndefined();
  });
});
