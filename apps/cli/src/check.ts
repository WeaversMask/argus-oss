import { TreeSitterAstParser } from "@argus/ast";
import { filterToChangedLines } from "@argus/orchestrator";
import { Runner } from "@argus/rule-engine";
import { EXIT_ERROR, EXIT_OK, EXIT_VIOLATIONS } from "./exit-codes.js";
import { renderReport } from "./formatters/render.js";
import type { OutputFormat } from "./formatters/render.js";
import type { CliIO } from "./io.js";
import type { ScanReport } from "./report.js";
import { buildEngine, parseAll, planScan } from "./scan.js";

/** Invocation-level choices for `check`. */
export interface CheckOptions {
  /** `false` when `--no-color` was passed; `true` leaves the decision to the environment. */
  readonly colour: boolean;
  /** What `--format` selected. Console output for humans, JSON for everything else. */
  readonly format: OutputFormat;
  /** `--diff <ref>`: report only what changed since this ref. */
  readonly diffBase?: string | undefined;
}

/**
 * The `check` command: config → discover → parse → engine → report.
 *
 * Composes the real pipeline against the ten built-in rules and returns the
 * process exit code. A configuration failure, missing path, unknown configured
 * rule, or any file that could not be parsed/analysed is an operational error
 * (`2`); a clean scan with findings is `1`; a clean scan with none is `0`.
 *
 * Suppressions and layer classification are not wired: config v1 exposes
 * neither section (deferred, P2/P3-01), so there is nothing to feed
 * `matchingSuppression`/`classifyLayer` yet.
 */
export async function runCheck(rawPath: string, options: CheckOptions, io: CliIO): Promise<number> {
  const plan = await planScan(rawPath, io, { diffBase: options.diffBase });
  if (typeof plan === "number") {
    return plan;
  }

  // One parser instance per process: the grammar wasm it loads cannot be freed
  // (see @argus/ast), so instance churn leaks. Disposed once the scan is done.
  const parser = new TreeSitterAstParser();
  try {
    const parsed = await parseAll(plan.files, parser, plan.activations);
    const engine = buildEngine(io);
    if (engine === undefined) {
      return EXIT_ERROR;
    }

    const summary = await new Runner(engine).runAll(parsed.inputs);
    const failures = [
      ...parsed.failures,
      ...summary.failures.map((failure) => ({
        file: failure.file,
        message: failure.error.message,
      })),
    ];

    // Under `--diff` the file list is already narrowed, but each of those
    // files was still analysed whole — so a violation that predates the
    // change is reported unless the lines are narrowed too.
    const violations =
      plan.changes === undefined
        ? summary.violations
        : filterToChangedLines(summary.violations, plan.changes);

    for (const failure of failures) {
      io.stderr(`argus: failed to analyse ${failure.file}: ${failure.message}\n`);
    }
    emit({ violations, failures, filesScanned: plan.files.length }, options, io);

    if (failures.length > 0) {
      return EXIT_ERROR;
    }
    return violations.length > 0 ? EXIT_VIOLATIONS : EXIT_OK;
  } finally {
    parser.dispose();
  }
}

/**
 * Writes the report to stdout in the requested format. Failures are also
 * announced line by line on stderr, so stdout stays a single parseable
 * document under `--format json`.
 */
function emit(report: ScanReport, options: CheckOptions, io: CliIO): void {
  io.stdout(
    renderReport(report, {
      format: options.format,
      colour: options.colour,
      env: io.env,
      isTTY: io.isTTY,
    }),
  );
}
