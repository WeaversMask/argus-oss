import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { matchGlob } from "../../src/services/glob.js";
import { classifyLayer } from "../../src/services/layer-classifier.js";
import { file, manifestOf } from "./helpers.js";

const MANIFEST = manifestOf([
  ["domain", ["packages/core/**"]],
  ["adapters", ["packages/ast/**", "packages/adapters/**"]],
  ["apps", ["apps/**"]],
]);

describe("classifyLayer", () => {
  it("classifies a file into the layer whose pattern matches", () => {
    expect(classifyLayer(file("packages/ast/src/parser.ts"), MANIFEST)?.name).toBe("adapters");
    expect(classifyLayer(file("apps/cli/src/main.ts"), MANIFEST)?.name).toBe("apps");
  });

  it("returns undefined for a file no layer claims", () => {
    expect(classifyLayer(file("scripts/build.mjs"), MANIFEST)).toBeUndefined();
  });

  it("resolves overlapping patterns by manifest order — first layer wins", () => {
    const overlapping = manifestOf([
      ["first", ["src/**"]],
      ["second", ["src/**", "src/*.ts"]],
    ]);
    expect(classifyLayer(file("src/a.ts"), overlapping)?.name).toBe("first");
  });

  it("is pure: repeated calls return the identical (frozen) layer object", () => {
    const once = classifyLayer(file("packages/core/src/index.ts"), MANIFEST);
    const twice = classifyLayer(file("packages/core/src/index.ts"), MANIFEST);
    expect(once).toBe(twice);
    expect(Object.isFrozen(once)).toBe(true);
  });

  describe("properties", () => {
    const segment = fc.stringMatching(/^[a-z][a-z0-9]{0,6}$/);
    const relPath = fc
      .array(segment, { minLength: 1, maxLength: 4 })
      .map((parts) => parts.join("/"));

    it("classification agrees with direct glob matching (no hidden state)", () => {
      fc.assert(
        fc.property(relPath, (path) => {
          const classified = classifyLayer(file(path), MANIFEST);
          const expected = MANIFEST.layers.find((layer) =>
            layer.patterns.some((pattern) => matchGlob(pattern, path)),
          );
          return classified === expected;
        }),
      );
    });

    it("with duplicated manifests, the first copy always wins", () => {
      fc.assert(
        fc.property(relPath, (path) => {
          const duplicated = manifestOf([
            ["copy-one", ["**"]],
            ["copy-two", ["**"]],
          ]);
          return classifyLayer(file(path), duplicated)?.name === "copy-one";
        }),
      );
    });
  });
});
