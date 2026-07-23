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
 */
export const noDeadCode: RuleModule = defineRule(
  {
    id: "quality/no-dead-code",
    name: "no-dead-code",
    description: "Disallow unreachable statements after a terminating statement in a block.",
    defaultSeverity: "warning",
  },
  (context) => {
    const check = (block: AstNode): void => {
      const statements = block.children.filter((child) => !isTrivia(child));
      const terminator = statements.findIndex((s) => TERMINATORS.has(s.nodeType));
      if (terminator === -1) {
        return;
      }
      for (let i = terminator + 1; i < statements.length; i += 1) {
        const dead = statements[i];
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
    // `statement_block` for TS/JS, `block` for Python.
    return { statement_block: check, block: check };
  },
);
