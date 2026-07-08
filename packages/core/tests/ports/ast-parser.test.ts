import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../../src/ports/ast-parser.js";

describe("LANGUAGES", () => {
  it("lists the P1-03 launch languages, frozen", () => {
    expect(LANGUAGES).toEqual(["typescript", "javascript", "python"]);
    expect(Object.isFrozen(LANGUAGES)).toBe(true);
  });
});
