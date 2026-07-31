import type { Result } from "neverthrow";
import type { FilePath } from "../domain/file-path.js";
import type { FormatError } from "../errors/format-error.js";

/**
 * Formats source text using the target project's own style (adapters
 * resolve config nearest `file`, so the same call formats consistently
 * with a plain `prettier --write` in that project).
 *
 * Contract:
 * - Never throws; every failure is a `FormatError` in the `Result`.
 * - Pure with respect to inputs: same `(source, file)` yields the same
 *   output. No filesystem writes — the caller decides what to do with the
 *   result.
 * - Idempotent: formatting already-formatted text returns it unchanged.
 */
export interface FormatterPort {
  format(source: string, file: FilePath): Promise<Result<string, FormatError>>;
}
