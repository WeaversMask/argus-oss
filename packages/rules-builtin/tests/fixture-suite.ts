import { describe, expect, it } from "vitest";
import type { RuleModule } from "@argus/rule-engine";
import { loadFixtures, runRule } from "./harness.js";

/**
 * The baseline TDD contract every built-in rule must satisfy: each file under
 * `valid/` reports **zero** violations, and each file under `invalid/` reports
 * **at least one**. Rule-specific tests add message/position/count assertions
 * on top; this guards the fixture corpus itself (≥5 valid + ≥5 invalid per
 * rule, P2-01 acceptance).
 */
export function fixtureSuite(
  module: RuleModule,
  rulePath: string,
  options: Readonly<Record<string, unknown>> = {},
): void {
  const valid = loadFixtures(rulePath, "valid");
  const invalid = loadFixtures(rulePath, "invalid");

  describe(`${rulePath} fixtures`, () => {
    it("has at least 5 valid and 5 invalid fixtures", () => {
      expect(valid.length).toBeGreaterThanOrEqual(5);
      expect(invalid.length).toBeGreaterThanOrEqual(5);
    });

    describe("valid", () => {
      for (const fixture of valid) {
        it(`${fixture.name} → no violations`, async () => {
          const violations = await runRule(module, fixture.source, {
            file: fixture.file,
            options,
            language: fixture.language,
          });
          expect(violations).toEqual([]);
        });
      }
    });

    describe("invalid", () => {
      for (const fixture of invalid) {
        it(`${fixture.name} → reports`, async () => {
          const violations = await runRule(module, fixture.source, {
            file: fixture.file,
            options,
            language: fixture.language,
          });
          expect(violations.length).toBeGreaterThan(0);
        });
      }
    });
  });
}
