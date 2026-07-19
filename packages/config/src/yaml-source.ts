import { err, ok } from "neverthrow";
import type { Result } from "neverthrow";
import { LineCounter, parseDocument } from "yaml";
import type { Document } from "yaml";
import { ConfigError } from "./errors.js";
import type { ConfigIssue } from "./errors.js";

/** A parsed YAML config file that still knows where everything is. */
export interface ConfigSource {
  readonly file: string;
  readonly document: Document;
  readonly lineCounter: LineCounter;
}

/**
 * Parses YAML text into a positioned {@link ConfigSource}. Syntax errors
 * (including duplicate keys, which the `yaml` package reports by default)
 * come back as a `ConfigError` with 1-based line/column.
 */
export function parseSource(file: string, text: string): Result<ConfigSource, ConfigError> {
  const lineCounter = new LineCounter();
  // prettyErrors: false keeps messages single-line (no code frames in a
  // composed ConfigError); positions come from error.pos + the counter.
  const document = parseDocument(text, { lineCounter, prettyErrors: false });
  if (document.errors.length > 0) {
    const issues: ConfigIssue[] = document.errors.map((error) => {
      const position = lineCounter.linePos(error.pos[0]);
      return {
        file,
        line: position.line,
        column: position.col,
        path: "",
        message: error.message,
      };
    });
    return err(new ConfigError(`Malformed YAML in ${file}`, issues));
  }
  return ok(Object.freeze({ file, document, lineCounter }));
}

/**
 * 1-based line/column of the value at `path` in the source document.
 * When the exact node has no range (or the path names something absent —
 * e.g. a missing required key), falls back to the nearest existing
 * ancestor, and finally to the document start — an approximate pointer
 * beats no pointer.
 */
export function positionOf(
  source: ConfigSource,
  path: readonly (string | number)[],
): { readonly line: number; readonly column: number } {
  for (let depth = path.length; depth >= 0; depth -= 1) {
    const node: unknown =
      depth === 0 ? source.document.contents : source.document.getIn(path.slice(0, depth), true);
    const range = (node as { range?: readonly [number, number, number] } | null | undefined)?.range;
    if (range !== undefined) {
      const position = source.lineCounter.linePos(range[0]);
      return { line: position.line, column: position.col };
    }
  }
  return { line: 1, column: 1 };
}

interface MapLikeNode {
  readonly items?: readonly {
    readonly key?: { readonly value?: unknown; readonly range?: readonly [number, number, number] };
  }[];
}

/**
 * 1-based line/column of the **key** named by the last path segment — for
 * issues about the key itself (unrecognized keys), where pointing at the
 * value's block reads one line off (review finding, #26). Falls back to
 * {@link positionOf} when the key node cannot be located.
 */
export function keyPositionOf(
  source: ConfigSource,
  path: readonly string[],
): { readonly line: number; readonly column: number } {
  const last = path.at(-1);
  const parent: unknown =
    path.length <= 1 ? source.document.contents : source.document.getIn(path.slice(0, -1), true);
  const items = (parent as MapLikeNode | null | undefined)?.items;
  if (last !== undefined && items !== undefined) {
    for (const item of items) {
      const key = item.key;
      if (key?.range !== undefined && String(key.value) === last) {
        const position = source.lineCounter.linePos(key.range[0]);
        return { line: position.line, column: position.col };
      }
    }
  }
  return positionOf(source, path);
}
