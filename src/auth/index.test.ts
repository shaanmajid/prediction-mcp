import { describe, expect, test } from "bun:test";
import { AuthInitError, initializeAuth } from "./index.js";

/**
 * Tests for initializeAuth orchestration.
 *
 * Detailed credential/validation behavior is tested in kalshi.test.ts.
 * These tests verify the orchestrator correctly combines platform results.
 */

describe("initializeAuth", () => {
  test("returns AuthContext with both platform states", async () => {
    const mockClient = { getApiKeys: () => Promise.resolve({}) } as never;

    const result = await initializeAuth({}, mockClient);

    expect(result).toHaveProperty("kalshi");
    expect(result).toHaveProperty("polymarket");
  });

  test("Polymarket always returns unauthenticated (no auth support)", async () => {
    const mockClient = {
      getApiKeys: () => Promise.resolve({ api_keys: [] }),
    } as never;

    // Even with valid Kalshi credentials, Polymarket stays unauthenticated
    const result = await initializeAuth(
      { apiKey: "key", privateKeyPem: "-----BEGIN RSA" },
      mockClient,
    );

    expect(result.polymarket).toEqual({
      authenticated: false,
      reason: "no_credentials",
    });
  });

  test("propagates AuthInitError from Kalshi validation", async () => {
    const mockClient = { getApiKeys: () => Promise.resolve({}) } as never;

    // Partial credentials should throw
    await expect(
      initializeAuth({ apiKey: "only-api-key" }, mockClient),
    ).rejects.toThrow(AuthInitError);
  });
});

describe("AuthInitError", () => {
  test("has correct name property", () => {
    const error = new AuthInitError("test");
    expect(error.name).toBe("AuthInitError");
  });

  test("preserves message", () => {
    const error = new AuthInitError("Custom message");
    expect(error.message).toBe("Custom message");
  });

  test("stores optional details", () => {
    const details = { foo: "bar", count: 42 };
    const error = new AuthInitError("test", details);
    expect(error.details).toEqual(details);
  });

  test("is instanceof Error", () => {
    const error = new AuthInitError("test");
    expect(error).toBeInstanceOf(Error);
  });
});
