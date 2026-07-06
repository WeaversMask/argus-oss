import { DomainError } from "./domain-error.js";

/**
 * An external analysis tool failed to run or produced unusable output
 * (`ToolAdapterPort`). `tool` matches `Finding.tool` / `ToolAdapterPort.tool`.
 *
 * Final: instances freeze themselves in the constructor — compose rather
 * than extend (see `ValidationError`).
 */
export class ToolExecutionError extends DomainError {
  override readonly name = "ToolExecutionError";
  readonly code = "core/tool-execution";
  readonly tool: string;

  constructor(tool: string, message: string) {
    super(`Tool "${tool}": ${message}`);
    this.tool = tool;
    Object.freeze(this);
  }
}
