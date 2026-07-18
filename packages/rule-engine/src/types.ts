import type { AstNode, FilePath, Language, LayerName, Position, Rule } from "@argus/core";

/**
 * Callback invoked for a node the rule subscribed to.
 *
 * Listeners are synchronous by design: all active rules share one AST walk
 * (the hot path), and the walk completes atomically per file. A listener
 * that returns a Promise is rejected by the engine as a rule failure —
 * silently ignoring it would let async errors escape the engine's
 * containment guarantee.
 */
export type RuleListener = (node: AstNode) => void;

/**
 * A rule's subscriptions, keyed by selector:
 *
 * - `"<nodeType>"` — called when the walk enters a node of that grammar
 *   type (pre-order), e.g. `"function_declaration"`.
 * - `"<nodeType>:exit"` — called after the node's children (post-order).
 * - `"*"` / `"*:exit"` — called for every node.
 *
 * Node types are the grammar vocabulary of the parsed language and include
 * anonymous nodes — keywords like `"let"` and punctuation like `"("` are
 * real children (P1-03 convention). Any other selector shape is a rule
 * failure at run time.
 *
 * Two selector sigils shadow real grammar tokens (review finding, #24):
 * `"*"` always means every node, so the literal `*` token (multiplication,
 * `export *`) cannot be subscribed to directly, and a bare `":"` token is
 * not a parseable selector. Match either from a `"*"` listener by checking
 * `node.nodeType`.
 *
 * There is no per-rule flow control (`skip`/`stop`): the walk is shared by
 * every active rule, so one rule pruning a subtree would starve the others.
 * `@argus/ast`'s `visit` keeps those levers for standalone traversal.
 */
export type RuleListeners = Readonly<Record<string, RuleListener>>;

/** What a rule hands to {@link RuleContext.report}: the finding's message and source range. */
export interface RuleReport {
  /** Human-readable description of the specific breach. Must not be blank. */
  readonly message: string;
  /**
   * Source range of the breach — usually `node.position` of the offending
   * node. Must lie in the file the rule is currently running on.
   */
  readonly position: Position;
}

/**
 * The read-only view a rule sees while running on one file. Frozen — rules
 * cannot mutate it, the AST, or anything reachable from it (P1-04
 * acceptance). Severity is not exposed: the engine assigns the activation's
 * configured severity to every violation the rule reports.
 */
export interface RuleContext {
  readonly file: FilePath;
  readonly language: Language;
  /** Layer of the file, when the manifest classified it. */
  readonly layer?: LayerName;
  /**
   * Rule-specific configuration from the activation, snapshotted and
   * shallow-frozen at run start.
   */
  readonly options: Readonly<Record<string, unknown>>;
  /** Report a rule breach. The engine turns reports into `Violation`s. */
  readonly report: (report: RuleReport) => void;
}

/**
 * A rule implementation: the static domain `Rule` plus a factory that
 * subscribes listeners for one file run. `create` is called once per rule
 * per file with a fresh context; module instances must therefore keep no
 * per-file state outside the closure `create` returns. Must be synchronous
 * (see {@link RuleListener}).
 *
 * Registering a module is the only integration point — adding a new rule
 * requires zero changes to the engine (P1-04 acceptance).
 */
export interface RuleModule {
  readonly rule: Rule;
  readonly create: (context: RuleContext) => RuleListeners;
}
