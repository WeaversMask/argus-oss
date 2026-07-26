import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { unifiedDiff } from "../src/diff.js";
import { tempDir } from "./support.js";

/**
 * Applies `diff` to a throwaway git repo containing `before` and asserts the
 * result is exactly `after`. `toContain` assertions cannot catch hunk-header
 * arithmetic — only a real patch tool can (review #39 MEDIUM-2).
 */
function appliesCleanly(before: string, after: string, name = "f.ts"): void {
  const { dir, cleanup } = tempDir();
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    mkdirSync(`${dir}/sub`, { recursive: true });
    writeFileSync(`${dir}/${name}`, before);
    const patch = unifiedDiff(name, before, after);
    writeFileSync(`${dir}/p.diff`, patch);
    execFileSync("git", ["apply", "-p0", "p.diff"], { cwd: dir });
    expect(execFileSync("cat", [name], { cwd: dir, encoding: "utf8" })).toBe(after);
  } finally {
    cleanup();
  }
}

describe("unifiedDiff", () => {
  it("returns an empty string when nothing changed", () => {
    expect(unifiedDiff("a.ts", "same\n", "same\n")).toBe("");
  });

  it("renders a single changed line with a hunk header and +/- markers", () => {
    const before = "one\ntwo\nthree\n";
    const after = "one\nTWO\nthree\n";

    const diff = unifiedDiff("a.ts", before, after);

    expect(diff).toContain("--- a.ts");
    expect(diff).toContain("+++ a.ts");
    expect(diff).toContain("-two");
    expect(diff).toContain("+TWO");
    // Unchanged context lines still appear, unmarked (space prefix):
    expect(diff).toContain(" one");
    expect(diff).toContain(" three");
  });

  it("limits context to 3 lines on each side of the change", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line${i}`);
    const before = `${lines.join("\n")}\n`;
    const changed = [...lines];
    changed[5] = "CHANGED";
    const after = `${changed.join("\n")}\n`;

    const diff = unifiedDiff("a.ts", before, after);

    // line1 is 4 lines before the change (index 5) — outside the 3-line window.
    expect(diff).not.toContain("line1\n");
    expect(diff).toContain(" line2");
    expect(diff).toContain(" line3");
    expect(diff).toContain(" line4");
    expect(diff).toContain("-line5");
    expect(diff).toContain("+CHANGED");
    expect(diff).toContain(" line6");
    expect(diff).toContain(" line7");
    expect(diff).toContain(" line8");
    expect(diff).not.toContain(" line9");
  });

  it("handles a pure insertion (nothing removed)", () => {
    const diff = unifiedDiff("a.ts", "a\nc\n", "a\nb\nc\n");
    expect(diff).toContain("+b");
    // No genuine removed-line marker — `[^-]` excludes the `--- a.ts` header.
    expect(diff).not.toMatch(/^-[^-]/m);
  });

  it("handles a pure deletion (nothing added)", () => {
    const diff = unifiedDiff("a.ts", "a\nb\nc\n", "a\nc\n");
    expect(diff).toContain("-b");
    // No genuine added-line marker — `[^+]` excludes the `+++ a.ts` header.
    expect(diff).not.toMatch(/^\+[^+]/m);
  });

  it("handles a change with no common prefix or suffix at all", () => {
    const diff = unifiedDiff("a.ts", "x\ny\n", "p\nq\n");
    expect(diff).toContain("-x");
    expect(diff).toContain("-y");
    expect(diff).toContain("+p");
    expect(diff).toContain("+q");
  });

  it("reflects a trailing-newline-only difference", () => {
    const diff = unifiedDiff("a.ts", "a\n", "a");
    expect(diff).not.toBe("");
  });

  it("does not emit a phantom trailing context line for a newline-terminated file", () => {
    const diff = unifiedDiff("a.ts", "one\ntwo\nthree\n", "one\nTWO\nthree\n");
    // The old bug rendered split()'s trailing "" as a bare " " line and counted
    // it, inflating both hunk counts by one.
    expect(diff.endsWith(" three\n")).toBe(true);
    expect(diff).toContain("@@ -1,3 +1,3 @@");
  });

  describe("output is a valid patch (verified with git apply)", () => {
    it("applies for a single changed line", () => {
      appliesCleanly("one\ntwo\nthree\n", "one\nTWO\nthree\n");
    });

    it("applies for a realistic import reorder", () => {
      appliesCleanly(
        'import a from "./a.js";\nimport fs from "node:fs";\n\nexport const x = 1;\n',
        'import fs from "node:fs";\nimport a from "./a.js";\n\nexport const x = 1;\n',
      );
    });

    it("applies for a pure insertion", () => {
      appliesCleanly("a\nc\n", "a\nb\nc\n");
    });

    it("applies for a pure deletion", () => {
      appliesCleanly("a\nb\nc\n", "a\nc\n");
    });

    it("applies for a change at the very end of a file", () => {
      appliesCleanly("a\nb\nlast\n", "a\nb\nLAST\n");
    });

    it("applies when the original file has no trailing newline", () => {
      appliesCleanly("a\nb\nlast", "a\nb\nLAST\n");
    });

    it("applies for a file with more than 3 lines of context on both sides", () => {
      const lines = Array.from({ length: 12 }, (_, i) => `line${i}`);
      const before = `${lines.join("\n")}\n`;
      const changed = [...lines];
      changed[6] = "CHANGED";
      appliesCleanly(before, `${changed.join("\n")}\n`);
    });
  });
});
