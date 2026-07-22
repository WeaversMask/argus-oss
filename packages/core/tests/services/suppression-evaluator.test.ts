import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { matchingSuppression } from "../../src/services/suppression-evaluator.js";
import { at, suppressionOf, violationAt } from "./helpers.js";

const NOW = 2_000;

describe("matchingSuppression", () => {
  const violation = violationAt("src/legacy/old.ts");

  it("matches rule + path and returns the suppression itself", () => {
    const matched = suppressionOf({ pathPattern: "src/legacy/**" });
    expect(matchingSuppression(violation, [matched], at(NOW))).toBe(matched);
  });

  it("does not match a different rule id", () => {
    const other = suppressionOf({ rule: "style/no-var", pathPattern: "src/legacy/**" });
    expect(matchingSuppression(violation, [other], at(NOW))).toBeUndefined();
  });

  it("does not match a non-matching path pattern", () => {
    const elsewhere = suppressionOf({ pathPattern: "src/modern/**" });
    expect(matchingSuppression(violation, [elsewhere], at(NOW))).toBeUndefined();
  });

  it("an expired suppression never matches (expiry is inclusive)", () => {
    const expired = suppressionOf({ pathPattern: "src/legacy/**", expiresAt: NOW });
    expect(matchingSuppression(violation, [expired], at(NOW))).toBeUndefined();
    expect(matchingSuppression(violation, [expired], at(NOW - 1))).toBe(expired);
  });

  it("a suppression without expiresAt never expires", () => {
    const evergreen = suppressionOf({ pathPattern: "src/**" });
    expect(matchingSuppression(violation, [evergreen], at(Number.MAX_SAFE_INTEGER))).toBe(
      evergreen,
    );
  });

  it("first match in array order wins", () => {
    const first = suppressionOf({ pathPattern: "src/**", id: "s-first" });
    const second = suppressionOf({ pathPattern: "src/legacy/**", id: "s-second" });
    expect(matchingSuppression(violation, [first, second], at(NOW))?.id).toBe("s-first");
  });

  it("empty suppression list matches nothing", () => {
    expect(matchingSuppression(violation, [], at(NOW))).toBeUndefined();
  });

  describe("properties", () => {
    it("expired suppressions never match, whatever the clock skew (edge: expired suppressions)", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1_001, max: 1_000_000 }),
          fc.integer({ min: 0, max: 1_000_000 }),
          (expiresAt, delta) => {
            const candidate = suppressionOf({ pathPattern: "**", expiresAt });
            const now = at(expiresAt + delta);
            return matchingSuppression(violation, [candidate], now) === undefined;
          },
        ),
      );
    });

    it("an unexpired same-rule `**` suppression always matches", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1_001, max: 1_000_000 }), (expiresAt) => {
          const candidate = suppressionOf({ pathPattern: "**", expiresAt });
          return matchingSuppression(violation, [candidate], at(expiresAt - 1)) === candidate;
        }),
      );
    });
  });
});
