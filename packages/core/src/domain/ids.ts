import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import type { Brand } from "./brand.js";
import { Validator } from "./validation.js";

export type ProjectId = Brand<string, "ProjectId">;
export type ScanId = Brand<string, "ScanId">;
export type ViolationId = Brand<string, "ViolationId">;
export type SuppressionId = Brand<string, "SuppressionId">;

/** Opaque ids: any non-empty string free of whitespace and control characters (UUID, ULID, slug, …). */
const OPAQUE_ID = /^[^\s\p{Cc}]+$/u;

function opaqueIdFactory<Id extends string>(
  kind: string,
): (value: string) => Result<Id, ValidationError> {
  return (value) => {
    const validator = new Validator(kind);
    validator.matches(
      "value",
      value,
      OPAQUE_ID,
      "must be a non-empty string without whitespace or control characters",
    );
    return validator.toResult(() => value as Id);
  };
}

export const projectId = opaqueIdFactory<ProjectId>("ProjectId");
export const scanId = opaqueIdFactory<ScanId>("ScanId");
export const violationId = opaqueIdFactory<ViolationId>("ViolationId");
export const suppressionId = opaqueIdFactory<SuppressionId>("SuppressionId");
