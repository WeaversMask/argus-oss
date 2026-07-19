import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { scoreConformance } from "../../src/services/conformance-scorer.js";
import { file, manifestOf, violationAt } from "./helpers.js";

const MANIFEST = manifestOf([
  ["domain", ["core/**"]],
  ["ui", ["ui/**"]],
]);

const FILES = [
  file("core/a.ts"),
  file("core/b.ts"),
  file("core/c.ts"),
  file("core/d.ts"),
  file("ui/x.tsx"),
  file("unowned/z.ts"),
];

describe("scoreConformance", () => {
  it("scores per layer in manifest order, counting violating files once", () => {
    const scores = scoreConformance(FILES, MANIFEST, [
      violationAt("core/a.ts"),
      violationAt("core/a.ts", "style/no-var"), // same file, second violation
      violationAt("ui/x.tsx"),
    ]);

    expect(scores.map((score) => score.layer)).toEqual(["domain", "ui"]);
    expect(scores[0]).toMatchObject({ totalFiles: 4, violatingFiles: 1, conformancePct: 75 });
    expect(scores[1]).toMatchObject({ totalFiles: 1, violatingFiles: 1, conformancePct: 0 });
  });

  it("gives an empty layer 100% (nothing there to violate)", () => {
    const scores = scoreConformance([file("core/a.ts")], MANIFEST, []);
    expect(scores[1]).toMatchObject({ totalFiles: 0, violatingFiles: 0, conformancePct: 100 });
  });

  it("deduplicates repeated file entries", () => {
    const scores = scoreConformance(
      [file("core/a.ts"), file("core/a.ts"), file("core/a.ts")],
      MANIFEST,
      [],
    );
    expect(scores[0]!.totalFiles).toBe(1);
  });

  it("ignores violations in files outside the scanned list or outside every layer", () => {
    const scores = scoreConformance(FILES, MANIFEST, [
      violationAt("core/not-scanned.ts"), // classifiable, but not in files
      violationAt("unowned/z.ts"), // scanned, but no layer claims it
    ]);
    expect(scores[0]!.violatingFiles).toBe(0);
    expect(scores[1]!.violatingFiles).toBe(0);
  });

  it("returns frozen output", () => {
    const scores = scoreConformance(FILES, MANIFEST, []);
    expect(Object.isFrozen(scores)).toBe(true);
    expect(Object.isFrozen(scores[0])).toBe(true);
  });

  describe("properties", () => {
    const coreFile = fc.stringMatching(/^[a-z][a-z0-9]{0,6}$/).map((stem) => `core/${stem}.ts`);
    const fileList = fc.uniqueArray(coreFile, { minLength: 1, maxLength: 12 });

    it("percentages always sit in [0, 100] and violatingFiles ≤ totalFiles", () => {
      fc.assert(
        fc.property(fileList, fc.array(fc.nat(), { maxLength: 12 }), (paths, picks) => {
          const files = paths.map(file);
          const violations = picks.map((pick) => violationAt(paths[pick % paths.length]!));
          return scoreConformance(files, MANIFEST, violations).every(
            (score) =>
              score.conformancePct >= 0 &&
              score.conformancePct <= 100 &&
              score.violatingFiles <= score.totalFiles,
          );
        }),
      );
    });

    it("adding a violation never raises any layer's percentage (monotonicity)", () => {
      fc.assert(
        fc.property(
          fileList,
          fc.array(fc.nat(), { maxLength: 8 }),
          fc.nat(),
          (paths, picks, extra) => {
            const files = paths.map(file);
            const violations = picks.map((pick) => violationAt(paths[pick % paths.length]!));
            const added = violationAt(paths[extra % paths.length]!, "style/extra-rule");
            const before = scoreConformance(files, MANIFEST, violations);
            const after = scoreConformance(files, MANIFEST, [...violations, added]);
            return after.every(
              (score, index) => score.conformancePct <= before[index]!.conformancePct,
            );
          },
        ),
      );
    });

    it("no violations means every populated layer scores exactly 100", () => {
      fc.assert(
        fc.property(fileList, (paths) => {
          return scoreConformance(paths.map(file), MANIFEST, []).every(
            (score) => score.conformancePct === 100,
          );
        }),
      );
    });
  });
});
