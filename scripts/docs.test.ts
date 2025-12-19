import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { serverSchema } from "../src/env.js";
import { getToolsList } from "../src/tools.js";
import {
  AUTO_GENERATED_FILES,
  extractSchemaDoc,
  generateConfiguration,
  generateToolReference,
  getEnvVarDocs,
} from "./docs.js";

/**
 * Documentation generator tests.
 *
 * These tests serve as guardrails to prevent accidentally:
 * - Adding manually-maintained files to the auto-generation list
 * - Breaking the dynamic extraction from source code
 */

// ============================================================
// Auto-Generation Boundary Tests
// ============================================================

describe("AUTO_GENERATED_FILES", () => {
  test("only includes files that should be overwritten", () => {
    // These are the ONLY files the generator should touch
    expect(AUTO_GENERATED_FILES).toEqual([
      "reference/configuration.md",
      "reference/tools.md",
    ]);
  });

  test("does NOT include manually-maintained files", () => {
    const manualFiles = [
      "index.md",
      "getting-started.md",
      "troubleshooting.md",
    ];

    for (const file of manualFiles) {
      expect(AUTO_GENERATED_FILES).not.toContain(file);
    }
  });
});

// ============================================================
// Generator Output Tests
// ============================================================

describe("generateToolReference", () => {
  test("includes AUTO-GENERATED marker", () => {
    const output = generateToolReference();
    expect(output).toContain("AUTO-GENERATED");
  });

  test("includes all tools from source", () => {
    const output = generateToolReference();
    const tools = getToolsList();

    for (const tool of tools) {
      expect(output).toContain(`## \`${tool.name}\``);
    }
  });

  test("includes tool parameters", () => {
    const output = generateToolReference();
    const tools = getToolsList();

    // Find a tool with parameters
    const toolWithParams = tools.find(
      (t) =>
        t.inputSchema &&
        typeof t.inputSchema === "object" &&
        "properties" in t.inputSchema &&
        Object.keys(t.inputSchema.properties || {}).length > 0,
    );

    if (toolWithParams) {
      const schema = toolWithParams.inputSchema as {
        properties: Record<string, unknown>;
      };
      for (const paramName of Object.keys(schema.properties)) {
        expect(output).toContain(paramName);
      }
    }
  });
});

describe("generateConfiguration", () => {
  test("includes AUTO-GENERATED marker", () => {
    const output = generateConfiguration();
    expect(output).toContain("AUTO-GENERATED");
  });

  test("includes all env vars from Zod schema", () => {
    const output = generateConfiguration();
    const envVars = Object.keys(serverSchema);

    for (const envVar of envVars) {
      expect(output).toContain(`### \`${envVar}\``);
    }
  });
});

// ============================================================
// Env Var Extraction Tests
// ============================================================

describe("getEnvVarDocs", () => {
  test("extracts all env vars from schema", () => {
    const docs = getEnvVarDocs();
    const schemaKeys = Object.keys(serverSchema);

    expect(docs.length).toBe(schemaKeys.length);

    for (const doc of docs) {
      expect(schemaKeys).toContain(doc.name);
    }
  });

  test("each doc has required fields", () => {
    const docs = getEnvVarDocs();

    for (const doc of docs) {
      expect(doc).toHaveProperty("name");
      expect(doc).toHaveProperty("description");
      expect(doc).toHaveProperty("required");
      expect(typeof doc.name).toBe("string");
      expect(typeof doc.description).toBe("string");
      expect(typeof doc.required).toBe("boolean");
    }
  });
});

describe("extractSchemaDoc", () => {
  test("extracts description from schema meta", () => {
    const schema = z.string().meta({ description: "Test description" });
    const doc = extractSchemaDoc("TEST_VAR", schema);

    expect(doc.name).toBe("TEST_VAR");
    expect(doc.description).toBe("Test description");
  });

  test("uses fallback description when meta is missing", () => {
    const schema = z.string();
    const doc = extractSchemaDoc("TEST_VAR", schema);

    expect(doc.description).toContain("TEST_VAR");
  });

  test("detects optional schemas", () => {
    const requiredSchema = z.string();
    const optionalSchema = z.string().optional();

    const requiredDoc = extractSchemaDoc("REQUIRED", requiredSchema);
    const optionalDoc = extractSchemaDoc("OPTIONAL", optionalSchema);

    expect(requiredDoc.required).toBe(true);
    expect(optionalDoc.required).toBe(false);
  });

  test("extracts default values", () => {
    const schemaWithDefault = z.string().default("default-value");
    const doc = extractSchemaDoc("WITH_DEFAULT", schemaWithDefault);

    expect(doc.default).toBe("default-value");
    expect(doc.required).toBe(false); // Has default, so not required
  });
});
