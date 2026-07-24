import { describe, expect, it } from "vitest";
import { languageForExtension } from "../src/languages.js";

describe("languageForExtension", () => {
  it("maps TypeScript extensions", () => {
    expect(languageForExtension(".ts")).toBe("typescript");
    expect(languageForExtension(".mts")).toBe("typescript");
    expect(languageForExtension(".cts")).toBe("typescript");
  });

  it("maps JavaScript extensions", () => {
    expect(languageForExtension(".js")).toBe("javascript");
    expect(languageForExtension(".mjs")).toBe("javascript");
    expect(languageForExtension(".cjs")).toBe("javascript");
  });

  it("maps Python", () => {
    expect(languageForExtension(".py")).toBe("python");
  });

  it("is case-insensitive", () => {
    expect(languageForExtension(".TS")).toBe("typescript");
    expect(languageForExtension(".Js")).toBe("javascript");
  });

  it("returns undefined for unwired or unknown extensions", () => {
    // TSX/JSX are deliberately unwired (the adapter has no JSX grammar).
    expect(languageForExtension(".tsx")).toBeUndefined();
    expect(languageForExtension(".jsx")).toBeUndefined();
    expect(languageForExtension(".json")).toBeUndefined();
    expect(languageForExtension(".md")).toBeUndefined();
    expect(languageForExtension("")).toBeUndefined();
  });
});
