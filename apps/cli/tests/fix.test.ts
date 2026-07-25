import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCheck } from "../src/check.js";
import { runFix } from "../src/fix.js";
import type { FixOptions } from "../src/fix.js";
import { captureIO, tempDir } from "./support.js";

const REAL: FixOptions = { dryRun: false };
const DRY_RUN: FixOptions = { dryRun: true };

const REVERSED_IMPORTS =
  'import { local } from "./local";\nimport { readFile } from "node:fs";\n\nexport const x = [local, readFile];\n';
const CLEAN = "export const value = 1;\n";
// Documented, so only max-function-length (not require-jsdoc too) fires
// under STRICT_LENGTH_CONFIG below — isolates the test to one rule.
const ONE_LINE_FN = "/** f. */\nexport function f() {\n  return 1;\n}\n";
// max-function-length has no fixer (needs a logic refactor) — max: 1 makes
// the 3-line ONE_LINE_FN violate it, so this exercises "unfixable violation
// remains" without hitting the invalid-option failure path below.
const STRICT_LENGTH_CONFIG =
  "rules:\n  quality/max-function-length:\n    severity: warning\n    options:\n      max: 1\n";
// positiveIntOption throws on max < 1 — this is a deliberately INVALID
// option, distinct from STRICT_LENGTH_CONFIG above: it produces a rule
// EXECUTION FAILURE (exit 2), not a normal violation.
const INVALID_OPTION_CONFIG =
  "rules:\n  quality/max-function-length:\n    severity: warning\n    options:\n      max: 0\n";

let dir: string;
let cleanup: () => void;

function write(relative: string, content: string): void {
  const full = path.join(dir, relative);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function read(relative: string): string {
  return readFileSync(path.join(dir, relative), "utf8");
}

beforeEach(() => {
  ({ dir, cleanup } = tempDir());
});

afterEach(() => {
  cleanup();
});

describe("runFix", () => {
  it("exits 0 and says so when nothing is fixable", async () => {
    write("src/clean.ts", CLEAN);
    const io = captureIO(dir);

    expect(await runFix(".", REAL, io)).toBe(0);
    expect(io.out()).toContain("no fixable violations found");
  });

  it("fixes a reorderable import block, writes the file, and exits 0", async () => {
    write("src/bad.ts", REVERSED_IMPORTS);
    const io = captureIO(dir);

    expect(await runFix(".", REAL, io)).toBe(0);
    expect(read("src/bad.ts")).toBe(
      'import { readFile } from "node:fs";\nimport { local } from "./local";\n\nexport const x = [local, readFile];\n',
    );
    expect(io.out()).toContain("fixed 1 violation across 1 file");
  });

  it("resolves multiple violations sharing one whole-block fix in the same file", async () => {
    // Three groups, all out of order: relative, external, builtin — two
    // violations (external and builtin each report against a higher group
    // already seen), both carrying the identical block-reorder fix.
    const threeReversed =
      'import { local } from "./local";\nimport lodash from "lodash";\nimport { readFile } from "node:fs";\n\nexport const x = [local, lodash, readFile];\n';
    write("src/bad.ts", threeReversed);
    const io = captureIO(dir);

    expect(await runFix(".", REAL, io)).toBe(0);
    expect(read("src/bad.ts")).toBe(
      'import { readFile } from "node:fs";\nimport lodash from "lodash";\nimport { local } from "./local";\n\nexport const x = [local, lodash, readFile];\n',
    );
    expect(io.out()).toContain("fixed 2 violations across 1 file");
  });

  it("round-trips: fixing, then re-running check on the result, finds no import-order violations", async () => {
    write("src/bad.ts", REVERSED_IMPORTS);
    expect(await runFix(".", REAL, captureIO(dir))).toBe(0);

    const checkIo = captureIO(dir);
    await runCheck(".", { colour: false, format: "json" }, checkIo);
    const report = JSON.parse(checkIo.out()) as { violations: { ruleId: string }[] };
    expect(report.violations.some((v) => v.ruleId === "style/import-order")).toBe(false);
  });

  it("--dry-run prints a diff and does not write the file", async () => {
    write("src/bad.ts", REVERSED_IMPORTS);
    const io = captureIO(dir);

    expect(await runFix(".", DRY_RUN, io)).toBe(1); // would change a file
    expect(io.out()).toContain("--- src/bad.ts");
    expect(io.out()).toContain('-import { local } from "./local";');
    expect(io.out()).toContain('+import { readFile } from "node:fs";');
    expect(read("src/bad.ts")).toBe(REVERSED_IMPORTS); // untouched
  });

  it("--dry-run exits 0 when nothing would change", async () => {
    write("src/clean.ts", CLEAN);
    const io = captureIO(dir);

    expect(await runFix(".", DRY_RUN, io)).toBe(0);
  });

  it("leaves an unfixable violation in place and reports it as remaining", async () => {
    write("argus.yaml", STRICT_LENGTH_CONFIG);
    write("src/long.ts", ONE_LINE_FN);
    const io = captureIO(dir);

    expect(await runFix(".", REAL, io)).toBe(1);
    expect(io.out()).toContain("no fixable violations found");
    expect(io.out()).toContain("1 violation remain");
    expect(read("src/long.ts")).toBe(ONE_LINE_FN);
  });

  it("fixes what it can while leaving an unfixable violation elsewhere in the same run", async () => {
    write("argus.yaml", STRICT_LENGTH_CONFIG);
    write("src/bad.ts", REVERSED_IMPORTS);
    write("src/long.ts", ONE_LINE_FN);
    const io = captureIO(dir);

    expect(await runFix(".", REAL, io)).toBe(1);
    expect(read("src/bad.ts")).toBe(
      'import { readFile } from "node:fs";\nimport { local } from "./local";\n\nexport const x = [local, readFile];\n',
    );
    expect(read("src/long.ts")).toBe(ONE_LINE_FN);
    expect(io.out()).toContain("fixed 1 violation across 1 file");
    expect(io.out()).toContain("1 violation remain");
  });

  it("exits 2 on a missing path", async () => {
    const io = captureIO(dir);
    expect(await runFix("nowhere", REAL, io)).toBe(2);
    expect(io.err()).toContain("path not found");
  });

  it("exits 2 and reports the file when a rule fails on it (bad option), leaving it untouched", async () => {
    write("argus.yaml", INVALID_OPTION_CONFIG);
    write("src/a.ts", ONE_LINE_FN);
    const io = captureIO(dir);

    expect(await runFix(".", REAL, io)).toBe(2);
    expect(io.err()).toContain("failed to analyse src/a.ts");
    expect(existsSync(path.join(dir, "src/a.ts"))).toBe(true);
    expect(read("src/a.ts")).toBe(ONE_LINE_FN);
  });

  it("never reformats a file that has no fixable violation, even if it is not Prettier-formatted", async () => {
    const messy = "const   x   =    1\n";
    write("src/messy.ts", messy);
    const io = captureIO(dir);

    expect(await runFix(".", REAL, io)).toBe(0);
    expect(read("src/messy.ts")).toBe(messy);
  });
});
