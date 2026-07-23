import type { RuleModule } from "@argus/rule-engine";
import { FUNCTION_LIKE } from "../grammar.js";
import { defineRule, listenTo, namePosition, positiveIntOption } from "../support.js";

const DEFAULT_MAX = 50;

/**
 * Flags functions whose source span exceeds `max` lines (default
 * {@link DEFAULT_MAX}), counting every function form — declarations, function
 * and arrow expressions, methods, generators.
 *
 * Length is the line span from the function's first line to its last
 * (signature and braces included, blank/comment lines counted), because that
 * is what a reader scrolls through. Nested functions are measured
 * independently — each subscribes on its own, so an outer function is not
 * "charged" for a long inner one being reported separately.
 *
 * Options: `{ max?: number }` — the inclusive line budget per function.
 */
export const maxFunctionLength: RuleModule = defineRule(
  {
    id: "quality/max-function-length",
    name: "max-function-length",
    description: "Disallow functions longer than a configured number of lines.",
    defaultSeverity: "warning",
  },
  (context) => {
    const max = positiveIntOption(context.options, "max", DEFAULT_MAX);
    return listenTo(FUNCTION_LIKE, (node) => {
      const lines = node.position.endLine - node.position.startLine + 1;
      if (lines > max) {
        context.report({
          message: `Function spans ${lines} lines, exceeding the maximum of ${max}.`,
          position: namePosition(node),
        });
      }
    });
  },
);
