import type { AstNode } from "@argus/core";
import type { RuleContext, RuleModule } from "@argus/rule-engine";
import { FUNCTION_LIKE, NESTING, isFunctionLike } from "../grammar.js";
import { defineRule, listenTo, pointAt, positiveIntOption } from "../support.js";

const DEFAULT_MAX = 4;

/** Node types that open a new scope and reset the depth count: file roots + functions. */
const SCOPE_ROOTS: readonly string[] = ["program", "module", ...FUNCTION_LIKE];

/**
 * Flags block nesting deeper than `max` levels (default {@link DEFAULT_MAX})
 * within a function or module scope.
 *
 * Deeply nested control flow is one of the strongest local predictors of
 * hard-to-follow code. Depth is measured per scope — each function starts
 * fresh, so a shallow function inside a deep one is judged on its own — and
 * `else if` chains are treated as siblings (an `else if` ladder stays at
 * depth 1), matching ESLint `max-depth`, so the common ladder is not
 * mistaken for deep nesting. `try`/`catch`/`finally` bodies share one level.
 *
 * Options: `{ max?: number }` — the inclusive nesting budget.
 */
export const maxNestingDepth: RuleModule = defineRule(
  {
    id: "quality/max-nesting-depth",
    name: "max-nesting-depth",
    description: "Disallow block nesting deeper than a configured number of levels.",
    defaultSeverity: "warning",
  },
  (context) => {
    const max = positiveIntOption(context.options, "max", DEFAULT_MAX);
    const analyze = (scopeRoot: AstNode): void => scanChildren(scopeRoot, 0, max, context);
    return listenTo(SCOPE_ROOTS, analyze);
  },
);

function report(context: RuleContext, node: AstNode, depth: number, max: number): void {
  context.report({
    message: `Block nesting depth ${depth} exceeds the maximum of ${max}.`,
    position: pointAt(context.file, node.position.startLine, node.position.startColumn),
  });
}

/** Walks a node's children at `depth`, descending into nesting and stopping at nested scopes. */
function scanChildren(node: AstNode, depth: number, max: number, context: RuleContext): void {
  for (const child of node.children) {
    if (isFunctionLike(child)) {
      continue; // its own listener analyses it as a fresh scope
    }
    if (child.nodeType === "if_statement") {
      scanIf(child, depth, max, context);
    } else if (NESTING.has(child.nodeType)) {
      const next = depth + 1;
      if (next > max) {
        report(context, child, next, max);
      }
      scanChildren(child, next, max, context);
    } else {
      scanChildren(child, depth, max, context);
    }
  }
}

/**
 * An `if` counts as one level; its `else if` continuation stays at the same
 * base depth (so a ladder does not accumulate), while a plain `else` block
 * shares the `if` body's level.
 */
function scanIf(ifNode: AstNode, depth: number, max: number, context: RuleContext): void {
  const inner = depth + 1;
  if (inner > max) {
    report(context, ifNode, inner, max);
  }
  // An `if`'s direct children are keyword/condition/consequence/else-clause —
  // never function-like — so nested-scope skipping happens in scanChildren as
  // it descends into those bodies, not here.
  for (const child of ifNode.children) {
    if (child.fieldName === "alternative") {
      for (const clauseChild of child.children) {
        if (clauseChild.nodeType === "if_statement") {
          scanIf(clauseChild, depth, max, context); // else-if: sibling, same base depth
        } else {
          scanChildren(clauseChild, inner, max, context); // else block body
        }
      }
    } else {
      scanChildren(child, inner, max, context); // condition + consequence
    }
  }
}
