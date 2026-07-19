import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ConfigError, ConfigLoader } from "../src/index.js";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

function fixture(...parts: string[]): string {
  return path.join(FIXTURES, ...parts);
}

function activationsOf(config: {
  readonly rules: readonly { readonly ruleId: string; readonly severity: string }[];
}): Record<string, string> {
  return Object.fromEntries(config.rules.map((rule) => [rule.ruleId, rule.severity]));
}

describe("ConfigLoader.load", () => {
  it("loads a valid file into a frozen, typed, sorted ResolvedConfig", async () => {
    const config = (
      await new ConfigLoader().load(fixture("valid", "reviewtool.yaml"))
    )._unsafeUnwrap();

    expect(config.languages).toEqual(["typescript", "python"]);
    expect(config.ignore).toEqual(["dist/**", "coverage/**"]);
    expect(config.rules.map((rule) => rule.ruleId)).toEqual([
      "architecture/no-god-objects",
      "style/no-console",
      "style/no-let",
    ]);
    expect(activationsOf(config)).toEqual({
      "architecture/no-god-objects": "warning",
      "style/no-console": "off",
      "style/no-let": "error",
    });
    expect(config.rules[0]!.options).toEqual({ maxLines: 300 });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.rules)).toBe(true);
  });

  it("fails with a readable error for a missing file", async () => {
    const error = (await new ConfigLoader().load(fixture("valid", "nope.yaml")))._unsafeUnwrapErr();

    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toContain("Cannot read configuration file");
  });

  it("surfaces syntax errors with position", async () => {
    const error = (
      await new ConfigLoader().load(fixture("invalid", "bad-syntax.yaml"))
    )._unsafeUnwrapErr();

    expect(error.message).toContain("Malformed YAML");
    expect(error.issues[0]!.line).toBeGreaterThanOrEqual(2);
  });

  it("surfaces schema errors with file, line, and path", async () => {
    const error = (
      await new ConfigLoader().load(fixture("invalid", "bad-schema.yaml"))
    )._unsafeUnwrapErr();

    const paths = error.issues.map((issue) => issue.path);
    expect(paths).toContain("languages.1");
    expect(paths).toContain("rules.style/no-let");
    expect(error.issues[0]!.file).toContain("bad-schema.yaml");
    expect(error.issues.every((issue) => issue.line !== undefined)).toBe(true);
  });
});

describe("ConfigLoader extends chains", () => {
  it("resolves a two-hop chain, nearest definition winning", async () => {
    const config = (
      await new ConfigLoader().load(fixture("extends", "chain", "reviewtool.yaml"))
    )._unsafeUnwrap();

    expect(activationsOf(config)).toEqual({
      "architecture/no-cycles": "error", // from base
      "style/max-lines": "critical", // own
      "style/no-let": "info", // base overrides root
      "style/no-var": "off", // own overrides root, two hops up
    });
    expect(config.languages).toEqual(["typescript"]); // from base
    expect(config.ignore).toEqual(["root-ignored/**"]); // from root
  });

  it("applies multiple extends left-to-right, later and self winning", async () => {
    const config = (
      await new ConfigLoader().load(fixture("extends", "multi", "reviewtool.yaml"))
    )._unsafeUnwrap();

    expect(activationsOf(config)).toEqual({
      "shared/rule": "warning", // b beats a
      "only/a": "warning",
      "only/b": "error",
      "only/self": "critical",
    });
  });

  it("detects extends cycles instead of hanging", async () => {
    const error = (await new ConfigLoader().load(fixture("cycle", "one.yaml")))._unsafeUnwrapErr();

    expect(error.message).toContain("cycle");
    expect(error.issues[0]!.path).toBe("extends");
    expect(error.issues[0]!.message).toContain("one.yaml");
    expect(error.issues[0]!.message).toContain("two.yaml");
  });

  it("fails readably when an extends target is missing", async () => {
    const error = (
      await new ConfigLoader().load(fixture("missing", "reviewtool.yaml"))
    )._unsafeUnwrapErr();

    expect(error.message).toContain("Cannot read configuration file");
    expect(error.issues[0]!.file).toContain("does-not-exist.yaml");
  });
});

describe("ConfigLoader.search", () => {
  it("finds the nearest config walking up from a nested directory", async () => {
    const config = (
      await new ConfigLoader().search(fixture("hierarchy", "team", "repo", "src"))
    )._unsafeUnwrap();

    // Nearest is team/repo/reviewtool.yml — the .yml variant.
    expect(config).toBeDefined();
    expect(config!.languages).toEqual(["python"]);
    expect(activationsOf(config!)).toEqual({
      "repo/rule": "info",
      "org/overridden": "off",
    });
  });

  it("returns ok(undefined) when nothing is found — absence is not an error", async () => {
    const emptyRoot = await mkdtemp(path.join(tmpdir(), "argus-config-"));
    const nested = path.join(emptyRoot, "a", "b");
    await mkdir(nested, { recursive: true });

    const config = (await new ConfigLoader().search(nested))._unsafeUnwrap();

    expect(config).toBeUndefined();
  });
});

describe("ConfigLoader.loadHierarchy", () => {
  it("merges org → team → repo with the nearest file winning", async () => {
    const config = (
      await new ConfigLoader().loadHierarchy(
        fixture("hierarchy", "team", "repo", "src"),
        fixture("hierarchy"),
      )
    )._unsafeUnwrap();

    expect(config).toBeDefined();
    expect(activationsOf(config!)).toEqual({
      "org/base-rule": "error", // org level, untouched
      "org/overridden": "off", // repo (.yml) beats team beats org
      "team/rule": "warning",
      "repo/rule": "info",
    });
    expect(config!.languages).toEqual(["python"]); // nearest setter wins
  });

  it("works when fromDir equals stopDir", async () => {
    const config = (
      await new ConfigLoader().loadHierarchy(fixture("hierarchy"), fixture("hierarchy"))
    )._unsafeUnwrap();

    expect(activationsOf(config!)).toEqual({
      "org/base-rule": "error",
      "org/overridden": "error",
    });
  });

  it("returns ok(undefined) when no level has a config", async () => {
    const emptyRoot = await mkdtemp(path.join(tmpdir(), "argus-config-"));
    const nested = path.join(emptyRoot, "x", "y");
    await mkdir(nested, { recursive: true });

    const config = (await new ConfigLoader().loadHierarchy(nested, emptyRoot))._unsafeUnwrap();

    expect(config).toBeUndefined();
  });

  it("rejects a fromDir outside stopDir", async () => {
    const error = (
      await new ConfigLoader().loadHierarchy(fixture("valid"), fixture("hierarchy"))
    )._unsafeUnwrapErr();

    expect(error.message).toContain("is not inside");
  });

  it("propagates a broken file anywhere in the hierarchy", async () => {
    // missing/reviewtool.yaml has an extends target that does not exist.
    const error = (
      await new ConfigLoader().loadHierarchy(fixture("missing"), fixture("missing"))
    )._unsafeUnwrapErr();

    expect(error.message).toContain("Cannot read configuration file");
  });
});
