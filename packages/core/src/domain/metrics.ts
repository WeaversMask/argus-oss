import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import { Validator } from "./validation.js";

/** Halstead complexity bundle. All values are non-negative; most are derived, hence non-integer. */
export interface HalsteadMetrics {
  readonly vocabulary: number;
  readonly length: number;
  readonly volume: number;
  readonly difficulty: number;
  readonly effort: number;
}

/** Complexity metrics for one unit of code (function, file, …). */
export interface Metrics {
  readonly cyclomatic: number;
  readonly cognitive: number;
  readonly halstead: HalsteadMetrics;
}

const HALSTEAD_FIELDS = ["vocabulary", "length", "volume", "difficulty", "effort"] as const;

/** Smart constructor: validates a {@link Metrics} bundle (non-negative values, cyclomatic ≥ 1) and returns a frozen copy. */
export function metrics(input: Metrics): Result<Metrics, ValidationError> {
  const validator = new Validator("Metrics");
  // Cyclomatic complexity has a floor of 1 by definition (one linear path).
  validator.integerAtLeast("cyclomatic", input.cyclomatic, 1);
  validator.integerAtLeast("cognitive", input.cognitive, 0);
  for (const field of HALSTEAD_FIELDS) {
    validator.finiteAtLeast(`halstead.${field}`, input.halstead[field], 0);
  }
  return validator.toResult(() =>
    Object.freeze({
      cyclomatic: input.cyclomatic,
      cognitive: input.cognitive,
      halstead: Object.freeze({
        vocabulary: input.halstead.vocabulary,
        length: input.halstead.length,
        volume: input.halstead.volume,
        difficulty: input.halstead.difficulty,
        effort: input.halstead.effort,
      }),
    }),
  );
}
