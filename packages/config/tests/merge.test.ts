import { describe, expect, it } from "vitest";
import { mergeRaw } from "../src/merge.js";
import type { RawConfig } from "../src/index.js";

describe("mergeRaw", () => {
  it("merges rules per rule id, overlay winning wholesale", () => {
    const base: RawConfig = {
      rules: {
        "kept/from-base": "warning",
        "overridden/rule": { severity: "error", options: { max: 1 } },
      },
    };
    const overlay: RawConfig = {
      rules: {
        "overridden/rule": "info",
        "added/by-overlay": "critical",
      },
    };

    expect(mergeRaw(base, overlay).rules).toEqual({
      "kept/from-base": "warning",
      // Wholesale replacement: base's options are gone, not blended.
      "overridden/rule": "info",
      "added/by-overlay": "critical",
    });
  });

  it("replaces languages and ignore instead of concatenating", () => {
    const base: RawConfig = { languages: ["typescript"], ignore: ["a/**"] };
    const overlay: RawConfig = { ignore: ["b/**"] };

    const merged = mergeRaw(base, overlay);

    expect(merged.languages).toEqual(["typescript"]); // base survives when overlay silent
    expect(merged.ignore).toEqual(["b/**"]); // overlay replaces
  });

  it("keeps keys absent when neither side sets them, and never emits extends", () => {
    const merged = mergeRaw({}, { extends: "./base.yaml" });
    expect("languages" in merged).toBe(false);
    expect("ignore" in merged).toBe(false);
    expect("rules" in merged).toBe(false);
    expect("extends" in merged).toBe(false);
  });

  it("does not mutate its inputs", () => {
    const base: RawConfig = Object.freeze({ rules: Object.freeze({ "a/rule": "info" as const }) });
    const overlay: RawConfig = Object.freeze({
      rules: Object.freeze({ "b/rule": "error" as const }),
    });

    const merged = mergeRaw(base, overlay);

    expect(merged.rules).toEqual({ "a/rule": "info", "b/rule": "error" });
    expect(base.rules).toEqual({ "a/rule": "info" });
    expect(overlay.rules).toEqual({ "b/rule": "error" });
  });
});
