// src/config-metadata.ts
import { ConfigSchema } from "./config.js";

/**
 * Environment variable metadata extracted from Zod schema.
 * Used for documentation generation.
 */
export interface EnvVarMetadata {
  name: string;
  description: string;
  required: boolean;
  default?: string;
  type: string;
  enumValues?: string[];
}

interface ZodFieldDef {
  type: string;
  innerType?: ZodField;
  in?: ZodField;
  defaultValue?: unknown;
  entries?: Record<string, string>;
  coerce?: boolean;
}

interface ZodField {
  type: string;
  def: ZodFieldDef;
  description?: string;
  format?: string | null;
}

/**
 * Extract metadata from ConfigSchema for documentation generation.
 *
 * Uses Zod v4's structure to get descriptions, defaults, and types.
 * This ensures docs stay in sync with validation logic.
 */
export function getEnvVarMetadata(): EnvVarMetadata[] {
  // In Zod v4, ConfigSchema is a pipe: z.object({...}).transform(...)
  // The input object schema is in _def.in
  const inputSchema = ConfigSchema._def.in as unknown as {
    shape: Record<string, ZodField>;
  };
  const shape = inputSchema.shape;
  const metadata: EnvVarMetadata[] = [];

  for (const [name, field] of Object.entries(shape)) {
    const meta = extractFieldMetadata(name, field);
    metadata.push(meta);
  }

  return metadata;
}

function extractFieldMetadata(name: string, field: ZodField): EnvVarMetadata {
  const description = field.description || `Environment variable ${name}`;
  let defaultValue: string | undefined;
  let isOptional = false;
  let baseType = "string";
  let enumValues: string[] | undefined;

  // Walk the type chain to extract metadata
  let current: ZodField | undefined = field;

  while (current) {
    const type = current.type;
    const def: ZodFieldDef = current.def;

    if (type === "optional") {
      isOptional = true;
      current = def.innerType;
      continue;
    }

    if (type === "default") {
      defaultValue = String(def.defaultValue);
      current = def.innerType;
      continue;
    }

    if (type === "pipe") {
      // For pipes (like transform chains), look at the input
      current = def.in;
      continue;
    }

    if (type === "transform") {
      // Transform doesn't have inner type we care about
      break;
    }

    if (type === "enum" && def.entries) {
      enumValues = Object.values(def.entries);
      baseType = "enum";
      break;
    }

    if (type === "number") {
      baseType = def.coerce ? "number (coerced)" : "number";
      break;
    }

    if (type === "string") {
      baseType = current.format === "url" ? "url" : "string";
      break;
    }

    break;
  }

  return {
    name,
    description,
    required: !isOptional && defaultValue === undefined,
    default: defaultValue,
    type: baseType,
    enumValues,
  };
}
