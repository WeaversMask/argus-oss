import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PrettierFormatter } from "@argus/adapters-prettier";
import { TreeSitterAstParser } from "@argus/ast";
import type { FilePath, FormatterPort, RuleRunInput, Violation } from "@argus/core";
import { Runner } from "@argus/rule-engine";
import type { FileRunFailure } from "@argus/rule-engine";
import { applyFixes } from "./apply-fixes.js";
import { unifiedDiff } from "./diff.js";
import { EXIT_ERROR, EXIT_OK, EXIT_VIOLATIONS } from "./exit-codes.js";
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

    const outcome = await fixAllFiles(
      parsed.inputs,
      summary.violations,
      formatter,
      plan.projectRoot,
      options,
      io,
    );
    if (typeof outcome === "number") {
      return outcome;
    }

    const remaining = summary.violations.filter((v) => !outcome.resolvedIds.has(v.id)).length;
    io.stdout(
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

/** Runs `fixFile` over every parsed input that has at least one violation. */
async function fixAllFiles(
  inputs: readonly RuleRunInput[],
  violations: readonly Violation[],
  formatter: FormatterPort,
  projectRoot: string,
  options: FixOptions,
  io: CliIO,
): Promise<FixAllOutcome | number> {
  const violationsByFile = groupByFile(violations);
  const resolvedIds = new Set<string>();
  let filesChanged = 0;

  for (const input of inputs) {
    const violationsForFile = violationsByFile.get(input.parsed.file);
    if (violationsForFile === undefined) {
      continue;
    }
    const result = await fixFile(
      input.parsed.file,
      input.parsed.root.text,
      violationsForFile,
      formatter,
      projectRoot,
      options,
      io,
    );
    if (result === undefined) {
      return EXIT_ERROR;
    }
    for (const id of result.resolvedIds) {
      resolvedIds.add(id);
    }
    if (result.changed) {
      filesChanged += 1;
    }
  }

  return { resolvedIds, filesChanged };
}

interface FileFixResult {
  readonly resolvedIds: ReadonlySet<string>;
  readonly changed: boolean;
}

/**
 * Applies and formats one file's fixes; writes it (or diffs it, under
 * `--dry-run`) if anything actually changed. `undefined` only when Prettier
 * itself failed — the one error this function can't route around.
 */
async function fixFile(
  file: FilePath,
  originalSource: string,
  violationsForFile: readonly Violation[],
  formatter: FormatterPort,
  projectRoot: string,
  options: FixOptions,
  io: CliIO,
): Promise<FileFixResult | undefined> {
  const spliced = applyFixes(originalSource, violationsForFile);
  if (spliced.resolvedViolationIds.size === 0) {
    return { resolvedIds: spliced.resolvedViolationIds, changed: false }; // nothing here could be fixed
  }

  const formatted = await formatter.format(spliced.result, file);
  if (formatted.isErr()) {
    io.stderr(`argus: failed to format ${file}: ${formatted.error.message}\n`);
    return undefined;
  }

  const finalSource = formatted.value;
  if (finalSource === originalSource) {
    return { resolvedIds: spliced.resolvedViolationIds, changed: false }; // fix + format round-tripped to a no-op
  }

  if (options.dryRun) {
    io.stdout(unifiedDiff(file, originalSource, finalSource));
  } else {
    await writeFile(path.resolve(projectRoot, file), finalSource, "utf8");
  }
  return { resolvedIds: spliced.resolvedViolationIds, changed: true };
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
  const tail = remaining > 0 ? `; ${plural(remaining, "violation")} remain` : "";
  return `${head}${tail}\n`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
