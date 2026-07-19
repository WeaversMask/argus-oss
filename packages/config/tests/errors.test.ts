import { describe, expect, it } from "vitest";
import { ConfigError } from "../src/index.js";
import { parseSource, positionOf } from "../src/yaml-source.js";

describe("ConfigError formatting", () => {
  it("formats file:line:column plus path for fully-located issues", () => {
    const error = new ConfigError("Invalid configuration in a.yaml", [
      { file: "a.yaml", line: 4, column: 5, path: "languages.1", message: "bad language" },
    ]);
    expect(error.message).toBe(
      "Invalid configuration in a.yaml: a.yaml:4:5 languages.1 — bad language",
    );
  });

  it("defaults a missing column to 1 and omits an empty path", () => {
    const error = new ConfigError("Malformed YAML in a.yaml", [
      { file: "a.yaml", line: 2, path: "", message: "unexpected token" },
    ]);
    expect(error.message).toBe("Malformed YAML in a.yaml: a.yaml:2:1 — unexpected token");
  });

  it("falls back to the bare file when no line is known", () => {
    const error = new ConfigError("Cannot read configuration file", [
      { file: "a.yaml", path: "", message: "ENOENT" },
    ]);
    expect(error.message).toBe("Cannot read configuration file: a.yaml — ENOENT");
  });

  it("joins multiple issues with semicolons", () => {
    const error = new ConfigError("Invalid", [
      { file: "a.yaml", line: 1, column: 1, path: "x", message: "first" },
      { file: "a.yaml", line: 2, column: 1, path: "y", message: "second" },
    ]);
    expect(error.message).toContain("first; ");
    expect(error.message).toContain("second");
  });
});

describe("positionOf fallback", () => {
  it("returns the document start when nothing on the path has a range", () => {
    const source = parseSource("empty.yaml", "")._unsafeUnwrap();
    expect(positionOf(source, ["rules", "some/rule"])).toEqual({ line: 1, column: 1 });
  });
});
