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
 * satisfy it. TypeScript **overload signatures** (`function_signature`) are
 * transparent: a documented overload set carries its JSDoc above the first
 * signature, so the implementation is considered documented if a JSDoc precedes
 * the signature run (review finding). Exported `const`s, type aliases, and
 * enums are intentionally out of scope to avoid noise on trivial declarations.
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
      const siblings = node.children;
      siblings.forEach((child, index) => {
        const declaration = exportedDeclaration(child);
        if (declaration === undefined) {
          return;
        }
        const label = REQUIRES_DOC.get(declaration.nodeType);
        if (label !== undefined && !hasPrecedingJsDoc(siblings, index)) {
          context.report({
            message: `Exported ${label} should have a JSDoc comment.`,
            position: namePosition(declaration),
          });
        }
      });
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

/** Whether a JSDoc block precedes `siblings[index]`, skipping over overload signatures. */
function hasPrecedingJsDoc(siblings: readonly AstNode[], index: number): boolean {
  let cursor = index - 1;
  while (cursor >= 0) {
    const sibling = siblings[cursor];
    if (sibling === undefined || !isOverloadSignature(sibling)) {
      break;
    }
    cursor -= 1;
  }
  const preceding = cursor >= 0 ? siblings[cursor] : undefined;
  return preceding !== undefined && isJsDoc(preceding);
}

/**
 * A TypeScript overload signature (`function foo(): T;`), exported or not.
 *
 * Matched by node type, not by function identity: two adjacent overload groups
 * where the first has no implementation could let the second's impl inherit the
 * first's JSDoc — but a signature run with no implementation is a compile error,
 * so this is unreachable in valid TypeScript (review nit, accepted).
 */
function isOverloadSignature(node: AstNode): boolean {
  if (node.nodeType === "function_signature") {
    return true;
  }
  return (
    node.nodeType === "export_statement" &&
    node.children.some((child) => child.nodeType === "function_signature")
  );
}
