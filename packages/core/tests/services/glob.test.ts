import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { matchGlob } from "../../src/services/glob.js";

/** Segment material free of glob syntax and separators. */
const plainSegment = fc.stringMatching(/^[a-z][a-z0-9_.-]{0,8}$/);
const plainPath = fc
  .array(plainSegment, { minLength: 1, maxLength: 5 })
  .map((segments) => segments.join("/"));

describe("matchGlob — deterministic cases", () => {
  it.each([
    // pattern, path, expected
    ["packages/core/**", "packages/core/src/index.ts", true],
    ["packages/core/**", "packages/core", true], // ** matches zero segments (documented)
    ["packages/core/**", "packages/config/src/index.ts", false],
    ["**/*.test.ts", "packages/core/tests/glob.test.ts", true],
    ["**/*.test.ts", "glob.test.ts", true],
    ["**/*.test.ts", "packages/core/src/glob.ts", false],
    ["src/*", "src/a.ts", true],
    ["src/*", "src/nested/a.ts", false], // * never crosses a separator
    ["src/?.ts", "src/a.ts", true],
    ["src/?.ts", "src/ab.ts", false],
    ["src/**/fixtures/*.yaml", "src/a/b/fixtures/x.yaml", true],
    ["src/**/fixtures/*.yaml", "src/fixtures/x.yaml", true], // zero middle segments
    ["src/**/fixtures/*.yaml", "src/a/fixtures/deep/x.yaml", false],
    ["exact/path.ts", "exact/path.ts", true],
    ["exact/path.ts", "exact/path.tsx", false],
    ["a*c", "abc", true],
    ["ab*", "ab", true], // trailing * may match nothing
    ["ab*", "abc", true],
    ["a*c", "ac", true],
    ["a*c", "abd", false],
    ["{a,b}.ts", "a.ts", false], // braces are literal, not alternation
    ["{a,b}.ts", "{a,b}.ts", true],
    ["**", "anything/at/all", true],
    ["**", "", true],
  ])("matchGlob(%j, %j) === %j", (pattern, path, expected) => {
    expect(matchGlob(pattern, path)).toBe(expected);
  });
});

describe("matchGlob — properties", () => {
  it("matches any plain path against itself (literal reflexivity)", () => {
    fc.assert(fc.property(plainPath, (path) => matchGlob(path, path)));
  });

  it("`prefix/**` matches the prefix and everything under it", () => {
    fc.assert(
      fc.property(plainPath, fc.array(plainSegment, { maxLength: 4 }), (prefix, rest) => {
        const path = rest.length === 0 ? prefix : `${prefix}/${rest.join("/")}`;
        return matchGlob(`${prefix}/**`, path);
      }),
    );
  });

  it("`*` never matches across a separator", () => {
    fc.assert(
      fc.property(plainSegment, plainSegment, plainSegment, (a, b, c) => {
        return !matchGlob(`${a}/*`, `${a}/${b}/${c}`);
      }),
    );
  });

  it("replacing any single character of a plain segment with ? still matches", () => {
    fc.assert(
      fc.property(plainSegment, fc.nat(), (segment, seed) => {
        const index = seed % segment.length;
        const pattern = `${segment.slice(0, index)}?${segment.slice(index + 1)}`;
        return matchGlob(pattern, segment);
      }),
    );
  });

  it("never throws, whatever the inputs (fuzz)", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (pattern, path) => {
        matchGlob(pattern, path); // any boolean is fine; throwing is the failure
        return true;
      }),
    );
  });

  it("a match is preserved when both sides gain the same literal prefix segment", () => {
    fc.assert(
      fc.property(plainSegment, plainPath, plainPath, (prefix, pattern, path) => {
        return matchGlob(pattern, path) === matchGlob(`${prefix}/${pattern}`, `${prefix}/${path}`);
      }),
    );
  });
});
