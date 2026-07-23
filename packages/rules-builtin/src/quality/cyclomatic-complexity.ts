import type { AstNode } from "@argus/core";
import type { RuleModule } from "@argus/rule-engine";
import { DECISION, FUNCTION_LIKE, isFunctionLike, isLogicalDecision } from "../grammar.js";
import { defineRule, listenTo, namePosition, positiveIntOption } from "../support.js";

const DEFAULT_MAX = 10;

/**
 * Flags functions whose McCabe cyclomatic complexity exceeds `max` (default
 * {@link DEFAULT_MAX}) — the number of linearly independent paths through the
 * body, i.e. `1 + decision points`.
 *
 * Decision points are `if`, `for`/`for…of`/`for…in`, `while`, `do`, each
 * `switch` `case` (not `default`), `catch`, the ternary `?:`, and each
 * short-circuiting logical operator (`&&`, `||`, `??`). Complexity is counted
 * per function, stopping at nested function boundaries so each function is
 * scored on its own control flow.
 *
 * Options: `{ max?: number }` — the inclusive complexity budget per function.
 */
export const cyclomaticComplexity: RuleModule = defineRule(
  {
    id: "quality/cyclomatic-complexity",
    name: "cyclomatic-complexity",
    description: "Disallow functions whose cyclomatic complexity exceeds a configured maximum.",
    defaultSeverity: "warning",
  },
  (context) => {
    const max = positiveIntOption(context.options, "max", DEFAULT_MAX);
    return listenTo(FUNCTION_LIKE, (node) => {
      const complexity = 1 + countDecisions(node);
      if (complexity > max) {
        context.report({
          message: `Cyclomatic complexity ${complexity} exceeds the maximum of ${max}.`,
          position: namePosition(node),
        });
      }
    });
  },
);

/** Counts decision points in a function's body, not descending into nested functions. */
function countDecisions(fn: AstNode): number {
  let count = 0;
  const walk = (node: AstNode): void => {
    for (const child of node.children) {
      if (isFunctionLike(child)) {
        continue; // nested function — counted by its own subscription
      }
      if (DECISION.has(child.nodeType) || isLogicalDecision(child)) {
        count += 1;
      }
      walk(child);
    }
  };
  walk(fn);
  return count;
}
