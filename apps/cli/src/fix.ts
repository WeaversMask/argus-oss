import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PrettierFormatter } from "@argus/adapters-prettier";
import { TreeSitterAstParser } from "@argus/ast";
import type {
  AstParserPort,
  FilePath,
  FormatterPort,
  Language,
  RuleActivation,
  RuleRunnerPort,
  Violation,
} from "@argus/core";
import { Runner } from "@argus/rule-engine";
import type { FileRunFailure } from "@argus/rule-engine";
import { applyFixes } from "./apply-fixes.js";
import { unifiedDiff } from "./diff.js";
import { EXIT_ERROR, EXIT_OK, EXIT_VIOLATIONS } from "./exit-codes.js";
import type { CliIO } from "./io.js";
import type { ScanFailure } from "./report.js";
import { buildEngine, parseAll, planScan } from "./scan.js";
import type { ParseOutcome } from "./scan.js";

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
 * `2` — operational error, same cases as `check`, in both modes.
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

    const outcome = await commitFixes(planned, plan.projectRoot, options, io);

    // Re-derived from the fixed text, never from "how many splices did we
    // attempt". A fixer that produces a non-resolving edit would otherwise
    // let exit 0 assert a clean repo it never checked (review #39 MEDIUM-5).
    const remaining = await countRemaining(planned, summary.violations, parser, engine);
    io.stderr(
      summaryLine(outcome.resolvedIds.size, outcome.filesChanged, remaining, options.dryRun),
    );

    // Dry-run answers "would anything change" (prettier --check's idiom);
    // a real run answers "do violations remain" (check's own idiom,
    // extended to "after fixing what I could"). See the doc comment above —
    // conflating the two would make one of the two flows useless for CI.
    return (options.dryRun ? outcome.filesChanged > 0 : remaining > 0) ? EXIT_VIOLATIONS : EXIT_OK;
  } finally {
    parser.dispose();
  }
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

interface FixAllOutcome {
  readonly resolvedIds: ReadonlySet<string>;
  readonly filesChanged: number;
}

/** One file whose fixed text is computed and ready to write or diff. */
interface PlannedFix {
  readonly file: FilePath;
  readonly language: Language;
  readonly before: string;
  readonly after: string;
  readonly resolvedIds: ReadonlySet<string>;
  readonly activations: readonly RuleActivation[];
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
  planned: readonly PlannedFix[],
  violations: readonly Violation[],
  parser: AstParserPort,
  engine: RuleRunnerPort,
): Promise<number> {
  const changed = new Set(planned.map((entry) => entry.file));
  let remaining = violations.filter((v) => !changed.has(v.position.file)).length;

  for (const entry of planned) {
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

/**
 * Phase one: compute every file's fixed text, touching no disk. Returns
 * `undefined` once any file fails to format — nothing has been written at
 * that point, so the caller can abort cleanly.
 */
async function planFixes(
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

/** Phase two: write every planned fix (or, under `--dry-run`, diff it). */
async function commitFixes(
  planned: readonly PlannedFix[],
  projectRoot: string,
  options: FixOptions,
  io: CliIO,
): Promise<FixAllOutcome> {
  const resolvedIds = new Set<string>();

  for (const entry of planned) {
    if (options.dryRun) {
      io.stdout(unifiedDiff(entry.file, entry.before, entry.after));
    } else {
      await writeFile(path.resolve(projectRoot, entry.file), entry.after, "utf8");
    }
    for (const id of entry.resolvedIds) {
      resolvedIds.add(id);
    }
  }

  return { resolvedIds, filesChanged: planned.length };
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
