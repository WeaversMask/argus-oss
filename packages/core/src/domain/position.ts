import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import type { FilePath } from "./file-path.js";
import { Validator } from "./validation.js";

/**
 * A source range within one file. Lines and columns are 1-based and
 * inclusive; a zero-width range (start == end) marks a point.
 */
export interface Position {
  readonly file: FilePath;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export function position(input: Position): Result<Position, ValidationError> {
  const validator = new Validator("Position");
  validator.integerAtLeast("startLine", input.startLine, 1);
  validator.integerAtLeast("startColumn", input.startColumn, 1);
  validator.integerAtLeast("endLine", input.endLine, 1);
  validator.integerAtLeast("endColumn", input.endColumn, 1);
  if (
    input.endLine < input.startLine ||
    (input.endLine === input.startLine && input.endColumn < input.startColumn)
  ) {
    validator.add("end", "must not precede start");
  }
  return validator.toResult(() =>
    Object.freeze({
      file: input.file,
      startLine: input.startLine,
      startColumn: input.startColumn,
      endLine: input.endLine,
      endColumn: input.endColumn,
    }),
  );
}
