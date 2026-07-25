import path from "node:path";
import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { FormatError } from "@argus/core";
import type { FilePath, FormatterPort } from "@argus/core";
import { format, resolveConfig } from "prettier";

/**
 * `FormatterPort` implementation over Prettier's JS API.
 *
 * Resolves the nearest `.prettierrc`/`prettier` config **relative to the
 * project root this instance was constructed with**, not `process.cwd()` —
 * `argus` may run from a subdirectory of the project it scans (the same
 * footgun `apps/cli`'s `project-root.ts` already fixed once for `ignore:`
 * globs), so resolving against the invocation directory would silently
 * pick up the wrong config, or none, when the two differ. Falls back to
 * Prettier's own defaults when the target project has no config of its
 * own — this adapter never carries Argus's own style opinions.
 */
export class PrettierFormatter implements FormatterPort {
  constructor(private readonly projectRoot: string) {}

  async format(source: string, file: FilePath): Promise<Result<string, FormatError>> {
    const absolutePath = path.resolve(this.projectRoot, file);
    try {
      const config = await resolveConfig(absolutePath, { editorconfig: false });
      const formatted = await format(source, { ...config, filepath: absolutePath });
      return ok(formatted);
    } catch (cause) {
      return err(new FormatError(file, message(cause)));
    }
  }
}

/**
 * Exported for direct unit testing: Prettier only ever rejects with `Error`
 * instances in practice, so the non-`Error` arm is unreachable through
 * `format()` itself — a tiny single-purpose file has too few branches
 * overall for that one path to stay uncovered without a dedicated test.
 */
export function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
