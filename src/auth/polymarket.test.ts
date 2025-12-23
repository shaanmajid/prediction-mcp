import { describe, expect, test } from "bun:test";
import {
  getPolymarketAuthState,
  getPolymarketCredentialState,
} from "./polymarket.js";

/**
 * Tests for Polymarket auth stubs.
 *
 * These functions currently return static values since Polymarket
 * has no authenticated endpoints yet. Tests exist to:
 * 1. Document expected behavior
 * 2. Catch accidental changes during refactoring
 * 3. Ensure coverage as the module evolves
 */

describe("getPolymarketCredentialState", () => {
  test("returns none status (no auth support yet)", () => {
    const result = getPolymarketCredentialState({});
    expect(result).toEqual({ status: "none" });
  });

  test("ignores any config properties (future-proofing)", () => {
    // When Polymarket adds auth, this test will fail and need updating
    const result = getPolymarketCredentialState({
      futureField: "value",
    } as never);
    expect(result).toEqual({ status: "none" });
  });
});

describe("getPolymarketAuthState", () => {
  test("returns unauthenticated with no_credentials reason", () => {
    const result = getPolymarketAuthState();
    expect(result).toEqual({ authenticated: false, reason: "no_credentials" });
  });

  test("authenticated property is false", () => {
    const result = getPolymarketAuthState();
    expect(result.authenticated).toBe(false);
  });
});
