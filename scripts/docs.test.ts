import { describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { serverSchema } from "../src/env.js";
import { getToolsList } from "../src/tools.js";
import {
  AUTO_GENERATED_FILES,
  extractSchemaDoc,
  generateConfiguration,
  generateIndexToolsTable,
  generateToolReference,
  getEnvVarDocs,
  INDEX_TOOLS_END,
  INDEX_TOOLS_START,
} from "./docs.js";

const DOCS_DIR = path.join(import.meta.dir, "../docs");

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

describe("generateIndexToolsTable", () => {
  test("includes all tools from source", () => {
    const output = generateIndexToolsTable();
    const tools = getToolsList();

    for (const tool of tools) {
      expect(output).toContain(tool.name);
    }
  });

  test("generates markdown table format", () => {
    const output = generateIndexToolsTable();

    expect(output).toContain("## Tools");
    expect(output).toContain("### Kalshi");
    expect(output).toContain("### Polymarket");
    expect(output).toContain("| Tool | Description |");
    expect(output).toContain("| ---- | ----------- |");
  });

  test("includes links to tools reference", () => {
    const output = generateIndexToolsTable();

    expect(output).toContain("(reference/tools.md#kalshi_list_markets)");
    expect(output).toContain("(reference/tools.md#polymarket_list_markets)");
  });

  test("does NOT include AUTO-GENERATED marker", () => {
    const output = generateIndexToolsTable();
    expect(output).not.toContain("AUTO-GENERATED");
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

// ============================================================
// Idempotency Tests
// ============================================================

describe("idempotency", () => {
  test("generateToolReference matches committed file exactly", () => {
    const generated = generateToolReference();
    const committedPath = path.join(DOCS_DIR, "reference/tools.md");
    const committed = fs.readFileSync(committedPath, "utf-8");

    expect(generated).toBe(committed);
  });

  test("generateConfiguration matches committed file exactly", () => {
    const generated = generateConfiguration();
    const committedPath = path.join(DOCS_DIR, "reference/configuration.md");
    const committed = fs.readFileSync(committedPath, "utf-8");

    expect(generated).toBe(committed);
  });

  test("generateIndexToolsTable matches committed index.md section", () => {
    const generated = generateIndexToolsTable();
    const indexPath = path.join(DOCS_DIR, "index.md");
    const indexContent = fs.readFileSync(indexPath, "utf-8");

    // Extract the section between markers
    const startIdx = indexContent.indexOf(INDEX_TOOLS_START);
    const endIdx = indexContent.indexOf(INDEX_TOOLS_END);

    expect(startIdx).toBeGreaterThan(-1);
    expect(endIdx).toBeGreaterThan(startIdx);

    const committedSection = indexContent.slice(
      startIdx + INDEX_TOOLS_START.length + 1, // +1 for newline
      endIdx - 1, // -1 for newline before marker
    );

    expect(generated).toBe(committedSection);
  });
});

// ============================================================
// Index.md Marker Tests
// ============================================================

describe("index.md markers", () => {
  test("index.md contains TOOLS_TABLE_START marker", () => {
    const indexPath = path.join(DOCS_DIR, "index.md");
    const content = fs.readFileSync(indexPath, "utf-8");

    expect(content).toContain(INDEX_TOOLS_START);
  });

  test("index.md contains TOOLS_TABLE_END marker", () => {
    const indexPath = path.join(DOCS_DIR, "index.md");
    const content = fs.readFileSync(indexPath, "utf-8");

    expect(content).toContain(INDEX_TOOLS_END);
  });

  test("markers are in correct order", () => {
    const indexPath = path.join(DOCS_DIR, "index.md");
    const content = fs.readFileSync(indexPath, "utf-8");

    const startIdx = content.indexOf(INDEX_TOOLS_START);
    const endIdx = content.indexOf(INDEX_TOOLS_END);

    expect(startIdx).toBeLessThan(endIdx);
  });
});
