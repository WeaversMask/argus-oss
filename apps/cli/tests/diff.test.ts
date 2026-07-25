import { describe, expect, it } from "vitest";
import { unifiedDiff } from "../src/diff.js";

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
});
