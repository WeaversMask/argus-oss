import type { RuleModule } from "@argus/rule-engine";
import { defineRule } from "../support.js";

/**
 * Flags namespace (wildcard) imports — `import * as ns from "..."`.
 *
 * Namespace imports pull an entire module under one binding, which defeats
 * tree-shaking, hides which members are actually used, and makes a module's
 * true coupling invisible to both readers and tools. Named imports state the
 * dependency precisely. Wildcard *re-exports* (`export * from`) are a
 * deliberate barrel-file idiom and are not flagged — only the `import` form
 * is, which is why this subscribes to `namespace_import` (the `* as x` clause)
 * rather than the `*` token.
 */
export const noWildcardImports: RuleModule = defineRule(
  {
    id: "style/no-wildcard-imports",
    name: "no-wildcard-imports",
    description: "Disallow namespace imports (`import * as ns`); import named bindings instead.",
    defaultSeverity: "warning",
  },
  (context) => ({
    namespace_import: (node) => {
      context.report({
        message: "Avoid `import * as …`; import the specific bindings you use instead.",
        position: node.position,
      });
    },
  }),
);
