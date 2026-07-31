import { describe, expect, it } from "vitest";
import { message } from "../src/prettier-formatter.js";

describe("message", () => {
  it("uses an Error's own message", () => {
    expect(message(new SyntaxError("Unexpected token"))).toBe("Unexpected token");
  });

  it("stringifies a non-Error throw", () => {
    expect(message("boom")).toBe("boom");
    expect(message(42)).toBe("42");
  });
});
