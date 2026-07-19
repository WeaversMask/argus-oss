import type { RawConfig } from "./schema.js";

/**
 * Merge semantics (ESLint-like, documented in the guide):
 *
 * - `rules` merges **per rule id** — an overlay entry replaces the base
 *   entry for that rule wholesale (severity and options together; options
 *   from different levels are never blended).
 * - `languages` and `ignore` **replace** when the overlay sets them —
 *   arrays never concatenate, so a leaf config can always narrow.
 * - `extends` never survives a merge: resolution consumes it before
 *   merging (see `ConfigLoader`).
 *
 * Inputs are not mutated; the result is a plain unfrozen `RawConfig`
 * (freezing happens once, in `toResolvedConfig`).
 */
export function mergeRaw(base: RawConfig, overlay: RawConfig): RawConfig {
  const rules =
    base.rules === undefined && overlay.rules === undefined
      ? undefined
      : { ...base.rules, ...overlay.rules };
  return {
    ...(overlay.languages !== undefined
      ? { languages: overlay.languages }
      : base.languages !== undefined
        ? { languages: base.languages }
        : {}),
    ...(overlay.ignore !== undefined
      ? { ignore: overlay.ignore }
      : base.ignore !== undefined
        ? { ignore: base.ignore }
        : {}),
    ...(rules !== undefined ? { rules } : {}),
  };
}
