import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
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
});
