import type { AstNode } from "@argus/core";
import type { RuleModule } from "@argus/rule-engine";
import { isJsDoc } from "../grammar.js";
import { defineRule, namePosition } from "../support.js";

/** Exported declaration node types that require a preceding JSDoc comment, with their labels. */
const REQUIRES_DOC: ReadonlyMap<string, string> = new Map([
  ["function_declaration", "function"],
  ["generator_function_declaration", "function"],
  ["class_declaration", "class"],
  ["interface_declaration", "interface"],
]);

/**
 * Flags exported functions, classes, and interfaces that lack a JSDoc block
 * (`/** … *␝/`) immediately preceding them.
 *
 * The rule targets a project's *public surface* — the declarations another
 * package imports — where a one-line intent comment pays for itself. It looks
 * only at `export`ed declarations at module top level and requires the comment
 * to be the immediately preceding sibling; a line comment (`//`) does not
 * satisfy it. Exported `const`s, type aliases, and enums are intentionally
 * out of scope to avoid noise on trivial declarations.
 */
export const requireJsdoc: RuleModule = defineRule(
  {
    id: "docs/require-jsdoc",
    name: "require-jsdoc",
    description: "Require a JSDoc comment on exported functions, classes, and interfaces.",
    defaultSeverity: "warning",
  },
  (context) => ({
    program: (node) => {
      let previous: AstNode | undefined;
      for (const child of node.children) {
        const declaration = exportedDeclaration(child);
        if (declaration !== undefined) {
          const label = REQUIRES_DOC.get(declaration.nodeType);
          if (label !== undefined && !(previous !== undefined && isJsDoc(previous))) {
            context.report({
              message: `Exported ${label} should have a JSDoc comment.`,
              position: namePosition(declaration),
            });
          }
        }
        previous = child;
      }
    },
  }),
);

/** The documentable declaration inside an `export` statement, if any. */
function exportedDeclaration(node: AstNode): AstNode | undefined {
  if (node.nodeType !== "export_statement") {
    return undefined;
  }
  return node.children.find((child) => REQUIRES_DOC.has(child.nodeType));
}
