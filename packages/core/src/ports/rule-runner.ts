import type { Result } from "neverthrow";
import type { LayerName } from "../domain/layer.js";
import type { RuleActivation } from "../domain/rule.js";
import type { Violation } from "../domain/violation.js";
import type { RuleExecutionError } from "../errors/rule-execution-error.js";
import type { ParsedFile } from "./ast-parser.js";

/** Everything a rule run needs for one file. */
export interface RuleRunInput {
  readonly parsed: ParsedFile;
  /** Active rules with their configured severity and options. `"off"` entries are skipped. */
  readonly activations: readonly RuleActivation[];
  /** Layer of the file, when the manifest classified it. */
  readonly layer?: LayerName;
}

/**
 * Dispatches registered rules over one parsed file (implemented by
 * `@argus/rule-engine`, P1-04).
 *
 * Contract:
 * - Never throws. A crash in a single rule must not poison the run — the
 *   implementation decides whether to skip-and-continue or fail the run,
 *   but either way the outcome travels in the `Result`.
 * - Returns violations in source order (by start position, ties by rule id).
 * - Deterministic: same input, same violations.
 * - Must not mutate the input; the engine exposes read-only views to rules
 *   (P1-04 acceptance).
 * - This is the hot path — implementations walk the AST once per file and
 *   dispatch by node type, not once per rule.
 */
export interface RuleRunnerPort {
  run(input: RuleRunInput): Promise<Result<readonly Violation[], RuleExecutionError>>;
}
