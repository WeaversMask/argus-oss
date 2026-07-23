import type { RuleModule } from "@argus/rule-engine";
import { defineRule, lineCount, pointAt, positiveIntOption } from "../support.js";

const DEFAULT_MAX = 300;

/**
 * Flags files longer than `max` lines (default {@link DEFAULT_MAX}).
 *
 * File length is a blunt but reliable proxy for "this module is doing too
 * much" — the "No God objects" principle expressed at the file level. Length
 * is measured from the root node's source text (a single trailing newline is
 * not counted as a line), so blank and comment lines count exactly as an
 * editor's gutter shows them. The violation points at the first line past the
 * limit.
 *
 * Options: `{ max?: number }` — the inclusive line budget.
 */
export const maxFileLength: RuleModule = defineRule(
  {
    id: "quality/max-file-length",
    name: "max-file-length",
    description: "Disallow files longer than a configured number of lines.",
    defaultSeverity: "warning",
  },
  (context) => {
    const max = positiveIntOption(context.options, "max", DEFAULT_MAX);
    const check = (root: { readonly text: string }): void => {
      const lines = lineCount(root.text);
      if (lines > max) {
        context.report({
          message: `File has ${lines} lines, exceeding the maximum of ${max}.`,
          position: pointAt(context.file, max + 1),
        });
      }
    };
    // `program` for TS/JS, `module` for Python — both are the file root.
    return { program: check, module: check };
  },
);
