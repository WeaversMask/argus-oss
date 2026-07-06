import type { RuleId } from "../domain/rule.js";
import { DomainError } from "./domain-error.js";

/**
 * A rule run failed as a whole (`RuleRunnerPort`). Carries the offending
 * rule when the failure is attributable to one; absent `ruleId` means the
 * run itself broke before or between rules.
 *
 * Final: instances freeze themselves in the constructor — compose rather
 * than extend (see `ValidationError`).
 */
export class RuleExecutionError extends DomainError {
  override readonly name = "RuleExecutionError";
  readonly code = "core/rule-execution";
  // `declare` keeps the key truly absent when no rule is attributable —
  // a plain optional field is define'd as undefined under ES2022 semantics.
  declare readonly ruleId?: RuleId;

  constructor(message: string, ruleId?: RuleId) {
    super(ruleId === undefined ? `Rule run: ${message}` : `Rule "${ruleId}": ${message}`);
    if (ruleId !== undefined) {
      this.ruleId = ruleId;
    }
    Object.freeze(this);
  }
}
