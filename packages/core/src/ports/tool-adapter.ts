import type { Result } from "neverthrow";
import type { FilePath } from "../domain/file-path.js";
import type { Finding } from "../domain/finding.js";
import type { ToolExecutionError } from "../errors/tool-execution-error.js";

/** What an external tool is pointed at: a project root and the files in scope. */
export interface ToolTarget {
  readonly projectRoot: FilePath;
  /** Files the scan selected, relative to `projectRoot`. Tools that only work whole-project may ignore it. */
  readonly files: readonly FilePath[];
}

/**
 * Wraps one external analysis tool (jscpd, dependency-cruiser, …) and
 * translates its output into domain `Finding`s.
 *
 * Contract:
 * - Never throws; tool crashes, timeouts, and unparseable output become a
 *   `ToolExecutionError`.
 * - Every returned `Finding` was built via the `finding` factory (so its
 *   position is validated) and has `Finding.tool === this.tool`.
 * - A tool that finds nothing returns `ok([])` — an empty result is not an
 *   error.
 * - Findings are raw tool output: triage into `Violation`s happens
 *   downstream, not in the adapter.
 * - Positions follow ADR-0004 (1-based, end-exclusive); the adapter owns
 *   the conversion from the tool's native coordinates.
 */
export interface ToolAdapterPort {
  /** Stable identifier of the wrapped tool, e.g. `"jscpd"`. */
  readonly tool: string;
  execute(target: ToolTarget): Promise<Result<readonly Finding[], ToolExecutionError>>;
}
