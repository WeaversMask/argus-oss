import type { FilePath } from "../domain/file-path.js";
import { DomainError } from "./domain-error.js";

/**
 * An external formatter failed to format source text (`FormatterPort`).
 *
 * Final: instances freeze themselves in the constructor — compose rather
 * than extend (see `ValidationError`).
 */
export class FormatError extends DomainError {
  override readonly name = "FormatError";
  readonly code = "core/format";
  readonly file: FilePath;

  constructor(file: FilePath, message: string) {
    super(`Format "${file}": ${message}`);
    this.file = file;
    Object.freeze(this);
  }
}
