import type { AstNode } from "@argus/core";
import type { RuleContext, RuleModule } from "@argus/rule-engine";
import { FUNCTION_LIKE, childByField } from "../grammar.js";
import { defineRule } from "../support.js";

// Leading underscores (a common "internal/unused" marker) are allowed on any style.
const CAMEL_CASE = /^_*[a-z][A-Za-z0-9]*$/;
const PASCAL_CASE = /^_*[A-Z][A-Za-z0-9]*$/;
const UPPER_SNAKE_CASE = /^_*[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

const isCamel = (name: string): boolean => CAMEL_CASE.test(name);
const isPascal = (name: string): boolean => PASCAL_CASE.test(name);
const isUpperSnake = (name: string): boolean => UPPER_SNAKE_CASE.test(name);

/** Declaration node types whose `name` must be PascalCase (types). */
const TYPE_DECLARATIONS: ReadonlySet<string> = new Set([
  "class_declaration",
  "interface_declaration",
  "type_alias_declaration",
  "enum_declaration",
]);

/** Declaration node types that name a function. */
const FUNCTION_DECLARATIONS: ReadonlySet<string> = new Set([
  "function_declaration",
  "generator_function_declaration",
]);

/**
 * Flags declarations that break the standard TypeScript/JavaScript casing
 * conventions:
 *
 * - **Types** (`class`, `interface`, `type`, `enum`) → PascalCase.
 * - **Functions** — both `function` declarations and `const`s initialised to a
 *   function/arrow — → camelCase **or** PascalCase (PascalCase signals a
 *   component, factory, or constructor-like function; both are idiomatic).
 * - **Non-function variables** (`const`/`let`/`var`, simple identifiers only)
 *   → camelCase or UPPER_SNAKE_CASE (the conventional constant form).
 *
 * Only declaration sites with a plain identifier name are checked —
 * destructuring patterns, parameters, methods, and imported bindings are left
 * alone to keep false positives low. Leading underscores are permitted.
 */
export const namingConvention: RuleModule = defineRule(
  {
    id: "style/naming-convention",
    name: "naming-convention",
    description:
      "Enforce PascalCase for types, camel/PascalCase for functions, and camel/UPPER for variables.",
    defaultSeverity: "warning",
  },
  (context) => {
    const listeners: Record<string, (node: AstNode) => void> = {
      variable_declarator: (node) => checkVariable(node, context),
    };
    for (const type of TYPE_DECLARATIONS) {
      listeners[type] = (node) => checkName(node, context, isPascal, "PascalCase", "Type");
    }
    for (const type of FUNCTION_DECLARATIONS) {
      listeners[type] = (node) =>
        checkName(
          node,
          context,
          (name) => isCamel(name) || isPascal(name),
          "camelCase or PascalCase",
          "Function",
        );
    }
    return listeners;
  },
);

function checkName(
  node: AstNode,
  context: RuleContext,
  accepts: (name: string) => boolean,
  styleLabel: string,
  kindLabel: string,
): void {
  const name = childByField(node, "name");
  if (name === undefined || !isPlainIdentifier(name)) {
    return;
  }
  if (!accepts(name.text)) {
    context.report({
      message: `${kindLabel} "${name.text}" should be ${styleLabel}.`,
      position: name.position,
    });
  }
}

function checkVariable(node: AstNode, context: RuleContext): void {
  const name = childByField(node, "name");
  if (name === undefined || !isPlainIdentifier(name)) {
    return; // destructuring patterns are not checked
  }
  // A const/let initialised to a function is named like a function
  // (camel or Pascal), not a data variable — otherwise PascalCase arrow
  // components/factories would be false-flagged (review finding).
  const value = childByField(node, "value");
  if (value !== undefined && FUNCTION_LIKE.has(value.nodeType)) {
    if (!isCamel(name.text) && !isPascal(name.text)) {
      context.report({
        message: `Function "${name.text}" should be camelCase or PascalCase.`,
        position: name.position,
      });
    }
    return;
  }
  if (!isCamel(name.text) && !isUpperSnake(name.text)) {
    context.report({
      message: `Variable "${name.text}" should be camelCase or UPPER_CASE.`,
      position: name.position,
    });
  }
}

function isPlainIdentifier(name: AstNode): boolean {
  return name.nodeType === "identifier" || name.nodeType === "type_identifier";
}
