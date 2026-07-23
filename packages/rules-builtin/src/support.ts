import { position, rule, ruleId } from "@argus/core";
import type { AstNode, FilePath, Position, Severity } from "@argus/core";
import type { RuleContext, RuleListener, RuleListeners, RuleModule } from "@argus/rule-engine";

/** Subscribes one listener to every node type in `types` (a shared handler). */
export function listenTo(types: Iterable<string>, listener: RuleListener): RuleListeners {
  const listeners: Record<string, RuleListener> = {};
  for (const type of types) {
    listeners[type] = listener;
  }
  return listeners;
}

/**
 * Builds a {@link RuleModule} from a static spec plus a `create` factory.
 *
 * The id and metadata are validated eagerly at module construction (import
 * time): a malformed built-in rule id is a programming error, so unwrapping
 * here surfaces it as a load-time throw that the rule's own tests catch,
 * rather than a silent bad rule.
 */
export function defineRule(
  spec: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly defaultSeverity: Severity;
    readonly docsUrl?: string;
  },
  create: (context: RuleContext) => RuleListeners,
): RuleModule {
  const id = ruleId(spec.id)._unsafeUnwrap();
  const built = rule({
    id,
    name: spec.name,
    description: spec.description,
    defaultSeverity: spec.defaultSeverity,
    ...(spec.docsUrl !== undefined ? { docsUrl: spec.docsUrl } : {}),
  })._unsafeUnwrap();
  return { rule: built, create };
}

/**
 * Reads a positive-integer option, falling back to `fallback` when absent.
 *
 * A present-but-invalid option (not a number, non-integer, or `< 1`) throws:
 * per the engine's failure policy, that attributes a clear `RuleExecutionError`
 * to this rule rather than letting a misconfiguration produce silently wrong
 * findings (adding-a-rule recipe — "validate options defensively").
 */
export function positiveIntOption(
  options: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  const raw = options[key];
  if (raw === undefined) {
    return fallback;
  }
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) {
    throw new Error(`option "${key}" must be a positive integer (got ${JSON.stringify(raw)})`);
  }
  return raw;
}

/**
 * Number of lines the source text spans. A single trailing newline (the
 * conventional end-of-file marker) is not counted as an extra empty line, so
 * `"a\nb\n"` is two lines, matching how editors and `wc -l + 1` report length.
 */
export function lineCount(text: string): number {
  const segments = text.split(/\r\n|\r|\n/);
  const last = segments[segments.length - 1];
  return last === "" ? segments.length - 1 : segments.length;
}

/** A validated 1-based, end-exclusive point range at `line:column` in `file`. */
export function pointAt(file: FilePath, line: number, column = 1): Position {
  return position({
    file,
    startLine: line,
    startColumn: column,
    endLine: line,
    endColumn: column,
  })._unsafeUnwrap();
}

/**
 * The position of a node's `name` field when present, else the node's own
 * position — so a violation points at the offending identifier, not the whole
 * declaration.
 */
export function namePosition(node: AstNode): Position {
  const name = node.children.find((child) => child.fieldName === "name");
  return name?.position ?? node.position;
}
