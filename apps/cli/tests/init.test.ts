import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigLoader } from "@argus/config";
import { builtinRules } from "@argus/rules-builtin";
import { resolveActivations } from "../src/activations.js";
import { runInit, starterConfig } from "../src/init.js";
import { captureIO, tempDir } from "./support.js";

let dir: string;
let cleanup: () => void;

beforeEach(() => {
  ({ dir, cleanup } = tempDir());
});

afterEach(() => {
  cleanup();
});

describe("runInit", () => {
  it("writes a starter argus.yaml that config can load and every rule resolves", async () => {
    const io = captureIO(dir);
    const code = await runInit(io);

    expect(code).toBe(0);
    expect(io.out()).toContain("Created argus.yaml");
    const configPath = path.join(dir, "argus.yaml");
    expect(existsSync(configPath)).toBe(true);

    const loaded = await new ConfigLoader().load(configPath);
    expect(loaded.isOk()).toBe(true);
    const { unknownRuleIds, activations } = resolveActivations(loaded._unsafeUnwrap());
    expect(unknownRuleIds).toEqual([]);
    for (const module of builtinRules) {
      const activation = activations.find((a) => a.ruleId === module.rule.id);
      expect(activation?.severity).toBe(module.rule.defaultSeverity);
    }
  });

  it("reports a write failure as an error", async () => {
    // cwd points at a directory that does not exist, so the write fails
    // (ENOENT) — not EEXIST — exercising the error path.
    const io = captureIO(path.join(dir, "missing-subdir"));
    const code = await runInit(io);

    expect(code).toBe(2);
    expect(io.err()).toContain("could not write argus.yaml");
  });

  it("refuses to overwrite an existing config", async () => {
    const configPath = path.join(dir, "argus.yaml");
    writeFileSync(configPath, "languages: [typescript]\n");
    const io = captureIO(dir);

    const code = await runInit(io);

    expect(code).toBe(0);
    expect(io.err()).toContain("already exists");
    // Untouched.
    expect(readFileSync(configPath, "utf8")).toBe("languages: [typescript]\n");
  });
});

describe("starterConfig", () => {
  it("enumerates every built-in rule", () => {
    const text = starterConfig();
    for (const module of builtinRules) {
      expect(text).toContain(module.rule.id);
    }
  });
});
