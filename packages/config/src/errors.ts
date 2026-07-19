import { DomainError } from "@argus/core";

/**
 * One problem found while loading or validating configuration. `line` and
 * `column` are 1-based and present whenever the issue maps to a spot in a
 * YAML document; `path` is the dot-path of the offending value (`""` when
 * the issue concerns the document or file as a whole).
 */
export interface ConfigIssue {
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
  readonly path: string;
  readonly message: string;
}

function formatIssue(issue: ConfigIssue): string {
  const location =
    issue.line === undefined
      ? issue.file
      : `${issue.file}:${String(issue.line)}:${String(issue.column ?? 1)}`;
  return issue.path === ""
    ? `${location} — ${issue.message}`
    : `${location} ${issue.path} — ${issue.message}`;
}

/**
 * Configuration could not be loaded, parsed, or validated. Carries every
 * issue found (not just the first) with file/line/column so the message
 * points at the exact spot to fix (P1-05 acceptance).
 *
 * Final: instances freeze themselves in the constructor — compose rather
 * than extend (mirrors core's error classes).
 */
export class ConfigError extends DomainError {
  override readonly name = "ConfigError";
  readonly code = "config/invalid";
  readonly issues: readonly ConfigIssue[];

  constructor(context: string, issues: readonly ConfigIssue[]) {
    super(`${context}: ${issues.map(formatIssue).join("; ")}`);
    this.issues = Object.freeze(issues.map((issue) => Object.freeze({ ...issue })));
    Object.freeze(this);
  }
}
