import type { AstNode } from "@argus/core";

/**
 * Grammar-concept vocabulary shared by the built-in rules.
 *
 * Node types are the tree-sitter grammar's own labels (P1-03 convention):
 * keywords and punctuation are real anonymous nodes, and `fieldName` names a
 * child's grammar role. The sets below map the concepts rules reason about
 * ("a function", "a decision point", "a nesting statement") onto those
 * labels, so the vocabulary lives in one audited place rather than scattered
 * as magic strings.
 *
 * Scope is TypeScript + JavaScript (they share the tree-sitter-typescript /
 * tree-sitter-javascript vocabulary). Python's equivalents (`function_definition`,
 * `block`, ...) are included where they are harmless supersets, so the sets do
 * not have to be rewritten when Python rule coverage lands — but these rules
 * are tuned and fixture-covered for TS/JS only (P2-01 scope note).
 */

/**
 * Every node type that introduces a function scope. Async / generator /
 * getter-setter / static are modifier *child tokens* in these grammars, not
 * distinct node types, so they need no separate entries.
 */
export const FUNCTION_LIKE: ReadonlySet<string> = new Set([
  "function_declaration",
  "function_expression",
  "generator_function_declaration",
  "generator_function",
  "arrow_function",
  "method_definition",
  // Python — future coverage; harmless here.
  "function_definition",
]);

/** True when `node` introduces a function scope (see {@link FUNCTION_LIKE}). */
export function isFunctionLike(node: AstNode): boolean {
  return FUNCTION_LIKE.has(node.nodeType);
}

/**
 * Compound statements that add a level of block nesting (max-nesting-depth).
 * `catch_clause`/`finally_clause` are deliberately absent: they are children
 * of `try_statement`, which already counts, and their bodies sit at the same
 * level as the try body (as in ESLint `max-depth`).
 */
export const NESTING: ReadonlySet<string> = new Set([
  "if_statement",
  "for_statement",
  "for_in_statement",
  "while_statement",
  "do_statement",
  "switch_statement",
  "try_statement",
]);

/**
 * Node types that add a branch to McCabe cyclomatic complexity. `switch_case`
 * (a `case`) counts; `switch_default` does not. A `binary_expression` counts
 * only when its operator is a short-circuiting logical one — see
 * {@link isLogicalDecision}.
 */
export const DECISION: ReadonlySet<string> = new Set([
  "if_statement",
  "for_statement",
  "for_in_statement",
  "while_statement",
  "do_statement",
  "switch_case",
  "catch_clause",
  "ternary_expression",
]);

const LOGICAL_OPERATORS: ReadonlySet<string> = new Set(["&&", "||", "??"]);
const LOGICAL_ASSIGNMENTS: ReadonlySet<string> = new Set(["&&=", "||=", "??="]);

/**
 * A short-circuiting expression that adds a branch: a `binary_expression` with
 * a logical operator (`&&`, `||`, `??`) or a logical assignment (`&&=`, `||=`,
 * `??=`, which parse as `augmented_assignment_expression`). Optional chaining
 * (`?.`) is deliberately not counted (scope decision — documented on the rule).
 */
export function isLogicalDecision(node: AstNode): boolean {
  if (node.nodeType === "binary_expression") {
    return node.children.some(
      (child) => child.fieldName === "operator" && LOGICAL_OPERATORS.has(child.nodeType),
    );
  }
  if (node.nodeType === "augmented_assignment_expression") {
    return node.children.some(
      (child) => child.fieldName === "operator" && LOGICAL_ASSIGNMENTS.has(child.nodeType),
    );
  }
  return false;
}

/** Statements that end control flow — code after them in the same block is unreachable. */
export const TERMINATORS: ReadonlySet<string> = new Set([
  "return_statement",
  "throw_statement",
  "break_statement",
  "continue_statement",
]);

/**
 * Node types that carry no runtime behaviour and so are skipped when a rule
 * scans the direct children of a block (punctuation tokens, comments, and the
 * empty statement).
 */
export const TRIVIA: ReadonlySet<string> = new Set(["comment", "{", "}", ";", "(", ")", ","]);

/** True when `node` carries no runtime behaviour (see {@link TRIVIA}). */
export function isTrivia(node: AstNode): boolean {
  return TRIVIA.has(node.nodeType);
}

/** The first direct child occupying the given grammar field, if any. */
export function childByField(node: AstNode, field: string): AstNode | undefined {
  return node.children.find((child) => child.fieldName === field);
}

/** A JSDoc comment is a block comment whose text opens with `/**`. */
export function isJsDoc(node: AstNode): boolean {
  return node.nodeType === "comment" && node.text.startsWith("/**");
}
