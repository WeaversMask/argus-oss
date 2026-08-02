import { extractChangeSet } from "@argus/orchestrator";
import type { ChangeSet } from "@argus/orchestrator";
import type { DiscoveredFile } from "./discover.js";
import { EXIT_ERROR } from "./exit-codes.js";
import { gitRunner } from "./git.js";
import type { CliIO } from "./io.js";

/**
 * How `--diff` narrows a scan below "every source file under the path".
 *
 * The decisions about *what* changed belong to `@argus/orchestrator`; this is
 * the wiring — supplying the git runner, applying the result to the discovered
 * file list, and turning every failure into an exit code the user can read.
 */

/** Anything that narrows a scan below "every source file under the path". */
export interface ScanScope {
  /** `--diff <ref>`: the base ref to compare the working tree against. */
  readonly diffBase?: string | undefined;
}

/**
 * The change set for `--diff <ref>`, `undefined` when the flag was not
 * passed, or an exit code once the failure has been reported.
 *
 * Every git failure is fatal rather than a fall-back to a full scan: a user
 * who asked for a diff and silently received every file would read the extra
 * findings as a regression, and one who received *none* would read a false
 * green.
 *
 * git runs in the project root, so the change set comes back keyed the same
 * way discovery names its files and `Position.file` records them — one
 * relative vocabulary across the whole scan.
 */
export async function resolveChanges(
  diffBase: string | undefined,
  projectRoot: string,
  io: CliIO,
): Promise<ChangeSet | number | undefined> {
  if (diffBase === undefined) {
    return undefined;
  }
  const extracted = await extractChangeSet(diffBase, gitRunner(projectRoot));
  if (extracted.isErr()) {
    io.stderr(`argus: --diff ${diffBase}: ${extracted.error}\n`);
    return EXIT_ERROR;
  }
  return extracted.value;
}

/**
 * Whether any discovered file sits above the root its path is expressed
 * against, which `--diff` cannot represent.
 *
 * A `../` path can never be a change-set key, so every file would be narrowed
 * away and the scan would report "nothing changed" — a false green
 * (independent review, #50 LOW-1). Reachable only when nothing on the path's
 * ancestry holds a config, so the project root falls back to the cwd.
 */
export function escapesProjectRoot(files: readonly DiscoveredFile[]): boolean {
  return files.some((file) => file.relativePath.startsWith("../"));
}

/**
 * The discovered files a scan will actually read, narrowed to the change set
 * under `--diff`, with an empty result explained on stderr.
 *
 * An empty list is not an error: a path with nothing scannable under it is a
 * successful scan of zero files. The plan continues with it rather than
 * returning early, so stdout still carries a report — a `--format json`
 * consumer must never receive an empty stream from a scan that succeeded.
 */
export function narrowToChanges(
  discovered: readonly DiscoveredFile[],
  changes: ChangeSet | undefined,
  invocation: { readonly rawPath: string; readonly scope: ScanScope },
  io: CliIO,
): readonly DiscoveredFile[] {
  const { rawPath, scope } = invocation;
  const files =
    changes === undefined
      ? discovered
      : discovered.filter((file) => changes.has(file.relativePath));

  if (files.length === 0) {
    io.stderr(
      scope.diffBase === undefined
        ? `argus: no matching source files under ${rawPath}\n`
        : `argus: no source files under ${rawPath} changed since ${scope.diffBase}\n`,
    );
  }
  return files;
}
