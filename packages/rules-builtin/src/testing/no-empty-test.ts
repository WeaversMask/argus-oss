import type { RuleModule } from "@argus/rule-engine";
import { childByField, isTrivia } from "../grammar.js";
import { defineRule } from "../support.js";

/** Test-defining call names whose callback body must not be empty. */
const TEST_FUNCTIONS: ReadonlySet<string> = new Set(["it", "test"]);

/**
 * Flags `it(...)` / `test(...)` calls whose callback has an empty body — a
 * test that asserts nothing yet reports as passing, the most misleading kind
 * of green.
 *
 * A body counts as empty when it contains only comments and punctuation (so a
 * `// TODO` placeholder is still flagged). A pending test with no callback
 * (`it("todo")`) is left alone — that is an explicit, visible skip, not a
 * silent no-op. Only the bare `it(...)` / `test(...)` call forms are matched;
 * member/computed forms — `it.skip`, `it.only`, `it.each([...])(...)` — are
 * not, since their callee is not a plain identifier.
 */
export const noEmptyTest: RuleModule = defineRule(
  {
    id: "testing/no-empty-test",
    name: "no-empty-test",
    description: "Disallow test cases with an empty callback body.",
    defaultSeverity: "warning",
  },
  (context) => ({
    call_expression: (node) => {
      const callee = childByField(node, "function");
      if (callee === undefined || callee.nodeType !== "identifier") {
        return;
      }
      if (!TEST_FUNCTIONS.has(callee.text)) {
        return;
      }
      const args = childByField(node, "arguments");
      if (args === undefined) {
        return;
      }
      const callback = args.children.find(
        (child) => child.nodeType === "arrow_function" || child.nodeType === "function_expression",
      );
      if (callback === undefined) {
        return; // no callback → pending test, not empty
      }
      const body = childByField(callback, "body");
      if (body === undefined || body.nodeType !== "statement_block") {
        return; // expression-bodied arrow does something
      }
      if (!body.children.some((child) => !isTrivia(child))) {
        context.report({
          message: `Test "${callee.text}(...)" has an empty body — add assertions or remove it.`,
          position: body.position,
        });
      }
    },
  }),
);
