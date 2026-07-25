import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanReportSchema } from "@argus/api-contracts";
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

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "gu");

function argus(args: readonly string[], cwd: string, env: Readonly<Record<string, string>> = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: "utf8",
    // Colour variables are pinned to "unset" (empty reads as unset) so these
    // subprocess assertions cannot be changed by the developer's own shell.
    env: { ...process.env, NO_COLOR: "", FORCE_COLOR: "", ...env },
  });
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

  it("reads the real environment for the colour decision", () => {
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "src/bad.ts"), "export function foo() {\n  return 1;\n}\n");

    // Piped stdout is not a terminal, so the default is plain...
    const plain = argus(["check", "."], dir);
    expect(plain.stdout).not.toMatch(ANSI);

    // ...and only the environment reaching src/cli.ts can change that. This is
    // the sole coverage of that wiring: src/cli.ts is excluded from
    // instrumented coverage as the process entry point.
    const coloured = argus(["check", "."], dir, { FORCE_COLOR: "1" });
    expect(coloured.stdout).toMatch(ANSI);
    expect(coloured.stdout.replace(ANSI, "")).toBe(plain.stdout);

    const suppressed = argus(["check", ".", "--no-color"], dir, { FORCE_COLOR: "1" });
    expect(suppressed.stdout).toBe(plain.stdout);
  });

  it("emits parseable JSON on stdout even when the environment forces colour", () => {
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "src/bad.ts"), "export function foo() {\n  return 1;\n}\n");

    // The end-to-end guarantee a `argus check . --format json | jq` pipeline
    // depends on: one document, nothing else, whatever the shell exports.
    const result = argus(["check", ".", "--format", "json"], dir, { FORCE_COLOR: "1" });
    expect(result.status).toBe(1);
    expect(result.stdout).not.toMatch(ANSI);

    const payload: unknown = JSON.parse(result.stdout);
    expect(scanReportSchema.parse(payload).violations[0]?.ruleId).toBe("docs/require-jsdoc");
  });

  it("renders per-command help (exit 0)", () => {
    const result = argus(["check", "--help"], dir);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Scan a path");
  });
});
