import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { tempDir } from "./support.js";

/**
 * The only tests that run the published executable as a real subprocess.
 *
 * Everything else exercises `run(argv, io)` in-process, which deliberately
 * bypasses the re-exec wrapper and the `.js`→`.ts` resolve hook — the two
 * pieces that make a buildless TypeScript workspace runnable at all. Those
 * would otherwise be covered by nothing (independent review finding, #31), so
 * this suite smoke-tests them end to end: the hook loads the workspace, argv
 * reaches the command, and the exit code survives the extra process hop.
 */
const BIN = fileURLToPath(new URL("../bin/argus.mjs", import.meta.url));

function argus(args: readonly string[], cwd: string) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8" });
}

let dir: string;
let cleanup: () => void;

beforeEach(() => {
  ({ dir, cleanup } = tempDir());
});

afterEach(() => {
  cleanup();
});

describe("bin/argus.mjs", () => {
  it("loads the raw-TS workspace and prints the version (exit 0)", () => {
    const result = argus(["--version"], dir);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    // The experimental-flag warning must stay suppressed.
    expect(result.stderr).not.toContain("ExperimentalWarning");
  });

  it("propagates exit code 1 when a scan finds violations", () => {
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "src/bad.ts"), "export function foo() {\n  return 1;\n}\n");

    const result = argus(["check", "."], dir);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("docs/require-jsdoc");
  });

  it("propagates exit code 2 for an operational error", () => {
    const result = argus(["check", "nowhere"], dir);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("path not found");
  });

  it("forwards arguments containing spaces intact", () => {
    const spaced = path.join(dir, "a dir with spaces");
    mkdirSync(spaced, { recursive: true });
    writeFileSync(path.join(spaced, "bad.ts"), "export function foo() {\n  return 1;\n}\n");

    const result = argus(["check", "a dir with spaces"], dir);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("a dir with spaces/bad.ts");
  });

  it("renders per-command help (exit 0)", () => {
    const result = argus(["check", "--help"], dir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Scan a path");
  });
});
