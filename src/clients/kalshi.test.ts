import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  resolveKalshiBasePath,
  KALSHI_PRODUCTION_URL,
  KALSHI_DEMO_URL,
} from "./kalshi.js";

/**
 * Unit tests for Kalshi client configuration
 *
 * Tests the URL resolution logic for demo/production environments.
 * Integration tests for actual API calls are in src/tools.test.ts.
 */

describe("resolveKalshiBasePath", () => {
  // Store original env values to restore after tests
  const originalEnv = {
    KALSHI_USE_DEMO: process.env.KALSHI_USE_DEMO,
    KALSHI_BASE_PATH: process.env.KALSHI_BASE_PATH,
  };

  beforeEach(() => {
    // Clear relevant env vars before each test
    delete process.env.KALSHI_USE_DEMO;
    delete process.env.KALSHI_BASE_PATH;
  });

  afterEach(() => {
    // Restore original env values
    if (originalEnv.KALSHI_USE_DEMO !== undefined) {
      process.env.KALSHI_USE_DEMO = originalEnv.KALSHI_USE_DEMO;
    } else {
      delete process.env.KALSHI_USE_DEMO;
    }
    if (originalEnv.KALSHI_BASE_PATH !== undefined) {
      process.env.KALSHI_BASE_PATH = originalEnv.KALSHI_BASE_PATH;
    } else {
      delete process.env.KALSHI_BASE_PATH;
    }
  });

  test("uses production URL by default", () => {
    const result = resolveKalshiBasePath({});

    expect(result.basePath).toBe(KALSHI_PRODUCTION_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("uses demo URL when useDemo config is true", () => {
    const result = resolveKalshiBasePath({ useDemo: true });

    expect(result.basePath).toBe(KALSHI_DEMO_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("uses demo URL when KALSHI_USE_DEMO env is 'true'", () => {
    process.env.KALSHI_USE_DEMO = "true";

    const result = resolveKalshiBasePath({});

    expect(result.basePath).toBe(KALSHI_DEMO_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("uses production URL when KALSHI_USE_DEMO env is not 'true'", () => {
    process.env.KALSHI_USE_DEMO = "false";

    const result = resolveKalshiBasePath({});

    expect(result.basePath).toBe(KALSHI_PRODUCTION_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("config.useDemo takes precedence over KALSHI_USE_DEMO env", () => {
    process.env.KALSHI_USE_DEMO = "true";

    const result = resolveKalshiBasePath({ useDemo: false });

    expect(result.basePath).toBe(KALSHI_PRODUCTION_URL);
    expect(result.shouldWarn).toBe(false);
  });

  test("explicit basePath config takes precedence over useDemo", () => {
    const customUrl = "https://custom.kalshi.com/api";

    const result = resolveKalshiBasePath({
      useDemo: true,
      basePath: customUrl,
    });

    expect(result.basePath).toBe(customUrl);
    expect(result.shouldWarn).toBe(true);
    expect(result.explicitBasePath).toBe(customUrl);
  });

  test("KALSHI_BASE_PATH env takes precedence over useDemo", () => {
    const customUrl = "https://custom.kalshi.com/api";
    process.env.KALSHI_BASE_PATH = customUrl;

    const result = resolveKalshiBasePath({ useDemo: true });

    expect(result.basePath).toBe(customUrl);
    expect(result.shouldWarn).toBe(true);
    expect(result.explicitBasePath).toBe(customUrl);
  });

  test("config.basePath takes precedence over KALSHI_BASE_PATH env", () => {
    const envUrl = "https://env.kalshi.com/api";
    const configUrl = "https://config.kalshi.com/api";
    process.env.KALSHI_BASE_PATH = envUrl;

    const result = resolveKalshiBasePath({ basePath: configUrl });

    expect(result.basePath).toBe(configUrl);
  });

  test("shouldWarn is true only when both demo flag AND explicit path are set", () => {
    // Demo flag only - no warning
    expect(resolveKalshiBasePath({ useDemo: true }).shouldWarn).toBe(false);

    // Explicit path only - no warning
    expect(
      resolveKalshiBasePath({ basePath: "https://custom.com" }).shouldWarn,
    ).toBe(false);

    // Both set - warning
    expect(
      resolveKalshiBasePath({ useDemo: true, basePath: "https://custom.com" })
        .shouldWarn,
    ).toBe(true);

    // Demo via env + explicit path - warning
    process.env.KALSHI_USE_DEMO = "true";
    expect(
      resolveKalshiBasePath({ basePath: "https://custom.com" }).shouldWarn,
    ).toBe(true);
  });
});
