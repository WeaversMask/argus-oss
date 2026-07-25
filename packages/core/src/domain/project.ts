import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import type { FilePath } from "./file-path.js";
import type { ProjectId } from "./ids.js";
import { Validator } from "./validation.js";

/** A codebase registered for scanning. */
export interface Project {
  readonly id: ProjectId;
  readonly name: string;
  readonly rootPath: FilePath;
}

/** Smart constructor: validates a {@link Project} and returns a frozen copy. */
export function project(input: Project): Result<Project, ValidationError> {
  const validator = new Validator("Project");
  validator.nonBlankString("name", input.name);
  return validator.toResult(() =>
    Object.freeze({
      id: input.id,
      name: input.name,
      rootPath: input.rootPath,
    }),
  );
}

/** Returns a new `Project`; the original is untouched. */
export function renameProject(current: Project, name: string): Result<Project, ValidationError> {
  return project({ id: current.id, name, rootPath: current.rootPath });
}
