// The dispatch/reporting machinery behind the Engine class (engine.ts):
// compiling rule listeners into node-type tables, running the single walk,
// and turning captured reports into validated Violations. Split out so the
// class itself stays a thin orchestrator over these free functions.

import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { RuleExecutionError, violation, violationId } from "@argus/core";
import type {
  AstNode,
  Fix,
  Position,
  RuleActivation,
  RuleId,
  RuleRunInput,
  Severity,
  Violation,
} from "@argus/core";
import { deterministicViolationId } from "./violation-id.js";
import { walk } from "./walk.js";
import type { RuleContext, RuleListener, RuleListeners, RuleReport } from "./types.js";

/** A listener bound to its owning rule, so crashes are attributable. */
export interface Handler {
  readonly ruleId: RuleId;
  readonly listener: RuleListener;
}

/** A report as captured during the walk, before validation into a `Violation`. */
export interface CapturedReport {
  readonly ruleId: RuleId;
  readonly severity: Severity;
  readonly message: string;
  readonly position: Position;
  readonly fix?: Fix;
}

/** Node-type dispatch tables compiled from every active rule's listeners. */
export interface DispatchTables {
  readonly enterByType: Map<string, Handler[]>;
  readonly exitByType: Map<string, Handler[]>;
  readonly enterAll: Handler[];
  readonly exitAll: Handler[];
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
export function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise;
}

/** Swallow a detected stray Promise so its later rejection cannot surface as an unhandled rejection. */
export function silence(promise: Promise<unknown>): void {
  promise.catch(() => undefined);
}

/** Wraps a thrown value as an attributed `RuleExecutionError`. */
export function toExecutionError(cause: unknown, ruleId: RuleId | undefined): RuleExecutionError {
  if (cause instanceof Error) {
    return new RuleExecutionError(`threw ${cause.name}: ${cause.message}`, ruleId);
  }
  if (typeof cause === "string") {
    return new RuleExecutionError(`threw: ${cause}`, ruleId);
  }
  return new RuleExecutionError("threw a non-Error value", ruleId);
}

/** Builds the frozen {@link RuleContext} one rule's `create()` sees for this file. */
export function createContext(
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

/** Parses and files one rule's listeners into the shared dispatch tables. */
export function registerListeners(
  ruleId: RuleId,
  listeners: RuleListeners,
  tables: DispatchTables,
): Result<undefined, RuleExecutionError> {
  for (const [selector, listener] of Object.entries(listeners)) {
    const parsed = parseSelector(selector);
    if (parsed === undefined) {
      return err(
        new RuleExecutionError(
          `registered an invalid listener selector "${selector}" — expected "<nodeType>" or "<nodeType>:exit"`,
          ruleId,
        ),
      );
    }
    const handler: Handler = { ruleId, listener };
    if (parsed.nodeType === WILDCARD) {
      (parsed.phase === "enter" ? tables.enterAll : tables.exitAll).push(handler);
    } else {
      const byType = parsed.phase === "enter" ? tables.enterByType : tables.exitByType;
      const existing = byType.get(parsed.nodeType);
      if (existing === undefined) {
        byType.set(parsed.nodeType, [handler]);
      } else {
        existing.push(handler);
      }
    }
  }
  return ok(undefined);
}

/**
 * The single walk. `currentRule` tracks the handler being dispatched so a
 * throw anywhere inside (including hostile lazy getters on the nodes a
 * listener touches) is attributed; between handlers it is reset so
 * walk-internal failures blame the run, not the last rule that ran.
 */
export function walkAndCollect(
  input: RuleRunInput,
  tables: DispatchTables,
): Result<undefined, RuleExecutionError> {
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
    walk(
      input.parsed.root,
      dispatch(tables.enterByType, tables.enterAll),
      dispatch(tables.exitByType, tables.exitAll),
    );
    return ok(undefined);
  } catch (cause) {
    return err(cause instanceof RuleExecutionError ? cause : toExecutionError(cause, currentRule));
  }
}

/**
 * A rule may only speak about the file it is running on. Returns the failure
 * when it strays, `undefined` when contained.
 *
 * The fix arm matters more than the position arm: a fix is the one report
 * field written back to disk, so a cross-file range would corrupt a file the
 * run never read (review #39 LOW-1 — unreachable today, stated mechanically).
 */
function outOfFileReport(
  input: RuleRunInput,
  captured: CapturedReport,
): RuleExecutionError | undefined {
  if (captured.position.file !== input.parsed.file) {
    return new RuleExecutionError(
      `reported a position in "${captured.position.file}" while running on "${input.parsed.file}"`,
      captured.ruleId,
    );
  }
  if (captured.fix !== undefined && captured.fix.position.file !== input.parsed.file) {
    return new RuleExecutionError(
      `offered a fix for "${captured.fix.position.file}" while running on "${input.parsed.file}"`,
      captured.ruleId,
    );
  }
  return undefined;
}

/** Validates one captured report into a `Violation`, attributed to its rule on failure. */
function buildOneViolation(
  input: RuleRunInput,
  captured: CapturedReport,
  ordinal: number,
): Result<Violation, RuleExecutionError> {
  const strayed = outOfFileReport(input, captured);
  if (strayed !== undefined) {
    return err(strayed);
  }
  const id = violationId(deterministicViolationId(captured.ruleId, captured.position, ordinal));
  if (id.isErr()) {
    // Unreachable by construction: the generated id is URI-encoded path +
    // validated rule id + digits, all inside the opaque-id charset. Kept so
    // a future charset drift fails loudly.
    return err(
      new RuleExecutionError("internal: generated violation id failed validation", captured.ruleId),
    );
  }
  const built = violation({
    id: id.value,
    ruleId: captured.ruleId,
    severity: captured.severity,
    message: captured.message,
    position: captured.position,
    ...(input.layer !== undefined ? { layer: input.layer } : {}),
    ...(captured.fix !== undefined ? { fix: captured.fix } : {}),
  });
  if (built.isErr()) {
    return err(
      new RuleExecutionError(
        `reported an invalid violation — ${built.error.message}`,
        captured.ruleId,
      ),
    );
  }
  return ok(built.value);
}

/**
 * Validates captured reports into `Violation`s. Factories return `Result`s,
 * but a hostile `Position` getter could still throw inside them — the try
 * keeps "never throws" honest and attributes to the report's rule.
 */
export function buildViolations(
  input: RuleRunInput,
  reports: readonly CapturedReport[],
): Result<readonly Violation[], RuleExecutionError> {
  const violations: Violation[] = [];
  let attributed: RuleId | undefined;
  try {
    for (const [ordinal, captured] of reports.entries()) {
      attributed = captured.ruleId;
      const built = buildOneViolation(input, captured, ordinal);
      if (built.isErr()) {
        return err(built.error);
      }
      violations.push(built.value);
    }
  } catch (cause) {
    return err(toExecutionError(cause, attributed));
  }
  violations.sort(compareViolations);
  return ok(Object.freeze(violations));
}
