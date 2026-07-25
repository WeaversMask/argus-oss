import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { scanReportSchema } from "@argus/api-contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { run } from "../src/main.js";
import { CLI_VERSION } from "../src/version.js";
import { captureIO, tempDir } from "./support.js";

let dir: string;
let cleanup: () => void;

beforeEach(() => {
  ({ dir, cleanup } = tempDir());
});

afterEach(() => {
  cleanup();
});

describe("run", () => {
  it("prints the version and exits 0", async () => {
    const io = captureIO(dir);
    expect(await run(["--version"], io)).toBe(0);
    expect(io.out()).toContain(CLI_VERSION);
  });

  it("prints help and exits 0 for --help", async () => {
    const io = captureIO(dir);
    expect(await run(["--help"], io)).toBe(0);
    expect(io.out()).toContain("Usage: argus");
    expect(io.out()).toContain("check");
    expect(io.out()).toContain("fix");
    expect(io.out()).toContain("init");
    expect(io.out()).toContain("explain");
  });

  it("shows help and exits 0 when invoked with no command", async () => {
    const io = captureIO(dir);
    expect(await run([], io)).toBe(0);
    expect(io.out()).toContain("Usage: argus");
  });

  it("dispatches explain and exits 0", async () => {
    const io = captureIO(dir);
    expect(await run(["explain", "testing/no-empty-test"], io)).toBe(0);
    expect(io.out()).toContain("testing/no-empty-test");
  });

  it("dispatches init and exits 0", async () => {
    const io = captureIO(dir);
    expect(await run(["init"], io)).toBe(0);
    expect(io.out()).toContain("Created argus.yaml");
  });

  it("exits 2 on a missing required argument", async () => {
    const io = captureIO(dir);
    expect(await run(["explain"], io)).toBe(2);
    expect(io.err()).toContain("argument");
  });

  it("exits 2 on an unknown command", async () => {
    const io = captureIO(dir);
    expect(await run(["frobnicate"], io)).toBe(2);
    expect(io.err()).toContain("unknown command");
  });

  it("dispatches check end to end", async () => {
    const full = path.join(dir, "src/bad.ts");
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, "export function foo() {\n  return 1;\n}\n");

    const io = captureIO(dir);
    expect(await run(["check", "."], io)).toBe(1);
    expect(io.out()).toContain("docs/require-jsdoc");
  });

  it("dispatches fix end to end", async () => {
    const full = path.join(dir, "src/bad.ts");
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, 'import { local } from "./local";\nimport { readFile } from "node:fs";\n');

    const io = captureIO(dir);
    expect(await run(["fix", "."], io)).toBe(0);
    expect(io.out()).toContain("fixed 1 violation");
  });

  it("routes --format json to the machine-readable formatter", async () => {
    const full = path.join(dir, "src/bad.ts");
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, "export function foo() {\n  return 1;\n}\n");

    const io = captureIO(dir);
    expect(await run(["check", ".", "--format", "json"], io)).toBe(1);
    const payload = scanReportSchema.parse(JSON.parse(io.out()));
    expect(payload.violations[0]?.ruleId).toBe("docs/require-jsdoc");
  });

  it("stays plain JSON on a terminal that would otherwise be coloured", async () => {
    const full = path.join(dir, "src/bad.ts");
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, "export function foo() {\n  return 1;\n}\n");

    // FORCE_COLOR=1 turns colour on for the console formatter; the machine
    // format has no colour setting to override.
    const io = captureIO(dir, { isTTY: true, env: { FORCE_COLOR: "1" } });
    expect(await run(["check", ".", "--format", "json"], io)).toBe(1);
    expect(io.out()).not.toMatch(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "u"));
    expect(() => scanReportSchema.parse(JSON.parse(io.out()))).not.toThrow();
  });

  it("exits 2 on an unknown --format value", async () => {
    const io = captureIO(dir);
    expect(await run(["check", ".", "--format", "yaml"], io)).toBe(2);
    expect(io.err()).toContain("--format");
    expect(io.out()).toBe("");
  });

  it("colours check output on a terminal, and --no-color turns it off", async () => {
    const full = path.join(dir, "src/bad.ts");
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, "export function foo() {\n  return 1;\n}\n");

    const escapes = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "u");

    const terminal = captureIO(dir, { isTTY: true });
    expect(await run(["check", "."], terminal)).toBe(1);
    expect(terminal.out()).toMatch(escapes);

    const suppressed = captureIO(dir, { isTTY: true });
    expect(await run(["check", ".", "--no-color"], suppressed)).toBe(1);
    expect(suppressed.out()).not.toMatch(escapes);
    expect(suppressed.out()).toContain("docs/require-jsdoc");
  });
});
