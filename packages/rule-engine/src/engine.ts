import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { RuleExecutionError, ValidationError, violation, violationId } from "@argus/core";
import type {
  AstNode,
  Position,
  Rule,
  RuleActivation,
  RuleId,
  RuleRunInput,
  RuleRunnerPort,
  Severity,
  Violation,
} from "@argus/core";
import { deterministicViolationId } from "./violation-id.js";
import { walk } from "./walk.js";
import type { RuleContext, RuleListener, RuleModule, RuleReport } from "./types.js";

/** A listener bound to its owning rule, so crashes are attributable. */
interface Handler {
  readonly ruleId: RuleId;
  readonly listener: RuleListener;
}

/** A report as captured during the walk, before validation into a `Violation`. */
interface CapturedReport {
  readonly ruleId: RuleId;
  readonly severity: Severity;
  readonly message: string;
  readonly position: Position;
}

const WILDCARD = "*";

function parseSelector(
  selector: string,
): { readonly nodeType: string; readonly phase: "enter" | "exit" } | undefined {
  const colon = selector.indexOf(":");
  if (colon === -1) {
    return selector.length > 0 ? { nodeType: selector, phase: "enter" } : undefined;
  }
  const nodeType = selector.slice(0, colon);
  if (nodeType.length === 0 || selector.slice(colon + 1) !== "exit") {
    return undefined;
  }
  return { nodeType, phase: "exit" };
}

/**
 * Detects the async-misuse failure mode: an `async` listener or `create`
 * returns a native `Promise`. Deliberately `instanceof`, not a duck-typed
 * thenable check — a listeners map with a literal `"then"` node-type key
 * (a real keyword in some grammars) must not be mistaken for a Promise
 * (review finding, #24).
 */
function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise;
}

/** Swallow a detected stray Promise so its later rejection cannot surface as an unhandled rejection. */
function silence(promise: Promise<unknown>): void {
  promise.catch(() => undefined);
}

/** Wraps a thrown value as an attributed `RuleExecutionError`. */
function toExecutionError(cause: unknown, ruleId: RuleId | undefined): RuleExecutionError {
  if (cause instanceof Error) {
    return new RuleExecutionError(`threw ${cause.name}: ${cause.message}`, ruleId);
  }
  if (typeof cause === "string") {
    return new RuleExecutionError(`threw: ${cause}`, ruleId);
  }
  return new RuleExecutionError("threw a non-Error value", ruleId);
}

function createContext(
  input: RuleRunInput,
  activation: RuleActivation,
  report: (report: RuleReport) => void,
): RuleContext {
  return Object.freeze({
    file: input.parsed.file,
    language: input.parsed.language,
    ...(input.layer !== undefined ? { layer: input.layer } : {}),
    options: Object.freeze({ ...activation.options }),
    report,
  });
}

/** Source order: start position first, ties by rule id, then end position. */
function compareViolations(a: Violation, b: Violation): number {
  if (a.position.startLine !== b.position.startLine) {
    return a.position.startLine - b.position.startLine;
  }
  if (a.position.startColumn !== b.position.startColumn) {
    return a.position.startColumn - b.position.startColumn;
  }
  if (a.ruleId !== b.ruleId) {
    return a.ruleId < b.ruleId ? -1 : 1;
  }
  if (a.position.endLine !== b.position.endLine) {
    return a.position.endLine - b.position.endLine;
  }
  return a.position.endColumn - b.position.endColumn;
}

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

  private runSync(input: RuleRunInput): Result<readonly Violation[], RuleExecutionError> {
    const reports: CapturedReport[] = [];
    const enterByType = new Map<string, Handler[]>();
    const exitByType = new Map<string, Handler[]>();
    const enterAll: Handler[] = [];
    const exitAll: Handler[] = [];

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
        for (const [selector, listener] of Object.entries(listeners)) {
          const parsed = parseSelector(selector);
          if (parsed === undefined) {
            return err(
              new RuleExecutionError(
                `registered an invalid listener selector "${selector}" — expected "<nodeType>" or "<nodeType>:exit"`,
                activation.ruleId,
              ),
            );
          }
          const handler: Handler = { ruleId: activation.ruleId, listener };
          if (parsed.nodeType === WILDCARD) {
            (parsed.phase === "enter" ? enterAll : exitAll).push(handler);
          } else {
            const byType = parsed.phase === "enter" ? enterByType : exitByType;
            const existing = byType.get(parsed.nodeType);
            if (existing === undefined) {
              byType.set(parsed.nodeType, [handler]);
            } else {
              existing.push(handler);
            }
          }
        }
      } catch (cause) {
        return err(toExecutionError(cause, activation.ruleId));
      }
    }

    // The single walk. `currentRule` tracks the handler being dispatched so
    // a throw anywhere inside (including hostile lazy getters on the nodes
    // a listener touches) is attributed; between handlers it is reset so
    // walk-internal failures blame the run, not the last rule that ran.
    let currentRule: RuleId | undefined;
    const invoke = (handler: Handler, node: AstNode): void => {
      currentRule = handler.ruleId;
      const returned = handler.listener(node) as unknown;
      if (isPromise(returned)) {
        silence(returned);
        throw new RuleExecutionError(
          "listener returned a Promise — rule listeners must be synchronous",
          handler.ruleId,
        );
      }
      currentRule = undefined;
    };
    const dispatch = (byType: Map<string, Handler[]>, all: readonly Handler[]) => {
      return (node: AstNode): void => {
        const typed = byType.get(node.nodeType);
        if (typed !== undefined) {
          for (const handler of typed) {
            invoke(handler, node);
          }
        }
        for (const handler of all) {
          invoke(handler, node);
        }
      };
    };
    try {
      walk(input.parsed.root, dispatch(enterByType, enterAll), dispatch(exitByType, exitAll));
    } catch (cause) {
      return err(
        cause instanceof RuleExecutionError ? cause : toExecutionError(cause, currentRule),
      );
    }

    // Validate captured reports into Violations. Factories return Results,
    // but a hostile Position getter could still throw inside them — the
    // try keeps "never throws" honest and attributes to the report's rule.
    const violations: Violation[] = [];
    let attributed: RuleId | undefined;
    try {
      for (const [ordinal, captured] of reports.entries()) {
        attributed = captured.ruleId;
        if (captured.position.file !== input.parsed.file) {
          return err(
            new RuleExecutionError(
              `reported a position in "${captured.position.file}" while running on "${input.parsed.file}"`,
              captured.ruleId,
            ),
          );
        }
        const id = violationId(
          deterministicViolationId(captured.ruleId, captured.position, ordinal),
        );
        if (id.isErr()) {
          // Unreachable by construction: the generated id is URI-encoded
          // path + validated rule id + digits, all inside the opaque-id
          // charset. Kept so a future charset drift fails loudly.
          return err(
            new RuleExecutionError(
              "internal: generated violation id failed validation",
              captured.ruleId,
            ),
          );
        }
        const built = violation({
          id: id.value,
          ruleId: captured.ruleId,
          severity: captured.severity,
          message: captured.message,
          position: captured.position,
          ...(input.layer !== undefined ? { layer: input.layer } : {}),
        });
        if (built.isErr()) {
          return err(
            new RuleExecutionError(
              `reported an invalid violation — ${built.error.message}`,
              captured.ruleId,
            ),
          );
        }
        violations.push(built.value);
      }
    } catch (cause) {
      return err(toExecutionError(cause, attributed));
    }

    violations.sort(compareViolations);
    return ok(Object.freeze(violations));
  }
}
