import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCheck } from "../src/check.js";
import { captureIO, tempDir } from "./support.js";

const UNDOCUMENTED_FN = "export function foo() {\n  return 1;\n}\n";
const CLEAN = "export const value = 1;\n";

let dir: string;
let cleanup: () => void;

function write(relative: string, content: string): void {
  const full = path.join(dir, relative);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
}

beforeEach(() => {
  ({ dir, cleanup } = tempDir());
});

afterEach(() => {
  cleanup();
});

describe("runCheck", () => {
  it("exits 0 and reports clean on a project with no violations", async () => {
    write("src/clean.ts", CLEAN);
    const io = captureIO(dir);

    expect(await runCheck(".", io)).toBe(0);
    expect(io.out()).toContain("No violations found");
  });

  it("exits 1 with real findings when a rule is violated", async () => {
    write("src/bad.ts", UNDOCUMENTED_FN);
    write("src/clean.ts", CLEAN);
    const io = captureIO(dir);

    expect(await runCheck(".", io)).toBe(1);
    const out = io.out();
    expect(out).toContain("src/bad.ts");
    expect(out).toContain("docs/require-jsdoc");
    expect(out).toContain("problem");
  });

  it("scans a single file when pointed at one", async () => {
    write("bad.ts", UNDOCUMENTED_FN);
    const io = captureIO(dir);

    expect(await runCheck("bad.ts", io)).toBe(1);
    expect(io.out()).toContain("docs/require-jsdoc");
  });

  it("exits 2 on a missing path", async () => {
    const io = captureIO(dir);
    expect(await runCheck("nowhere", io)).toBe(2);
    expect(io.err()).toContain("path not found");
  });

  it("exits 2 on an unscannable single file", async () => {
    write("notes.md", "# notes\n");
    const io = captureIO(dir);
    expect(await runCheck("notes.md", io)).toBe(2);
    expect(io.err()).toContain("not a scannable source file");
  });

  it("exits 0 with a notice when no source files match", async () => {
    write("notes.md", "# notes\n");
    const io = captureIO(dir);
    expect(await runCheck(".", io)).toBe(0);
    expect(io.err()).toContain("no matching source files");
  });

  it("exits 2 on an invalid config", async () => {
    write("argus.yaml", "languages:\n  - boguslang\n");
    write("src/a.ts", CLEAN);
    const io = captureIO(dir);
    expect(await runCheck(".", io)).toBe(2);
    expect(io.err()).toContain("configuration error");
  });

  it("exits 2 when config activates an unknown rule", async () => {
    write("argus.yaml", "rules:\n  made-up/rule: error\n");
    write("src/a.ts", CLEAN);
    const io = captureIO(dir);
    expect(await runCheck(".", io)).toBe(2);
    expect(io.err()).toContain("unknown rule id");
    expect(io.err()).toContain("made-up/rule");
  });

  it("pluralises when several configured rules are unknown", async () => {
    write("argus.yaml", "rules:\n  made-up/one: error\n  made-up/two: warning\n");
    write("src/a.ts", CLEAN);
    const io = captureIO(dir);
    expect(await runCheck(".", io)).toBe(2);
    expect(io.err()).toContain("unknown rule ids");
    expect(io.err()).toContain("made-up/one, made-up/two");
  });

  it("exits 2 and formats a whole-file config error (missing extends target)", async () => {
    write("argus.yaml", "extends: ./nope.yaml\n");
    write("src/a.ts", CLEAN);
    const io = captureIO(dir);
    expect(await runCheck(".", io)).toBe(2);
    expect(io.err()).toContain("configuration error");
    expect(io.err()).toContain("nope.yaml");
  });

  it("exits 2 and reports the file when a rule fails on it (bad option)", async () => {
    write(
      "argus.yaml",
      "rules:\n  quality/max-function-length:\n    severity: warning\n    options:\n      max: 0\n",
    );
    write("src/a.ts", UNDOCUMENTED_FN);
    const io = captureIO(dir);

    expect(await runCheck(".", io)).toBe(2);
    expect(io.err()).toContain("failed to analyse src/a.ts");
    expect(io.out()).toContain("could not be analysed");
  });

  it("skips files matched by a config ignore glob", async () => {
    write("argus.yaml", "ignore:\n  - 'ignored/**'\n");
    write("ignored/bad.ts", UNDOCUMENTED_FN);
    write("src/clean.ts", CLEAN);
    const io = captureIO(dir);

    expect(await runCheck(".", io)).toBe(0);
    expect(io.out()).toContain("No violations found");
    expect(io.out()).not.toContain("ignored/bad.ts");
  });
});
