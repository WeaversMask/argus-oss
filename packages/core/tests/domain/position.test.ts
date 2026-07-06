import { describe, expect, it } from "vitest";
import { position } from "../../src/domain/position.js";
import { someFilePath } from "../fixtures.js";

const base = {
  file: someFilePath(),
  startLine: 3,
  startColumn: 7,
  endLine: 5,
  endColumn: 2,
};

describe("position", () => {
  it("accepts multi-line ranges and freezes the result", () => {
    const result = position(base)._unsafeUnwrap();
    expect(result).toEqual(base);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("accepts a zero-width point (start == end)", () => {
    const point = { ...base, endLine: 3, endColumn: 7 };
    expect(position(point)._unsafeUnwrap()).toEqual(point);
  });

  it.each([
    ["startLine", 0],
    ["startColumn", -1],
    ["endLine", 1.5],
    ["endColumn", Number.NaN],
  ])("rejects non-positive-integer %s", (field, value) => {
    const error = position({ ...base, [field]: value })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toContain(field);
  });

  it("rejects an end line before the start line", () => {
    const error = position({ ...base, endLine: 2 })._unsafeUnwrapErr();
    expect(error.issues).toEqual([{ path: "end", message: "must not precede start" }]);
  });

  it("rejects a same-line end column before the start column", () => {
    const error = position({ ...base, endLine: 3, endColumn: 6 })._unsafeUnwrapErr();
    expect(error.issues).toEqual([{ path: "end", message: "must not precede start" }]);
  });

  it("collects every issue in one error, joined in the message", () => {
    const error = position({ ...base, startLine: 0, endColumn: 0 })._unsafeUnwrapErr();
    expect(error.issues).toHaveLength(2);
    expect(error.message).toContain("startLine");
    expect(error.message).toContain("endColumn");
    expect(error.message).toContain("; ");
  });
});
