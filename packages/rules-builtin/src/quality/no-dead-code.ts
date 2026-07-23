import type { AstNode } from "@argus/core";
import type { RuleModule } from "@argus/rule-engine";
import { TERMINATORS, isTrivia } from "../grammar.js";
import { defineRule, pointAt } from "../support.js";

/**
 * Flags statements that can never be reached because an earlier statement in
 * the same block ends control flow (`return`, `throw`, `break`, `continue`).
 *
 * Scope is intentionally shallow and sound: only the direct statements of a
 * block are considered, so a `return` nested inside an `if` does not condemn
 * the code after that `if`. Trailing comments and empty statements after a
 * terminator are fine; hoisted `function` declarations are skipped (they are
 * reachable regardless of position). Only the first unreachable statement is
 * reported — it marks where the dead region begins.
 *
 * `switch` cases are covered too: their statements hang directly off the
 * `case`/`default` node (no wrapping `statement_block`), so the case's body —
 * everything after the `:` — is scanned the same way (review finding).
 */
export const noDeadCode: RuleModule = defineRule(
  {
    id: "quality/no-dead-code",
    name: "no-dead-code",
    description: "Disallow unreachable statements after a terminating statement in a block.",
    defaultSeverity: "warning",
  },
  (context) => {
    const checkStatements = (statements: readonly AstNode[]): void => {
      const real = statements.filter((child) => !isTrivia(child));
      const terminator = real.findIndex((s) => TERMINATORS.has(s.nodeType));
      if (terminator === -1) {
        return;
      }
      for (let i = terminator + 1; i < real.length; i += 1) {
        const dead = real[i];
        if (dead === undefined || dead.nodeType === "function_declaration") {
          continue; // hoisted declarations remain reachable
        }
        context.report({
          message: "Unreachable code after a terminating statement.",
          position: pointAt(context.file, dead.position.startLine, dead.position.startColumn),
        });
        return;
      }
    };
    const checkBlock = (block: AstNode): void => checkStatements(block.children);
    const checkCase = (caseNode: AstNode): void => {
      // A `switch_case`/`switch_default`'s statements follow the `:` token;
      // everything up to and including it is the label, not runnable code.
      const colon = caseNode.children.findIndex((child) => child.nodeType === ":");
      checkStatements(colon === -1 ? [] : caseNode.children.slice(colon + 1));
    };
    // `statement_block` for TS/JS, `block` for Python; switch cases hold their
    // statements directly.
    return {
      statement_block: checkBlock,
      block: checkBlock,
      switch_case: checkCase,
      switch_default: checkCase,
    };
  },
);
