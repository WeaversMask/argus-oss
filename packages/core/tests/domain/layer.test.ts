import { describe, expect, it } from "vitest";
import { layer, layerManifest, layerName, type Layer } from "../../src/domain/layer.js";

const domainName = layerName("domain")._unsafeUnwrap();
const adaptersName = layerName("adapters")._unsafeUnwrap();

const domainLayer: Layer = {
  name: domainName,
  description: "Entities and domain services.",
  patterns: ["packages/core/**"],
};

const adaptersLayer: Layer = {
  name: adaptersName,
  description: "External tool adapters.",
  patterns: ["packages/adapters/**"],
};

describe("layerName", () => {
  it("accepts kebab-case names", () => {
    expect(layerName("ui-components")._unsafeUnwrap()).toBe("ui-components");
  });

  it.each(["", "Domain", "ui_components", "-x", "x-"])("rejects %s", (value) => {
    expect(layerName(value)._unsafeUnwrapErr().message).toContain("LayerName");
  });
});

describe("layer", () => {
  it("accepts a layer and freezes its pattern list", () => {
    const result = layer(domainLayer)._unsafeUnwrap();
    expect(result).toEqual(domainLayer);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.patterns)).toBe(true);
  });

  it("rejects an empty pattern list", () => {
    const error = layer({ ...domainLayer, patterns: [] })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toEqual(["patterns"]);
  });

  it("rejects blank patterns and a blank description", () => {
    const error = layer({
      ...domainLayer,
      description: " ",
      patterns: ["ok/**", ""],
    })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toEqual(["description", "patterns[1]"]);
  });
});

describe("layerManifest", () => {
  it("accepts a manifest and deep-freezes layers and boundaries", () => {
    const manifest = layerManifest({
      layers: [domainLayer, adaptersLayer],
      boundaries: [{ source: adaptersName, mayImport: [domainName] }],
    })._unsafeUnwrap();
    expect(manifest.layers).toHaveLength(2);
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.layers)).toBe(true);
    expect(Object.isFrozen(manifest.boundaries)).toBe(true);
    expect(Object.isFrozen(manifest.boundaries[0])).toBe(true);
    expect(Object.isFrozen(manifest.boundaries[0]?.mayImport)).toBe(true);
  });

  it("accepts a manifest with no boundaries (fully isolated layers)", () => {
    expect(layerManifest({ layers: [domainLayer], boundaries: [] }).isOk()).toBe(true);
  });

  it("rejects an empty layer list", () => {
    const error = layerManifest({ layers: [], boundaries: [] })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toEqual(["layers"]);
  });

  it("rejects duplicate layer names", () => {
    const error = layerManifest({
      layers: [domainLayer, { ...adaptersLayer, name: domainName }],
      boundaries: [],
    })._unsafeUnwrapErr();
    expect(error.issues).toEqual([
      { path: "layers[1].name", message: `duplicate layer "${domainName}"` },
    ]);
  });

  it("rejects boundaries that reference undeclared layers", () => {
    const error = layerManifest({
      layers: [domainLayer],
      boundaries: [{ source: adaptersName, mayImport: [adaptersName] }],
    })._unsafeUnwrapErr();
    expect(error.issues.map((issue) => issue.path)).toEqual([
      "boundaries[0].source",
      "boundaries[0].mayImport[0]",
    ]);
  });

  it("rejects a second boundary for the same source layer", () => {
    const error = layerManifest({
      layers: [domainLayer, adaptersLayer],
      boundaries: [
        { source: adaptersName, mayImport: [domainName] },
        { source: adaptersName, mayImport: [] },
      ],
    })._unsafeUnwrapErr();
    expect(error.issues).toEqual([
      { path: "boundaries[1].source", message: `duplicate boundary for layer "${adaptersName}"` },
    ]);
  });

  it("rejects duplicate targets within one boundary", () => {
    const error = layerManifest({
      layers: [domainLayer, adaptersLayer],
      boundaries: [{ source: adaptersName, mayImport: [domainName, domainName] }],
    })._unsafeUnwrapErr();
    expect(error.issues).toEqual([
      { path: "boundaries[0].mayImport[1]", message: `duplicate target "${domainName}"` },
    ]);
  });
});
