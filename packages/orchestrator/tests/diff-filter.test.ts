import { describe, expect, it } from "vitest";
import { filterToChangedLines } from "../src/index.js";
import type { ChangeSet, LineRange } from "../src/index.js";
import { violationAt } from "./support.js";

/** A change set covering the given ranges of one file. */
function changed(file: string, ...ranges: readonly (readonly [number, number])[]): ChangeSet {
  const asRanges: LineRange[] = ranges.map(([start, end]) => ({ start, end }));
  return new Map([[file, { ranges: asRanges, whole: false }]]);
}

const FILE = "src/a.ts";

describe("filterToChangedLines", () => {
  it("keeps a violation that starts on a changed line", () => {
    const kept = violationAt({ file: FILE, startLine: 10 });

    expect(filterToChangedLines([kept], changed(FILE, [10, 12]))).toEqual([kept]);
  });

  it("drops a violation entirely above the changed range", () => {
    const violation = violationAt({ file: FILE, startLine: 3, endLine: 4 });

    expect(filterToChangedLines([violation], changed(FILE, [10, 12]))).toEqual([]);
  });

  it("drops a violation entirely below the changed range", () => {
    const violation = violationAt({ file: FILE, startLine: 40 });

    expect(filterToChangedLines([violation], changed(FILE, [10, 12]))).toEqual([]);
  });

  /**
   * The reason the test is overlap and not containment: a long-function
   * violation spans the whole function, and editing three lines inside it is
   * exactly when its length is worth raising.
   */
  it("keeps a violation that spans a changed line without starting on one", () => {
    const kept = violationAt({ file: FILE, startLine: 5, endLine: 80 });

    expect(filterToChangedLines([kept], changed(FILE, [30, 32]))).toEqual([kept]);
  });

  it("keeps a violation that ends on the first changed line", () => {
    const kept = violationAt({ file: FILE, startLine: 8, endLine: 10, endColumn: 4 });

    expect(filterToChangedLines([kept], changed(FILE, [10, 12]))).toEqual([kept]);
  });

  it("drops a violation that ends one line above the changed range", () => {
    const violation = violationAt({ file: FILE, startLine: 8, endLine: 9, endColumn: 4 });

    expect(filterToChangedLines([violation], changed(FILE, [10, 12]))).toEqual([]);
  });

  /**
   * Positions are end-exclusive over (line, column) pairs (ADR-0004), so a
   * range ending at column 1 of line 10 stops before anything on line 10.
   * Counting it would resurrect a violation on the strength of an edit to the
   * blank line beneath it.
   */
  it("treats an end at column 1 as stopping on the previous line", () => {
    const violation = violationAt({
      file: FILE,
      startLine: 5,
      endLine: 10,
      startColumn: 1,
      endColumn: 1,
    });

    expect(filterToChangedLines([violation], changed(FILE, [10, 10]))).toEqual([]);
    expect(filterToChangedLines([violation], changed(FILE, [9, 9]))).toEqual([violation]);
  });

  it("keeps a zero-width position sitting on a changed line", () => {
    const kept = violationAt({ file: FILE, startLine: 7, startColumn: 1, endColumn: 1 });

    expect(filterToChangedLines([kept], changed(FILE, [7, 7]))).toEqual([kept]);
  });

  it("matches against any of several ranges in one file", () => {
    const first = violationAt({ file: FILE, startLine: 2 });
    const second = violationAt({ file: FILE, startLine: 50 });
    const between = violationAt({ file: FILE, startLine: 25 });

    const kept = filterToChangedLines([first, between, second], changed(FILE, [1, 3], [49, 51]));

    expect(kept).toEqual([first, second]);
  });

  it("drops everything in a file the diff did not touch", () => {
    const violation = violationAt({ file: "src/other.ts", startLine: 10 });

    expect(filterToChangedLines([violation], changed(FILE, [1, 100]))).toEqual([]);
  });

  it("keeps every violation in an untracked file, whatever its line", () => {
    const early = violationAt({ file: FILE, startLine: 1 });
    const late = violationAt({ file: FILE, startLine: 900 });
    const whole: ChangeSet = new Map([[FILE, { ranges: [], whole: true }]]);

    expect(filterToChangedLines([early, late], whole)).toEqual([early, late]);
  });

  it("preserves the engine's ordering", () => {
    const third = violationAt({ file: FILE, startLine: 30 });
    const first = violationAt({ file: FILE, startLine: 10 });
    const second = violationAt({ file: FILE, startLine: 20 });

    const kept = filterToChangedLines([third, first, second], changed(FILE, [1, 100]));

    expect(kept.map((violation) => violation.position.startLine)).toEqual([30, 10, 20]);
  });

  it("reports nothing for an empty change set", () => {
    const violation = violationAt({ file: FILE, startLine: 10 });

    expect(filterToChangedLines([violation], new Map())).toEqual([]);
  });
});
