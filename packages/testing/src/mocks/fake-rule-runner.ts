import { err, ok, type Result } from "neverthrow";
import type { RuleExecutionError, RuleRunInput, RuleRunnerPort, Violation } from "@argus/core";

const NO_VIOLATIONS: readonly Violation[] = Object.freeze([]);

/**
 * Canned-response `RuleRunnerPort`: returns the violations set via
 * `respondWith` (empty until then) and records every input in `runs` so
 * tests can assert what was dispatched. Failure injection via
 * `failNextWith`.
 */
export class FakeRuleRunner implements RuleRunnerPort {
  private violations: readonly Violation[] = NO_VIOLATIONS;
  private readonly recorded: RuleRunInput[] = [];
  private nextError: RuleExecutionError | undefined;

  get runs(): readonly RuleRunInput[] {
    return this.recorded;
  }

  respondWith(violations: readonly Violation[]): void {
    this.violations = Object.freeze([...violations]);
  }

  failNextWith(error: RuleExecutionError): void {
    this.nextError = error;
  }

  run(input: RuleRunInput): Promise<Result<readonly Violation[], RuleExecutionError>> {
    this.recorded.push(input);
    const error = this.nextError;
    this.nextError = undefined;
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    return Promise.resolve(ok(this.violations));
  }
}
