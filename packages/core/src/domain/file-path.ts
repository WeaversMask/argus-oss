import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import type { Brand } from "./brand.js";
import { Validator } from "./validation.js";

/**
 * A file path as reported by scans and adapters. Relative (to the project
 * root) or absolute — the domain does not resolve paths, it only carries
 * them.
 */
export type FilePath = Brand<string, "FilePath">;

/** Validates and brands a raw path string as a {@link FilePath}. */
export function filePath(value: string): Result<FilePath, ValidationError> {
  const validator = new Validator("FilePath");
  if (value.length === 0 || value !== value.trim() || value.includes("\0")) {
    validator.add("value", "must be a non-empty path without surrounding whitespace or NUL bytes");
  }
  return validator.toResult(() => value as FilePath);
}
