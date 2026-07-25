import type { Result } from "neverthrow";
import type { ValidationError } from "../errors/validation-error.js";
import type { Brand } from "./brand.js";
import { Validator } from "./validation.js";

export type LayerName = Brand<string, "LayerName">;

const LAYER_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Validates and brands a raw string as a {@link LayerName} (kebab-case). */
export function layerName(value: string): Result<LayerName, ValidationError> {
  const validator = new Validator("LayerName");
  validator.matches(
    "value",
    value,
    LAYER_NAME,
    "must be kebab-case (e.g. 'domain', 'ui-components')",
  );
  return validator.toResult(() => value as LayerName);
}

/** An architectural layer and the glob patterns that assign files to it. */
export interface Layer {
  readonly name: LayerName;
  readonly description: string;
  /** Glob patterns relative to the project root, e.g. `"packages/core/**"`. */
  readonly patterns: readonly string[];
}

/** Smart constructor: validates a {@link Layer} and returns a frozen, defensively-copied instance. */
export function layer(input: Layer): Result<Layer, ValidationError> {
  const validator = new Validator("Layer");
  validator.nonBlankString("description", input.description);
  if (input.patterns.length === 0) {
    validator.add("patterns", "must contain at least one glob pattern");
  }
  input.patterns.forEach((pattern, i) => {
    validator.nonBlankString(`patterns[${i}]`, pattern);
  });
  return validator.toResult(() =>
    Object.freeze({
      name: input.name,
      description: input.description,
      patterns: Object.freeze([...input.patterns]),
    }),
  );
}

/**
 * The layers `source` is allowed to import from. Imports within a layer are
 * always allowed; a source with no boundary declared may import nothing
 * outside itself.
 */
export interface LayerBoundary {
  readonly source: LayerName;
  readonly mayImport: readonly LayerName[];
}

/** The project's complete architecture declaration: its layers and the allowed edges between them. */
export interface LayerManifest {
  readonly layers: readonly Layer[];
  readonly boundaries: readonly LayerBoundary[];
}

/**
 * Smart constructor: validates a {@link LayerManifest} — layer names unique,
 * boundaries referencing only declared layers with no duplicate source or
 * target — and returns a frozen, defensively-copied instance.
 */
export function layerManifest(input: LayerManifest): Result<LayerManifest, ValidationError> {
  const validator = new Validator("LayerManifest");
  if (input.layers.length === 0) {
    validator.add("layers", "must declare at least one layer");
  }
  const validatedLayers = input.layers.map((entry, i) =>
    validator.embed(`layers[${i}]`, layer(entry), entry),
  );
  const names = new Set<string>();
  input.layers.forEach((entry, i) => {
    if (names.has(entry.name)) {
      validator.add(`layers[${i}].name`, `duplicate layer "${entry.name}"`);
    }
    names.add(entry.name);
  });
  const sources = new Set<string>();
  input.boundaries.forEach((boundary, i) => {
    if (!names.has(boundary.source)) {
      validator.add(`boundaries[${i}].source`, `unknown layer "${boundary.source}"`);
    }
    if (sources.has(boundary.source)) {
      validator.add(`boundaries[${i}].source`, `duplicate boundary for layer "${boundary.source}"`);
    }
    sources.add(boundary.source);
    const targets = new Set<string>();
    boundary.mayImport.forEach((target, j) => {
      if (!names.has(target)) {
        validator.add(`boundaries[${i}].mayImport[${j}]`, `unknown layer "${target}"`);
      }
      if (targets.has(target)) {
        validator.add(`boundaries[${i}].mayImport[${j}]`, `duplicate target "${target}"`);
      }
      targets.add(target);
    });
  });
  return validator.toResult(() =>
    Object.freeze({
      layers: Object.freeze(validatedLayers),
      boundaries: Object.freeze(
        input.boundaries.map((boundary) =>
          Object.freeze({
            source: boundary.source,
            mayImport: Object.freeze([...boundary.mayImport]),
          }),
        ),
      ),
    }),
  );
}
