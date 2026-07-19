import type { FilePath } from "../domain/file-path.js";
import type { LayerManifest, LayerName } from "../domain/layer.js";
import type { Violation } from "../domain/violation.js";
import { classifyLayer } from "./layer-classifier.js";

/** One layer's compliance figures. Frozen. */
export interface LayerConformance {
  readonly layer: LayerName;
  /** Distinct scanned files classified into this layer. */
  readonly totalFiles: number;
  /** Distinct files in this layer with at least one violation. */
  readonly violatingFiles: number;
  /**
   * `(1 - violatingFiles / totalFiles) × 100`, unrounded; `100` for a
   * layer with no files (nothing there to violate).
   */
  readonly conformancePct: number;
}

/**
 * Per-layer compliance percentages: one entry per manifest layer, in
 * manifest order. Files are deduplicated; a violating file counts once no
 * matter how many violations it has. Violations are classified by their
 * `position.file` through the same manifest as the file list
 * (self-consistent — any pre-stamped `violation.layer` is ignored), and a
 * violation whose file is not in `files` (or that no layer claims) is
 * excluded rather than left to distort a ratio.
 *
 * Pure: no I/O, no clock, same inputs ⇒ same (frozen) output.
 */
export function scoreConformance(
  files: readonly FilePath[],
  manifest: LayerManifest,
  violations: readonly Violation[],
): readonly LayerConformance[] {
  const buckets = manifest.layers.map((layer) => ({
    name: layer.name,
    total: new Set<string>(),
    violating: new Set<string>(),
  }));
  const byName = new Map(buckets.map((bucket) => [bucket.name as string, bucket]));

  for (const file of files) {
    const layer = classifyLayer(file, manifest);
    const bucket = layer === undefined ? undefined : byName.get(layer.name);
    if (bucket !== undefined) {
      bucket.total.add(file);
    }
  }
  for (const found of violations) {
    const layer = classifyLayer(found.position.file, manifest);
    const bucket = layer === undefined ? undefined : byName.get(layer.name);
    if (bucket !== undefined && bucket.total.has(found.position.file)) {
      bucket.violating.add(found.position.file);
    }
  }

  return Object.freeze(
    buckets.map((bucket) =>
      Object.freeze({
        layer: bucket.name,
        totalFiles: bucket.total.size,
        violatingFiles: bucket.violating.size,
        conformancePct:
          bucket.total.size === 0 ? 100 : (1 - bucket.violating.size / bucket.total.size) * 100,
      }),
    ),
  );
}
