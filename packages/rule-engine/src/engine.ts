import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { RuleExecutionError, ValidationError } from "@argus/core";
import type { Rule, RuleId, RuleRunInput, RuleRunnerPort, Violation } from "@argus/core";
import {
  buildViolations,
  createContext,
  isPromise,
  registerListeners,
  silence,
  toExecutionError,
  walkAndCollect,
} from "./handlers.js";
import type { CapturedReport, DispatchTables } from "./handlers.js";
import type { RuleModule } from "./types.js";

/**
 * `RuleRunnerPort` implementation: walks the AST **once** per file and
 * dispatches each node to the rules subscribed to its type. Rules see only
 * a frozen {@link RuleContext} and report through it; the engine assigns
 * the activation's severity, the file's layer, and a deterministic id to
 * every violation.
 *
 * Failure policy: the engine never throws — any rule crash (a throwing
 * listener or `create`, an invalid selector, an invalid report, an
 * unregistered or Promise-returning rule) fails that file's run with a
 * `RuleExecutionError` attributed to the offending rule. Skipping a broken
 * rule silently would violate "no silent suppression"; resilience across
 * files is the `Runner`'s job.
 */
export class Engine implements RuleRunnerPort {
  private readonly modules = new Map<RuleId, RuleModule>();

  /** Static definitions of every registered rule, in registration order. */
  get rules(): readonly Rule[] {
    return Object.freeze([...this.modules.values()].map((module) => module.rule));
  }

  /** Registers a rule module. Rejects a second module with the same rule id. */
  register(module: RuleModule): Result<undefined, ValidationError> {
    if (this.modules.has(module.rule.id)) {
      return err(
        new ValidationError("Engine", [
          { path: "rule.id", message: `duplicate rule "${module.rule.id}"` },
        ]),
      );
    }
    this.modules.set(module.rule.id, module);
    return ok(undefined);
  }

  run(input: RuleRunInput): Promise<Result<readonly Violation[], RuleExecutionError>> {
    try {
      return Promise.resolve(this.runSync(input));
    } catch (cause) {
      // Defensive, uncovered: runSync guards every rule-reachable path
      // internally; this catch makes "never throws" structural rather than
      // dependent on that exhaustiveness (review finding, #24).
      return Promise.resolve(err(toExecutionError(cause, undefined)));
    }
  }

  /** Compiles every active rule's listeners into shared dispatch tables. */
  private compileHandlers(
    input: RuleRunInput,
    reports: CapturedReport[],
  ): Result<DispatchTables, RuleExecutionError> {
    const tables: DispatchTables = {
      enterByType: new Map(),
      exitByType: new Map(),
      enterAll: [],
      exitAll: [],
    };
    for (const activation of input.activations) {
      if (activation.severity === "off") {
        continue;
      }
      const module = this.modules.get(activation.ruleId);
      if (module === undefined) {
        return err(new RuleExecutionError("is not registered with the engine", activation.ruleId));
      }
      const severity = activation.severity;
      const context = createContext(input, activation, (report) => {
        reports.push({
          ruleId: activation.ruleId,
          severity,
          message: report.message,
          position: report.position,
        });
      });
      try {
        const listeners = module.create(context);
        if (isPromise(listeners)) {
          silence(listeners);
          return err(
            new RuleExecutionError(
              "create() returned a Promise — rule modules must be synchronous",
              activation.ruleId,
            ),
          );
        }
        const registered = registerListeners(activation.ruleId, listeners, tables);
        if (registered.isErr()) {
          return err(registered.error);
        }
      } catch (cause) {
        return err(toExecutionError(cause, activation.ruleId));
      }
    }
    return ok(tables);
  }

  private runSync(input: RuleRunInput): Result<readonly Violation[], RuleExecutionError> {
    const reports: CapturedReport[] = [];
    const compiled = this.compileHandlers(input, reports);
    if (compiled.isErr()) {
      return err(compiled.error);
    }
    const walked = walkAndCollect(input, compiled.value);
    if (walked.isErr()) {
      return err(walked.error);
    }
    return buildViolations(input, reports);
  }
}
