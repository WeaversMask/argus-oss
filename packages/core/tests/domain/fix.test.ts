import { describe, expect, it } from "vitest";
import { fix } from "../../src/domain/fix.js";
import { somePosition } from "../fixtures.js";

describe("fix", () => {
  it("accepts a replacement and freezes the result", () => {
    const input = { position: somePosition(), replacement: "const x = 1;" };
    const result = fix(input)._unsafeUnwrap();
    expect(result).toEqual(input);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("accepts an empty replacement (pure deletion)", () => {
    const input = { position: somePosition(), replacement: "" };
    expect(fix(input)._unsafeUnwrap().replacement).toBe("");
  });

  it("re-validates an embedded position literal, reporting issues under position.*", () => {
    const zeroBased = {
      file: somePosition().file,
      startLine: 0,
      startColumn: 0,
      endLine: 0,
      endColumn: 0,
    };
    const error = fix({ position: zeroBased, replacement: "x" })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toEqual([
      "position.startLine",
      "position.startColumn",
      "position.endLine",
      "position.endColumn",
    ]);
  });

  it("replaces an embedded position literal with the factory's frozen copy", () => {
    const literal = {
      file: somePosition().file,
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 1,
    };
    const result = fix({ position: literal, replacement: "x" })._unsafeUnwrap();
    expect(Object.isFrozen(result.position)).toBe(true);
    expect(result.position).not.toBe(literal);
  });
});
