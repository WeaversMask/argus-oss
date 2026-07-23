import type { AstNode } from "@argus/core";
import type { RuleModule } from "@argus/rule-engine";
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
 * Brace-less bodies count the same as braced ones (`if (a) for (…) …` is depth
 * 2, exactly like `if (a) { for (…) … }`).
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

    const report = (node: AstNode, depth: number): void => {
      context.report({
        message: `Block nesting depth ${depth} exceeds the maximum of ${max}.`,
        position: pointAt(context.file, node.position.startLine, node.position.startColumn),
      });
    };

    // `depth` is the nesting level of the context a node sits in; a nesting
    // node lifts everything inside it to `depth + 1`.
    const scanNode = (node: AstNode, depth: number): void => {
      if (isFunctionLike(node)) {
        return; // its own listener analyses it as a fresh scope
      }
      if (node.nodeType === "if_statement") {
        scanIf(node, depth);
        return;
      }
      if (NESTING.has(node.nodeType)) {
        const next = depth + 1;
        if (next > max) {
          report(node, next);
        }
        scanEach(node.children, next);
        return;
      }
      scanEach(node.children, depth);
    };

    const scanEach = (nodes: readonly AstNode[], depth: number): void => {
      for (const node of nodes) {
        scanNode(node, depth);
      }
    };

    /**
     * An `if` counts as one level; its `else if` continuation stays at the same
     * base depth (so a ladder does not accumulate), while a plain `else` block
     * shares the `if` body's level.
     */
    const scanIf = (ifNode: AstNode, depth: number): void => {
      const inner = depth + 1;
      if (inner > max) {
        report(ifNode, inner);
      }
      for (const child of ifNode.children) {
        if (child.fieldName === "alternative") {
          for (const clauseChild of child.children) {
            if (clauseChild.nodeType === "if_statement") {
              scanIf(clauseChild, depth); // else-if: sibling, same base depth
            } else {
              scanNode(clauseChild, inner); // else block body
            }
          }
        } else {
          scanNode(child, inner); // condition + consequence (braced or not)
        }
      }
    };

    return listenTo(SCOPE_ROOTS, (scopeRoot) => scanEach(scopeRoot.children, 0));
  },
);
