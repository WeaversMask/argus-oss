import type { FilePath } from "../domain/file-path.js";
import { DomainError } from "./domain-error.js";

/**
 * A source file could not be parsed into an AST (`AstParserPort`).
 * Grammar-level trouble only — an unsupported language is a programming
 * error (callers must check `AstParserPort.languages` first).
 *
 * Final: instances freeze themselves in the constructor — compose rather
 * than extend (see `ValidationError`).
 */
export class ParseError extends DomainError {
  override readonly name = "ParseError";
  readonly code = "core/parse";
  readonly file: FilePath;

  constructor(file: FilePath, message: string) {
    super(`Parse "${file}": ${message}`);
    this.file = file;
    Object.freeze(this);
  }
}
