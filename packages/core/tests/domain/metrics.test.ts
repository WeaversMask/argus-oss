import { describe, expect, it } from "vitest";
import { metrics, type Metrics } from "../../src/domain/metrics.js";

const base: Metrics = {
  cyclomatic: 4,
  cognitive: 0,
  halstead: { vocabulary: 20, length: 55, volume: 237.7, difficulty: 8.5, effort: 2020.45 },
};

describe("metrics", () => {
  it("accepts a valid bundle and deep-freezes it", () => {
    const result = metrics(base)._unsafeUnwrap();
    expect(result).toEqual(base);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.halstead)).toBe(true);
  });

  it("cyclomatic complexity has a floor of 1", () => {
    expect(metrics({ ...base, cyclomatic: 1 }).isOk()).toBe(true);
    const error = metrics({ ...base, cyclomatic: 0 })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toEqual(["cyclomatic"]);
  });

  it("cognitive complexity may be 0 but not negative or fractional", () => {
    const error = metrics({ ...base, cognitive: -1 })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toEqual(["cognitive"]);
    expect(metrics({ ...base, cognitive: 2.5 }).isErr()).toBe(true);
  });

  it.each(["vocabulary", "length", "volume", "difficulty", "effort"] as const)(
    "rejects negative or non-finite halstead.%s",
    (field) => {
      const negative = metrics({ ...base, halstead: { ...base.halstead, [field]: -0.1 } });
      expect(negative._unsafeUnwrapErr().issues.map((issue) => issue.path)).toEqual([
        `halstead.${field}`,
      ]);
      const infinite = metrics({
        ...base,
        halstead: { ...base.halstead, [field]: Number.POSITIVE_INFINITY },
      });
      expect(infinite.isErr()).toBe(true);
    },
  );
});
