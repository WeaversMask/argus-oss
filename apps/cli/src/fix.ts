import { PrettierFormatter } from "@argus/adapters-prettier";
import { TreeSitterAstParser } from "@argus/ast";
import type { AstParserPort, RuleRunnerPort, Violation } from "@argus/core";
import { Runner } from "@argus/rule-engine";
import type { FileRunFailure } from "@argus/rule-engine";
import { EXIT_ERROR, EXIT_OK, EXIT_VIOLATIONS } from "./exit-codes.js";
import { commitFixes, planFixes } from "./fix-plan.js";
import type { FixAllOutcome, PlannedFix } from "./fix-plan.js";
import type { CliIO } from "./io.js";
import type { ScanFailure } from "./report.js";
import { buildEngine, parseAll, planScan } from "./scan.js";

/** Invocation-level presentation choice for `fix`. */
export interface FixOptions {
  /** Show diffs on stdout without touching disk. */
  readonly dryRun: boolean;
}

/**
 * The `fix` command: config → discover → parse → engine → apply → format →
 * write (or, under `--dry-run`, diff instead of write).
 *
 * Mirrors `check`'s path/config resolution exactly (`planScan`) so the two
 * commands always agree on what "this project" means. Per file: violations
 * carrying a `fix` are spliced in via `applyFixes` (magic-string, never
 * touching a byte outside an accepted range), then the whole file is run
 * through Prettier — the "delegated to Prettier for formatting rules" half
 * of the task spec, applied as a finishing pass over anything this command
 * touched rather than a repo-wide reformat. A file with no fixable
 * violations is never opened by the formatter at all.
 *
 * Exit codes mirror `check`'s 0/1/2, but `--dry-run` and a real run answer
 * different questions with the `0`/`1` split — conflating them would make
 * one of the two flows useless for CI:
 * - **Real run:** `0` — no violations remain once this run is done (nothing
 *   needed fixing, or everything fixable got fixed); `1` — violations
 *   remain (unfixable rules, or fixes skipped for an unsafe/conflicting
 *   range). A *state* observation, extending `check`'s own "violations
 *   exist" contract to "after I fixed what I could".
 * - **`--dry-run`:** `0` — fix would change nothing; `1` — fix would change
 *   at least one file. An *action-preview* observation (same idiom as
 *   `prettier --check`/`terraform plan`), answering "did you forget to run
 *   `argus fix`" — not "would everything end up clean", which dry-run
 *   cannot promise without writing anything.
 *
 * `2` — operational error, in both modes: every case `check` has, plus a file
 * whose fixed text could not be written. Phase one guarantees nothing is
 * written when the *analysis* can't complete; a write that fails for an
 * environmental reason (read-only file, full disk) is reported per file and
 * leaves the run partially applied, which `2` reports as an incomplete run
 * rather than letting a violation count imply the repo is in a known state.
 */
export async function runFix(rawPath: string, options: FixOptions, io: CliIO): Promise<number> {
  const plan = await planScan(rawPath, io);
  if (typeof plan === "number") {
    return plan;
  }

  const parser = new TreeSitterAstParser();
  const formatter = new PrettierFormatter(plan.projectRoot);
  try {
    const parsed = await parseAll(plan.files, parser, plan.activations);
    const engine = buildEngine(io);
    if (engine === undefined) {
      return EXIT_ERROR;
    }

    const summary = await new Runner(engine).runAll(parsed.inputs);
    if (reportFailures(parsed.failures, summary.failures, io)) {
      return EXIT_ERROR;
    }

    // Two phases, deliberately: every edit is computed and every formatter
    // call made BEFORE anything touches disk. Writing as we went left files
    // already rewritten when a later file failed, contradicting the documented
    // "nothing is written when a scan can't complete" (review #39 HIGH-2).
    const planned = await planFixes(parsed, summary.violations, formatter, io);
    if (planned === undefined) {
      return EXIT_ERROR;
    }

    const outcome = await commitFixes(planned, plan.projectRoot, options.dryRun, io);
    return await reportOutcome(outcome, summary.violations, options, { parser, engine, io });
  } finally {
    parser.dispose();
  }
}

/** What `reportOutcome` needs to re-measure the tree it just changed. */
interface Rerun {
  readonly parser: AstParserPort;
  readonly engine: RuleRunnerPort;
  readonly io: CliIO;
}

/** Summarises a finished run on stderr and maps it onto the exit-code contract. */
async function reportOutcome(
  outcome: FixAllOutcome,
  violations: readonly Violation[],
  options: FixOptions,
  { parser, engine, io }: Rerun,
): Promise<number> {
  // Re-derived from the fixed text, never from "how many splices did we
  // attempt". A fixer that produces a non-resolving edit would otherwise
  // let exit 0 assert a clean repo it never checked (review #39 MEDIUM-5).
  // Measured against what actually reached disk, so a file whose write
  // failed keeps its violations rather than being credited as fixed.
  const remaining = await countRemaining(outcome.committed, violations, parser, engine);
  io.stderr(summaryLine(outcome.resolvedIds.size, outcome.filesChanged, remaining, options.dryRun));

  // A write that failed leaves the run partially applied — the summary above
  // says what did land, and the exit code reports an incomplete run rather
  // than a violation count (follow-up review MEDIUM-1).
  if (outcome.writeFailures > 0) {
    return EXIT_ERROR;
  }

  // Dry-run answers "would anything change" (prettier --check's idiom);
  // a real run answers "do violations remain" (check's own idiom, extended
  // to "after fixing what I could"). See runFix's doc comment — conflating
  // the two would make one of the two flows useless for CI.
  return (options.dryRun ? outcome.filesChanged > 0 : remaining > 0) ? EXIT_VIOLATIONS : EXIT_OK;
}

/** Announces every parse/rule failure and reports whether there were any. */
function reportFailures(
  parseFailures: readonly ScanFailure[],
  runFailures: readonly FileRunFailure[],
  io: CliIO,
): boolean {
  const failures = [
    ...parseFailures,
    ...runFailures.map((failure) => ({ file: failure.file, message: failure.error.message })),
  ];
  for (const failure of failures) {
    io.stderr(`argus: failed to analyse ${failure.file}: ${failure.message}\n`);
  }
  return failures.length > 0;
}

/**
 * Violations still outstanding once this run's edits are applied: every
 * violation in a file nothing touched, plus whatever a fresh run over each
 * fixed file's text still reports.
 *
 * Measured, not inferred. Counting "violations whose fix we spliced" assumes
 * every splice resolved what it claimed to, which is exactly the assumption
 * that let a corrupting edit report success (review #39 HIGH-1/MEDIUM-5). A
 * file that no longer parses, or that fails its re-run, keeps its original
 * violation count rather than silently reporting zero.
 */
async function countRemaining(
  committed: readonly PlannedFix[],
  violations: readonly Violation[],
  parser: AstParserPort,
  engine: RuleRunnerPort,
): Promise<number> {
  const changed = new Set(committed.map((entry) => entry.file));
  let remaining = violations.filter((v) => !changed.has(v.position.file)).length;

  for (const entry of committed) {
    const before = violations.filter((v) => v.position.file === entry.file).length;
    const reparsed = await parser.parse(entry.file, entry.after, entry.language);
    if (reparsed.isErr()) {
      remaining += before;
      continue;
    }
    const rerun = await engine.run({ parsed: reparsed.value, activations: entry.activations });
    remaining += rerun.isOk() ? rerun.value.length : before;
  }

  return remaining;
}

function summaryLine(
  fixedCount: number,
  fileCount: number,
  remaining: number,
  dryRun: boolean,
): string {
  const verb = dryRun ? "would fix" : "fixed";
  const head =
    fixedCount === 0
      ? "argus: no fixable violations found"
      : `argus: ${verb} ${plural(fixedCount, "violation")} across ${plural(fileCount, "file")}`;
  const tail =
    remaining > 0
      ? `; ${plural(remaining, "violation")} ${remaining === 1 ? "remains" : "remain"}`
      : "";
  return `${head}${tail}\n`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
