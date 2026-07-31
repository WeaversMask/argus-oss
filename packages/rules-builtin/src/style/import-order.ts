import type { AstNode } from "@argus/core";
import type { RuleModule } from "@argus/rule-engine";
import { childByField } from "../grammar.js";
import { defineRule, pointAt } from "../support.js";
import { computeBlockFix } from "./import-order-fix.js";
import type { ImportEntry } from "./import-order-fix.js";

const NODE_BUILTINS: ReadonlySet<string> = new Set([
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "worker_threads",
  "zlib",
]);

/** Import groups in required order: node builtins, then external packages, then relative. */
const BUILTIN = 0;
const EXTERNAL = 1;
const RELATIVE = 2;

const GROUP_LABEL = ["node builtins", "external packages", "relative imports"] as const;

/**
 * Flags top-level imports that are out of group order. The required order is
 * node builtins (`node:*` or a known builtin) → external packages (bare
 * specifiers) → relative imports (`./`, `../`).
 *
 * The check is deliberately group-level, not full alphabetical sorting: it
 * catches the meaningful mistake — a builtin or package import stranded below
 * relative ones — without imposing a bikeshed-prone total order. Only
 * `import` statements at the top of the module are considered; `export … from`
 * re-exports and dynamic imports are ignored.
 *
 * Offers a whole-block reordering `fix` when it can prove one is safe (see
 * {@link computeBlockFix}) — otherwise reports without one, leaving the
 * violation for manual resolution rather than risk a wrong edit.
 */
export const importOrder: RuleModule = defineRule(
  {
    id: "style/import-order",
    name: "import-order",
    description:
      "Require imports to be grouped: node builtins, then external packages, then relative.",
    defaultSeverity: "warning",
  },
  (context) => ({
    program: (node) => {
      const entries: ImportEntry[] = [];
      node.children.forEach((child, childIndex) => {
        if (child.nodeType !== "import_statement") {
          return;
        }
        const source = importSource(child);
        if (source === undefined) {
          return;
        }
        entries.push({ node: child, childIndex, source, group: groupOf(source) });
      });

      const toReport: { readonly entry: ImportEntry; readonly requiredBefore: 0 | 1 | 2 }[] = [];
      let highestSoFar: 0 | 1 | 2 = BUILTIN;
      for (const entry of entries) {
        if (entry.group < highestSoFar) {
          toReport.push({ entry, requiredBefore: highestSoFar });
        } else {
          highestSoFar = entry.group;
        }
      }
      if (toReport.length === 0) {
        return;
      }

      const blockFix = computeBlockFix(node, entries);
      for (const { entry, requiredBefore } of toReport) {
        context.report({
          message: `Import "${entry.source}" (${GROUP_LABEL[entry.group]}) must come before ${GROUP_LABEL[requiredBefore]}.`,
          position: pointAt(
            context.file,
            entry.node.position.startLine,
            entry.node.position.startColumn,
          ),
          ...(blockFix !== undefined ? { fix: blockFix } : {}),
        });
      }
    },
  }),
);

function importSource(importStatement: AstNode): string | undefined {
  const source = childByField(importStatement, "source");
  if (source === undefined) {
    return undefined;
  }
  // The string node's text includes its surrounding quotes.
  return source.text.slice(1, -1);
}

function groupOf(source: string): 0 | 1 | 2 {
  // A builtin submodule may be imported unprefixed (`fs/promises`,
  // `stream/web`): classify by the first path segment too, not just the
  // whole specifier (review finding).
  const root = source.split("/")[0] ?? source;
  if (source.startsWith("node:") || NODE_BUILTINS.has(source) || NODE_BUILTINS.has(root)) {
    return BUILTIN;
  }
  if (source.startsWith(".")) {
    return RELATIVE;
  }
  return EXTERNAL;
}
