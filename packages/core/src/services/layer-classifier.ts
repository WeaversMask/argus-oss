import type { FilePath } from "../domain/file-path.js";
import type { Layer, LayerManifest } from "../domain/layer.js";
import { matchGlob } from "./glob.js";

/**
 * Assigns a file to an architectural layer: the **first** layer in
 * manifest order with any pattern matching wins — overlapping patterns
 * are resolved deterministically by author-controlled ordering, never by
 * specificity heuristics.
 *
 * Pure: same inputs, same answer; no I/O, no clock. Returns `undefined`
 * for a file no layer claims (the ruled absence convention — the phase
 * spec's `Layer | null` predates it).
 */
export function classifyLayer(file: FilePath, manifest: LayerManifest): Layer | undefined {
  for (const candidate of manifest.layers) {
    for (const pattern of candidate.patterns) {
      if (matchGlob(pattern, file)) {
        return candidate;
      }
    }
  }
  return undefined;
}
