import fc from "fast-check";
import { describe, it } from "vitest";
import { maxFileLength } from "../src/quality/max-file-length.js";
import { maxFunctionLength } from "../src/quality/max-function-length.js";
import { maxNestingDepth } from "../src/quality/max-nesting-depth.js";
import { namingConvention } from "../src/style/naming-convention.js";
import { runRule } from "./harness.js";

/**
 * Property-based tests for the rules that state a law over an unbounded input
 * space (principles §Testing — property tests for metric calculations). Each
 * pins the rule's threshold/law across many generated inputs rather than a
 * handful of fixtures.
 */

const lowerWord = fc
  .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")), { minLength: 1, maxLength: 6 })
  .map((chars) => chars.join(""));

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

describe("property: max-file-length threshold", () => {
  it("reports iff line count exceeds max", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 40 }),
        fc.integer({ min: 1, max: 40 }),
        async (n, max) => {
          const source = Array.from({ length: n }, (_, i) => `const a${i} = ${i};`).join("\n");
          const violations = await runRule(maxFileLength, source, { options: { max } });
          return violations.length > 0 === n > max;
        },
      ),
      { numRuns: 80 },
    );
  });
});

describe("property: max-function-length threshold", () => {
  it("reports iff the function's line span exceeds max", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 25 }),
        fc.integer({ min: 1, max: 25 }),
        async (bodyLines, max) => {
          const body = Array.from({ length: bodyLines }, (_, i) => `  const a${i} = ${i};`);
          const source = ["function f() {", ...body, "}"].join("\n");
          const span = bodyLines + 2; // signature + body + closing brace
          const violations = await runRule(maxFunctionLength, source, { options: { max } });
          return violations.length > 0 === span > max;
        },
      ),
      { numRuns: 80 },
    );
  });
});

describe("property: naming-convention", () => {
  it("never flags a camelCase variable and always flags a snake_case one", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(lowerWord, { minLength: 2, maxLength: 4 }), async (words) => {
        const [head, ...rest] = words as [string, ...string[]];
        const camel = head + rest.map(capitalize).join("");
        const snake = words.join("_");
        const camelViolations = await runRule(namingConvention, `const ${camel} = 1;`);
        const snakeViolations = await runRule(namingConvention, `const ${snake} = 1;`);
        return camelViolations.length === 0 && snakeViolations.length > 0;
      }),
      { numRuns: 60 },
    );
  });
});

describe("property: max-nesting-depth", () => {
  it("never flags an else-if ladder of any length at depth budget 1", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 12 }), async (k) => {
        const clauses = Array.from({ length: k }, (_, i) => `if (n === ${i}) {}`).join(" else ");
        const source = `function f(n: number) { ${clauses} }`;
        const violations = await runRule(maxNestingDepth, source, { options: { max: 1 } });
        return violations.length === 0;
      }),
      { numRuns: 40 },
    );
  });
});
