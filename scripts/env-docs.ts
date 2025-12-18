/**
 * Environment variable documentation extraction.
 *
 * Build-time only — extracts documentation metadata from env schemas.
 * Used by generate-docs.ts and check-docs.ts.
 */
import { z, type ZodTypeAny } from "zod";
import { serverSchema, type DocMeta } from "../src/env.js";

// ============================================================
// Types
// ============================================================

export interface EnvVarDoc {
  name: string;
  description: string;
  required: boolean;
  default?: string;
}

// ============================================================
// Extraction Logic
// ============================================================

/**
 * Extract documentation metadata from a Zod schema.
 *
 * Reads from:
 * - schema.meta() for description and docDefault
 * - schema.isOptional() for required detection
 * - z.toJSONSchema() for actual default values (when not a transform)
 */
function extractSchemaDoc(name: string, schema: ZodTypeAny): EnvVarDoc {
  // Get metadata from .meta()
  const meta = (schema.meta?.() ?? {}) as DocMeta;

  // Description is required in DocMeta, but fallback just in case
  const description = meta.description || `Environment variable ${name}`;

  // Try to get default from JSON Schema (works for non-transform schemas)
  let defaultStr: string | undefined = meta.docDefault;
  if (!defaultStr) {
    try {
      const jsonSchema = z.toJSONSchema(schema, {
        io: "input",
        unrepresentable: "any",
      }) as { default?: unknown };
      if ("default" in jsonSchema && jsonSchema.default !== undefined) {
        defaultStr = String(jsonSchema.default);
      }
    } catch {
      // Transform schemas can't be converted - use docDefault from meta
    }
  }

  // A field is required if it's not optional and has no default
  const isOptional = schema.isOptional() || defaultStr !== undefined;

  return {
    name,
    description,
    required: !isOptional,
    default: defaultStr,
  };
}

/**
 * Environment variable documentation derived from schema.
 * Used by generate-docs.ts and check-docs.ts.
 */
export const ENV_VAR_DOCS: EnvVarDoc[] = Object.entries(serverSchema).map(
  ([name, schema]) => extractSchemaDoc(name, schema),
);
