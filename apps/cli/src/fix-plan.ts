import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { FilePath, FormatterPort, Language, RuleActivation, Violation } from "@argus/core";
import { applyFixes } from "./apply-fixes.js";
import { unifiedDiff } from "./diff.js";
import type { CliIO } from "./io.js";
import type { ParseOutcome } from "./scan.js";

/**
 * The two phases of a mutating run: compute every edit, then flush them.
 *
 * Kept apart from `fix.ts`'s orchestration because the split is the safety
 * property, not an implementation detail — "nothing is written until every
 * edit is computed" is only true while these stay two separate passes over
 * the file list (ADR-0006 decision 8).
 */

/** One file whose fixed text is computed and ready to write or diff. */
export interface PlannedFix {
  readonly file: FilePath;
  readonly language: Language;
  readonly before: string;
  readonly after: string;
  readonly resolvedIds: ReadonlySet<string>;
  readonly activations: readonly RuleActivation[];
}

/** What phase two actually managed to do, and the basis for the exit code. */
export interface FixAllOutcome {
  readonly resolvedIds: ReadonlySet<string>;
  readonly filesChanged: number;
  /** Files whose fixed text could not be written. Each has already been reported. */
  readonly writeFailures: number;
  /**
   * The entries that actually reached disk (every planned entry under
   * `--dry-run`). What `countRemaining` measures against: a file whose write
   * failed is unchanged on disk, so its original violations all still stand.
   */
  readonly committed: readonly PlannedFix[];
}

/**
 * Phase one: compute every file's fixed text, touching no disk. Returns
 * `undefined` once any file fails to format — nothing has been written at
 * that point, so the caller can abort cleanly.
 */
export async function planFixes(
  parsed: ParseOutcome,
  violations: readonly Violation[],
  formatter: FormatterPort,
  io: CliIO,
): Promise<PlannedFix[] | undefined> {
  const violationsByFile = groupByFile(violations);
  const planned: PlannedFix[] = [];

  for (const input of parsed.inputs) {
    const file = input.parsed.file;
    const violationsForFile = violationsByFile.get(file);
    if (violationsForFile === undefined) {
      continue;
    }
    // The exact bytes read from disk — never `input.parsed.root.text`, which
    // omits leading trivia and would shift every offset (see ParseOutcome).
    const before = parsed.sources.get(file);
    if (before === undefined) {
      // Unreachable: parseAll records a source for every input it emits.
      io.stderr(`argus: internal error: no source recorded for ${file}\n`);
      return undefined;
    }

    const spliced = applyFixes(before, violationsForFile);
    if (spliced.resolvedViolationIds.size === 0) {
      continue; // nothing in this file could be fixed
    }

    const formatted = await formatter.format(spliced.result, file);
    if (formatted.isErr()) {
      io.stderr(`argus: failed to format ${file}: ${formatted.error.message}\n`);
      return undefined;
    }
    if (formatted.value === before) {
      continue; // fix + format round-tripped to a no-op
    }

    planned.push({
      file,
      language: input.parsed.language,
      before,
      after: formatted.value,
      resolvedIds: spliced.resolvedViolationIds,
      activations: input.activations,
    });
  }

  return planned;
}

/**
 * Phase two: write every planned fix (or, under `--dry-run`, diff it).
 *
 * Phase one removes every *computable* reason a later file can fail, but not
 * the environmental ones — a read-only file, a permissions change, a full
 * disk. Those surface here, one file at a time, and are reported in the CLI's
 * own voice rather than escaping to `main`'s last-resort `unexpected error:`
 * handler, which produced a bare stack-trace message and skipped the summary
 * entirely (follow-up review MEDIUM-1).
 *
 * A failed write does not abort the remaining ones: the run is already
 * non-atomic at this point, so stopping early would strand *more* files in the
 * unfixed state without making the outcome any cleaner to describe. Every
 * failure is counted, the summary still reports what did land, and the caller
 * turns any failure into exit 2.
 */
export async function commitFixes(
  planned: readonly PlannedFix[],
  projectRoot: string,
  dryRun: boolean,
  io: CliIO,
): Promise<FixAllOutcome> {
  const resolvedIds = new Set<string>();
  const committed: PlannedFix[] = [];
  let writeFailures = 0;

  for (const entry of planned) {
    if (dryRun) {
      io.stdout(unifiedDiff(entry.file, entry.before, entry.after));
    } else {
      try {
        await writeFile(path.resolve(projectRoot, entry.file), entry.after, "utf8");
      } catch (cause) {
        io.stderr(`argus: failed to write ${entry.file}: ${message(cause)}\n`);
        writeFailures++;
        continue;
      }
    }
    committed.push(entry);
    for (const id of entry.resolvedIds) {
      resolvedIds.add(id);
    }
  }

  return { resolvedIds, filesChanged: committed.length, writeFailures, committed };
}

function groupByFile(violations: readonly Violation[]): Map<FilePath, Violation[]> {
  const byFile = new Map<FilePath, Violation[]>();
  for (const violation of violations) {
    const existing = byFile.get(violation.position.file);
    if (existing === undefined) {
      byFile.set(violation.position.file, [violation]);
    } else {
      existing.push(violation);
    }
  }
  return byFile;
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
