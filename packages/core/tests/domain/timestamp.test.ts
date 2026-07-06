import { describe, expect, it } from "vitest";
import { timestamp } from "../../src/domain/timestamp.js";

describe("timestamp", () => {
  it("accepts the epoch itself and any later integer instant", () => {
    expect(timestamp(0)._unsafeUnwrap()).toBe(0);
    expect(timestamp(1_750_000_000_000)._unsafeUnwrap()).toBe(1_750_000_000_000);
  });

  it.each([
    ["fractional", 1.5],
    ["negative", -1],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("rejects %s", (_label, value) => {
    const error = timestamp(value)._unsafeUnwrapErr();
    expect(error.issues).toEqual([{ path: "epochMs", message: "must be an integer >= 0" }]);
  });
});
