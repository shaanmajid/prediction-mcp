import { describe, expect, test } from "bun:test";
import { AxiosError } from "axios";
import {
  getKalshiAuthState,
  getKalshiCredentialState,
  validateKalshiCredentials,
} from "./kalshi.js";
import { AuthInitError } from "./types.js";

describe("getKalshiCredentialState", () => {
  describe("status: none", () => {
    test("returns none when no credentials provided", () => {
      const result = getKalshiCredentialState({});
      expect(result).toEqual({ status: "none" });
    });
  });

  describe("status: partial", () => {
    test("returns partial when only apiKey provided", () => {
      const result = getKalshiCredentialState({ apiKey: "test-key" });
      expect(result).toEqual({ status: "partial" });
    });

    test("returns partial when only privateKeyPem provided", () => {
      const result = getKalshiCredentialState({ privateKeyPem: "-----BEGIN" });
      expect(result).toEqual({ status: "partial" });
    });

    test("returns partial when only privateKeyPath provided", () => {
      const result = getKalshiCredentialState({
        privateKeyPath: "/path/to/key",
      });
      expect(result).toEqual({ status: "partial" });
    });
  });

  describe("status: complete", () => {
    test("returns complete with apiKey and privateKeyPem", () => {
      const result = getKalshiCredentialState({
        apiKey: "test-key",
        privateKeyPem: "-----BEGIN RSA PRIVATE KEY-----",
      });
      expect(result).toEqual({ status: "complete" });
    });

    test("returns complete with apiKey and privateKeyPath", () => {
      const result = getKalshiCredentialState({
        apiKey: "test-key",
        privateKeyPath: "/path/to/key.pem",
      });
      expect(result).toEqual({ status: "complete" });
    });

    test("returns complete when both key formats provided", () => {
      const result = getKalshiCredentialState({
        apiKey: "test-key",
        privateKeyPem: "-----BEGIN RSA PRIVATE KEY-----",
        privateKeyPath: "/path/to/key.pem",
      });
      expect(result).toEqual({ status: "complete" });
    });
  });
});

/**
 * Helper to create a mock Axios error with proper structure.
 * Uses real AxiosError constructor for accurate isAxiosError() detection.
 */
function createAxiosError(
  status?: number,
  code?: string,
  message = "Request failed",
): AxiosError {
  const error = new AxiosError(message, code);
  if (status !== undefined) {
    error.response = {
      status,
      statusText: "",
      headers: {},
      config: {} as never,
      data: {},
    };
  }
  return error;
}

describe("validateKalshiCredentials", () => {
  describe("successful validation", () => {
    test("returns valid when API call succeeds", async () => {
      const mockClient = {
        getApiKeys: () => Promise.resolve({ api_keys: [] }),
      };

      const result = await validateKalshiCredentials(mockClient as never);

      expect(result).toEqual({ status: "valid" });
    });
  });

  describe("HTTP error handling", () => {
    test("returns 'Invalid API key or private key' on 401", async () => {
      const mockClient = {
        getApiKeys: () => Promise.reject(createAxiosError(401)),
      };

      const result = await validateKalshiCredentials(mockClient as never);

      expect(result.status).toBe("invalid");
      expect(result).toHaveProperty("error", "Invalid API key or private key");
    });

    test("returns 'API key lacks required permissions' on 403", async () => {
      const mockClient = {
        getApiKeys: () => Promise.reject(createAxiosError(403)),
      };

      const result = await validateKalshiCredentials(mockClient as never);

      expect(result.status).toBe("invalid");
      expect(result).toHaveProperty(
        "error",
        "API key lacks required permissions",
      );
    });

    test("returns axios error message for other HTTP errors", async () => {
      const mockClient = {
        getApiKeys: () =>
          Promise.reject(
            createAxiosError(500, undefined, "Internal Server Error"),
          ),
      };

      const result = await validateKalshiCredentials(mockClient as never);

      expect(result.status).toBe("invalid");
      expect(result).toHaveProperty("error", "Internal Server Error");
    });
  });

  describe("network error handling", () => {
    test("returns network error message on ENOTFOUND", async () => {
      const mockClient = {
        getApiKeys: () =>
          Promise.reject(createAxiosError(undefined, "ENOTFOUND")),
      };

      const result = await validateKalshiCredentials(mockClient as never);

      expect(result.status).toBe("invalid");
      expect(result).toHaveProperty(
        "error",
        "Could not reach Kalshi API — check your network connection",
      );
    });

    test("returns network error message on ECONNREFUSED", async () => {
      const mockClient = {
        getApiKeys: () =>
          Promise.reject(createAxiosError(undefined, "ECONNREFUSED")),
      };

      const result = await validateKalshiCredentials(mockClient as never);

      expect(result.status).toBe("invalid");
      expect(result).toHaveProperty(
        "error",
        "Could not reach Kalshi API — check your network connection",
      );
    });
  });

  describe("non-axios error handling", () => {
    test("returns error message for generic Error", async () => {
      const mockClient = {
        getApiKeys: () => Promise.reject(new Error("Something went wrong")),
      };

      const result = await validateKalshiCredentials(mockClient as never);

      expect(result.status).toBe("invalid");
      expect(result).toHaveProperty("error", "Something went wrong");
    });

    test("returns 'Authentication failed' for non-Error thrown values", async () => {
      const mockClient = {
        getApiKeys: () => Promise.reject("string error"),
      };

      const result = await validateKalshiCredentials(mockClient as never);

      expect(result.status).toBe("invalid");
      expect(result).toHaveProperty("error", "Authentication failed");
    });
  });
});

describe("getKalshiAuthState", () => {
  describe("no credentials", () => {
    test("returns unauthenticated state", async () => {
      const mockClient = { getApiKeys: () => Promise.resolve({}) };

      const result = await getKalshiAuthState({}, mockClient as never);

      expect(result).toEqual({
        authenticated: false,
        reason: "no_credentials",
      });
    });

    test("does not call API", async () => {
      let called = false;
      const mockClient = {
        getApiKeys: () => {
          called = true;
          return Promise.resolve({});
        },
      };

      await getKalshiAuthState({}, mockClient as never);

      expect(called).toBe(false);
    });
  });

  describe("partial credentials", () => {
    test("throws AuthInitError for apiKey only", async () => {
      const mockClient = { getApiKeys: () => Promise.resolve({}) };

      await expect(
        getKalshiAuthState({ apiKey: "test" }, mockClient as never),
      ).rejects.toThrow(AuthInitError);
    });

    test("throws AuthInitError for privateKey only", async () => {
      const mockClient = { getApiKeys: () => Promise.resolve({}) };

      await expect(
        getKalshiAuthState(
          { privateKeyPem: "-----BEGIN" },
          mockClient as never,
        ),
      ).rejects.toThrow(AuthInitError);
    });

    test("error message mentions both required fields", async () => {
      const mockClient = { getApiKeys: () => Promise.resolve({}) };

      try {
        await getKalshiAuthState({ apiKey: "test" }, mockClient as never);
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect((e as AuthInitError).message).toContain("API key");
        expect((e as AuthInitError).message).toContain("private key");
      }
    });
  });

  describe("complete credentials - valid", () => {
    test("returns authenticated state", async () => {
      const mockClient = {
        getApiKeys: () => Promise.resolve({ api_keys: [] }),
      };

      const result = await getKalshiAuthState(
        { apiKey: "key", privateKeyPem: "-----BEGIN RSA" },
        mockClient as never,
      );

      expect(result).toEqual({ authenticated: true });
    });
  });

  describe("complete credentials - invalid", () => {
    test("throws AuthInitError on API rejection", async () => {
      const mockClient = {
        getApiKeys: () => Promise.reject(createAxiosError(401)),
      };

      await expect(
        getKalshiAuthState(
          { apiKey: "bad", privateKeyPem: "-----BEGIN" },
          mockClient as never,
        ),
      ).rejects.toThrow(AuthInitError);
    });

    test("error includes validation details", async () => {
      const mockClient = {
        getApiKeys: () => Promise.reject(createAxiosError(401)),
      };

      try {
        await getKalshiAuthState(
          { apiKey: "bad", privateKeyPem: "-----BEGIN" },
          mockClient as never,
        );
        expect.unreachable("Should have thrown");
      } catch (e) {
        expect((e as AuthInitError).details?.error).toBeDefined();
      }
    });
  });
});
