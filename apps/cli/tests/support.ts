import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { filePath, layerName, position, ruleId, violation, violationId } from "@argus/core";
import type { Fix, Severity, Violation } from "@argus/core";
import type { CliIO } from "../src/io.js";

/** A {@link CliIO} that records everything written, for assertions. */
export interface CaptureIO extends CliIO {
  /** Everything written to stdout so far, concatenated. */
  out(): string;
  /** Everything written to stderr so far, concatenated. */
  err(): string;
}

/**
 * Ambient inputs a test wants to vary. Both default to the quiet, deterministic
 * choice — empty environment, not a terminal — so no test inherits the
 * developer's own `NO_COLOR`/`TERM` or renders escapes it did not ask for.
 */
export interface CaptureOptions {
  readonly env?: Readonly<Partial<Record<string, string>>>;
  readonly isTTY?: boolean;
}

export function captureIO(cwd: string, options: CaptureOptions = {}): CaptureIO {
  const outChunks: string[] = [];
  const errChunks: string[] = [];
  return {
    cwd,
    env: options.env ?? {},
    isTTY: options.isTTY ?? false,
    stdout: (text) => {
      outChunks.push(text);
    },
    stderr: (text) => {
      errChunks.push(text);
    },
    out: () => outChunks.join(""),
    err: () => errChunks.join(""),
  };
}

/** The parts of a violation a formatter test cares about. */
export interface ViolationSpec {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly severity: Severity;
  readonly rule: string;
  readonly message: string;
  /** Range end, when a test cares that it survives. Defaults to `column + 1` on `line`. */
  readonly endLine?: number;
  readonly endColumn?: number;
  /** Set when a test needs a classified file; omitted violations carry no layer. */
  readonly layer?: string;
  /**
   * Overrides the derived id. Needed only to reproduce what the engine does
   * when one rule reports twice at the same position: same coordinates, ids
   * distinguished by an ordinal.
   */
  readonly id?: string;
  /** A fix this violation carries, when a test needs one (P2-06). */
  readonly fix?: Fix;
}

/**
 * Builds a real {@link Violation} through core's factories — the formatters are
 * tested against genuine domain objects, never hand-shaped literals.
 */
export function makeViolation(spec: ViolationSpec): Violation {
  const file = filePath(spec.file)._unsafeUnwrap();
  const pos = position({
    file,
    startLine: spec.line,
    startColumn: spec.column,
    endLine: spec.endLine ?? spec.line,
    endColumn: spec.endColumn ?? spec.column + 1,
  })._unsafeUnwrap();
  return violation({
    id: violationId(
      spec.id ?? `${spec.file}:${spec.line}:${spec.column}:${spec.rule}`,
    )._unsafeUnwrap(),
    ruleId: ruleId(spec.rule)._unsafeUnwrap(),
    severity: spec.severity,
    message: spec.message,
    position: pos,
    ...(spec.layer !== undefined ? { layer: layerName(spec.layer)._unsafeUnwrap() } : {}),
    ...(spec.fix !== undefined ? { fix: spec.fix } : {}),
  })._unsafeUnwrap();
}

/** Creates a throwaway temp directory; returns it plus a cleanup function. */
export function tempDir(): { readonly dir: string; cleanup: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), "argus-cli-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
