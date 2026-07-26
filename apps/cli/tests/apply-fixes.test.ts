import { describe, expect, it } from "vitest";
import { filePath } from "@argus/core";
import { applyFixes } from "../src/apply-fixes.js";
import { makeViolation } from "./support.js";

const FILE = "src/example.ts";
const file = filePath(FILE)._unsafeUnwrap();

describe("applyFixes", () => {
  it("returns the source unchanged when no violation carries a fix", () => {
    const source = "const a = 1;\nconst b = 2;\n";
    const violations = [
      makeViolation({
        file: FILE,
        line: 1,
        column: 1,
        severity: "warning",
        rule: "r",
        message: "m",
      }),
    ];

    const application = applyFixes(source, violations);

    expect(application.result).toBe(source);
    expect(application.resolvedViolationIds.size).toBe(0);
  });

  it("overwrites the fix's range with its replacement", () => {
    const source = 'import { b } from "./b";\nimport { a } from "node:a";\n';
    const violation = makeViolation({
      file: FILE,
      line: 2,
      column: 1,
      severity: "warning",
      rule: "style/import-order",
      message: "m",
      fix: {
        position: {
          file: file,
          startLine: 1,
          startColumn: 1,
          endLine: 2,
          endColumn: 'import { a } from "node:a";'.length + 1,
        },
        replacement: 'import { a } from "node:a";\nimport { b } from "./b";',
      },
    });

    const application = applyFixes(source, [violation]);

    expect(application.result).toBe('import { a } from "node:a";\nimport { b } from "./b";\n');
    expect(application.resolvedViolationIds.has(violation.id)).toBe(true);
  });

  it("inserts at a zero-width (point) fix range instead of overwriting", () => {
    const source = "const a = 1\n";
    const violation = makeViolation({
      file: FILE,
      line: 1,
      column: 12,
      severity: "warning",
      rule: "r",
      message: "m",
      fix: {
        position: {
          file: file,
          startLine: 1,
          startColumn: 12,
          endLine: 1,
          endColumn: 12,
        },
        replacement: ";",
      },
    });

    const application = applyFixes(source, [violation]);

    expect(application.result).toBe("const a = 1;\n");
  });

  it("applies one identical fix shared by multiple violations exactly once, resolving all of them", () => {
    const fix = {
      position: {
        file: file,
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 6,
      },
      replacement: "XXXXX",
    };
    const source = "abcde\n";
    const a = makeViolation({
      file: FILE,
      line: 1,
      column: 1,
      severity: "warning",
      rule: "r1",
      message: "m1",
      fix,
    });
    const b = makeViolation({
      file: FILE,
      line: 1,
      column: 1,
      severity: "warning",
      rule: "r2",
      message: "m2",
      fix,
    });

    const application = applyFixes(source, [a, b]);

    expect(application.result).toBe("XXXXX\n");
    expect(application.resolvedViolationIds.has(a.id)).toBe(true);
    expect(application.resolvedViolationIds.has(b.id)).toBe(true);
  });

  it("keeps the earlier-starting fix and drops a later, overlapping one", () => {
    const source = "abcdefgh\n";
    const first = makeViolation({
      file: FILE,
      line: 1,
      column: 1,
      severity: "warning",
      rule: "r1",
      message: "m1",
      fix: {
        position: { file: file, startLine: 1, startColumn: 1, endLine: 1, endColumn: 5 },
        replacement: "ZZZZ",
      },
    });
    const overlapping = makeViolation({
      file: FILE,
      line: 1,
      column: 3,
      severity: "warning",
      rule: "r2",
      message: "m2",
      fix: {
        position: { file: file, startLine: 1, startColumn: 3, endLine: 1, endColumn: 7 },
        replacement: "YYYY",
      },
    });

    const application = applyFixes(source, [first, overlapping]);

    expect(application.result).toBe("ZZZZefgh\n");
    expect(application.resolvedViolationIds.has(first.id)).toBe(true);
    expect(application.resolvedViolationIds.has(overlapping.id)).toBe(false);
  });

  it("keeps only the first of two distinct insertions at the same offset", () => {
    const source = "ac\n";
    const point = { file, startLine: 1, startColumn: 2, endLine: 1, endColumn: 2 };
    const first = makeViolation({
      file: FILE,
      line: 1,
      column: 2,
      severity: "warning",
      rule: "r1",
      message: "m1",
      fix: { position: point, replacement: "b" },
    });
    const second = makeViolation({
      file: FILE,
      line: 1,
      column: 2,
      severity: "warning",
      rule: "r2",
      message: "m2",
      fix: { position: point, replacement: "Z" },
    });

    const application = applyFixes(source, [first, second]);

    // Not "abZc" — the documented policy is keep-the-earliest, drop the rest.
    expect(application.result).toBe("abc\n");
    expect(application.resolvedViolationIds.has(first.id)).toBe(true);
    expect(application.resolvedViolationIds.has(second.id)).toBe(false);
  });

  it("applies two non-overlapping fixes together", () => {
    const source = "aaaa bbbb\n";
    const first = makeViolation({
      file: FILE,
      line: 1,
      column: 1,
      severity: "warning",
      rule: "r1",
      message: "m1",
      fix: {
        position: { file: file, startLine: 1, startColumn: 1, endLine: 1, endColumn: 5 },
        replacement: "XXXX",
      },
    });
    const second = makeViolation({
      file: FILE,
      line: 1,
      column: 6,
      severity: "warning",
      rule: "r2",
      message: "m2",
      fix: {
        position: { file: file, startLine: 1, startColumn: 6, endLine: 1, endColumn: 10 },
        replacement: "YYYY",
      },
    });

    const application = applyFixes(source, [first, second]);

    expect(application.result).toBe("XXXX YYYY\n");
    expect(application.resolvedViolationIds.has(first.id)).toBe(true);
    expect(application.resolvedViolationIds.has(second.id)).toBe(true);
  });
});
