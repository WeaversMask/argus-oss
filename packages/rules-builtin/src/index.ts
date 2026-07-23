import type { RuleModule } from "@argus/rule-engine";
import { cyclomaticComplexity } from "./quality/cyclomatic-complexity.js";
import { maxFileLength } from "./quality/max-file-length.js";
import { maxFunctionLength } from "./quality/max-function-length.js";
import { maxNestingDepth } from "./quality/max-nesting-depth.js";
import { noDeadCode } from "./quality/no-dead-code.js";
import { importOrder } from "./style/import-order.js";
import { namingConvention } from "./style/naming-convention.js";
import { noWildcardImports } from "./style/no-wildcard-imports.js";
import { requireJsdoc } from "./docs/require-jsdoc.js";
import { noEmptyTest } from "./testing/no-empty-test.js";

export { cyclomaticComplexity } from "./quality/cyclomatic-complexity.js";
export { maxFileLength } from "./quality/max-file-length.js";
export { maxFunctionLength } from "./quality/max-function-length.js";
export { maxNestingDepth } from "./quality/max-nesting-depth.js";
export { noDeadCode } from "./quality/no-dead-code.js";
export { importOrder } from "./style/import-order.js";
export { namingConvention } from "./style/naming-convention.js";
export { noWildcardImports } from "./style/no-wildcard-imports.js";
export { requireJsdoc } from "./docs/require-jsdoc.js";
export { noEmptyTest } from "./testing/no-empty-test.js";

/**
 * Every built-in rule, in a stable order. A consumer (the orchestrator, the
 * CLI, config resolution) registers these with an `Engine` and activates a
 * subset via configuration — the array is the catalogue, not the active set.
 */
export const builtinRules: readonly RuleModule[] = Object.freeze([
  cyclomaticComplexity,
  maxFileLength,
  maxFunctionLength,
  maxNestingDepth,
  noDeadCode,
  namingConvention,
  importOrder,
  noWildcardImports,
  requireJsdoc,
  noEmptyTest,
]);
