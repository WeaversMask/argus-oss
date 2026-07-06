import { err, ok, type Result } from "neverthrow";
import type { Finding, ToolAdapterPort, ToolExecutionError, ToolTarget } from "@argus/core";

const NO_FINDINGS: readonly Finding[] = Object.freeze([]);

/**
 * Canned-response `ToolAdapterPort`: returns the findings set via
 * `respondWith` (empty until then) and records every target in
 * `executions`. Failure injection via `failNextWith`.
 */
export class FakeToolAdapter implements ToolAdapterPort {
  readonly tool: string;
  private findings: readonly Finding[] = NO_FINDINGS;
  private readonly recorded: ToolTarget[] = [];
  private nextError: ToolExecutionError | undefined;

  constructor(tool = "fake-tool") {
    this.tool = tool;
  }

  get executions(): readonly ToolTarget[] {
    return this.recorded;
  }

  respondWith(findings: readonly Finding[]): void {
    this.findings = Object.freeze([...findings]);
  }

  failNextWith(error: ToolExecutionError): void {
    this.nextError = error;
  }

  execute(target: ToolTarget): Promise<Result<readonly Finding[], ToolExecutionError>> {
    this.recorded.push(target);
    const error = this.nextError;
    this.nextError = undefined;
    if (error !== undefined) {
      return Promise.resolve(err(error));
    }
    return Promise.resolve(ok(this.findings));
  }
}
