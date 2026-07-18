import type {
  FilePath,
  RuleExecutionError,
  RuleRunInput,
  RuleRunnerPort,
  Violation,
} from "@argus/core";

/** One file whose rule run failed, with the attributed error. */
export interface FileRunFailure {
  readonly file: FilePath;
  readonly error: RuleExecutionError;
}

/** Aggregate outcome of a multi-file run. Frozen. */
export interface RunSummary {
  /**
   * Violations of every file that ran cleanly, in input-file order; within
   * a file, in source order (the port's ordering contract).
   */
  readonly violations: readonly Violation[];
  /** Files whose run failed, in input-file order. Empty on a clean run. */
  readonly failures: readonly FileRunFailure[];
}

/**
 * Orchestrates per-file rule execution and aggregates violations
 * (P1-04). Where the `Engine` fails a file's run on the first rule crash,
 * the `Runner` skips-and-collects across files: one broken file (or one
 * rule crashing on one file) must not sink a whole scan, and nothing is
 * dropped silently — every failed file travels in `failures`.
 *
 * Files run sequentially in input order, keeping the aggregate
 * deterministic. Composes any `RuleRunnerPort` and trusts its contract
 * (never throws, deterministic, source-ordered).
 */
export class Runner {
  private readonly engine: RuleRunnerPort;

  constructor(engine: RuleRunnerPort) {
    this.engine = engine;
  }

  async runAll(inputs: readonly RuleRunInput[]): Promise<RunSummary> {
    const violations: Violation[] = [];
    const failures: FileRunFailure[] = [];
    for (const input of inputs) {
      const result = await this.engine.run(input);
      if (result.isOk()) {
        violations.push(...result.value);
      } else {
        failures.push(Object.freeze({ file: input.parsed.file, error: result.error }));
      }
    }
    return Object.freeze({
      violations: Object.freeze(violations),
      failures: Object.freeze(failures),
    });
  }
}
