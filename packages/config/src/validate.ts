import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { ConfigError } from "./errors.js";
import type { ConfigIssue } from "./errors.js";
import { rawConfigSchema } from "./schema.js";
import type { RawConfig } from "./schema.js";
import { parseSource, positionOf } from "./yaml-source.js";
import type { ConfigSource } from "./yaml-source.js";

/**
 * Validates a parsed YAML document against the config schema. Every zod
 * issue is mapped back through the document to the 1-based line/column of
 * the offending value (P1-05 acceptance: errors point at the exact line).
 */
export function validateSource(source: ConfigSource): Result<RawConfig, ConfigError> {
  // An empty (or comments-only) document is a valid "all defaults" config.
  const raw: unknown = source.document.toJS() ?? {};
  const parsed = rawConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issues: ConfigIssue[] = parsed.error.issues.flatMap((issue) => {
      // A strict-object "unrecognized keys" issue points at the object;
      // expand it so each stray key gets its own line-accurate pointer.
      if (issue.code === "unrecognized_keys") {
        return issue.keys.map((key) => {
          const path = [...issue.path, key].map((part) => String(part));
          return {
            file: source.file,
            ...positionOf(source, path),
            path: path.join("."),
            message: `unrecognized key "${key}"`,
          };
        });
      }
      const path = issue.path.map((part) => String(part));
      return [
        {
          file: source.file,
          ...positionOf(source, path),
          path: path.join("."),
          message: issue.message,
        },
      ];
    });
    return err(new ConfigError(`Invalid configuration in ${source.file}`, issues));
  }
  return ok(parsed.data);
}

/**
 * Parse + validate YAML config text without touching the filesystem —
 * the seam in-memory consumers (editors, the future LSP) use, and what
 * `ConfigLoader` runs per file after reading it.
 */
export function validateConfigText(file: string, text: string): Result<RawConfig, ConfigError> {
  return parseSource(file, text).andThen(validateSource);
}
