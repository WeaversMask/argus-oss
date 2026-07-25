import { fix } from "@argus/core";
import type { AstNode, Fix } from "@argus/core";
import type { RuleModule } from "@argus/rule-engine";
import { childByField } from "../grammar.js";
import { defineRule, pointAt, spanning } from "../support.js";

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

/** One top-level import statement plus the classification the rule needs. */
interface ImportEntry {
  readonly node: AstNode;
  /** Index into `program.children` — used to detect contiguity for the fix. */
  readonly childIndex: number;
  readonly source: string;
  readonly group: 0 | 1 | 2;
}

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

      const blockFix = computeBlockFix(entries);
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

/**
 * A whole-block reordering fix, when it is provably safe. Two conditions
 * gate it, both required because a rule sees only the AST (`AstNode` never
 * exposes raw source or byte offsets — P1-03 scope limit) and must
 * reconstruct inter-statement whitespace from line numbers alone:
 *
 * 1. **Contiguous:** every `program` child between the first and last import
 *    (inclusive) must itself be an import statement. Comments are separate
 *    sibling nodes in this grammar, not trivia attached to a statement — a
 *    comment sitting between two imports would be silently stranded in its
 *    original spot if the statements moved around it. Declining here is what
 *    keeps the "never destroys comments" bar honest.
 * 2. **One import per line:** every adjacent pair must be on different
 *    lines. The gap between two imports is reconstructed as
 *    `"\n".repeat(nextStartLine - prevEndLine)` — exact for one-per-line
 *    code (and it faithfully preserves existing blank-line grouping, not
 *    just single newlines) but not representable at all when two imports
 *    share a line, since nothing captures the text of that shared line.
 *
 * Gaps are reused **positionally** (the gap that separated original
 * positions *i* and *i+1* separates whatever ends up at sorted positions *i*
 * and *i+1*), not reattached to specific imports — there is one fewer gap
 * than there are imports, so gaps belong to slots in the sequence, not to
 * the statements passing through them.
 */
function computeBlockFix(entries: readonly ImportEntry[]): Fix | undefined {
  const first = entries[0];
  const last = entries[entries.length - 1];
  if (first === undefined || last === undefined) {
    // Unreachable by construction: the only caller passes `entries` after
    // finding at least one entry in `toReport`, so it is never empty here.
    // `noUncheckedIndexedAccess` still requires the narrowing.
    return undefined;
  }
  if (last.childIndex - first.childIndex !== entries.length - 1) {
    return undefined; // something else sits between the first and last import
  }
  const gapLines: number[] = [];
  let previous = first;
  for (const entry of entries.slice(1)) {
    const lines = entry.node.position.startLine - previous.node.position.endLine;
    if (lines < 1) {
      return undefined; // two imports share a line — gap isn't reconstructible
    }
    gapLines.push(lines);
    previous = entry;
  }

  const sorted = [...entries].sort((a, b) => a.group - b.group);
  const replacement = sorted
    .map((entry, i) => {
      if (i === 0) {
        return entry.node.text;
      }
      const gap = gapLines[i - 1];
      if (gap === undefined) {
        // Unreachable by construction: gapLines has exactly entries.length -
        // 1 entries (one per adjacent original pair) and sorted has the same
        // length as entries, so every i >= 1 has a corresponding gap.
        throw new Error("internal: import-order fix gap/entry count mismatch");
      }
      return "\n".repeat(gap) + entry.node.text;
    })
    .join("");

  return fix({
    position: spanning(first.node.position, last.node.position),
    replacement,
  })._unsafeUnwrap();
}

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
