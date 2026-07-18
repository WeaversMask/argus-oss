import type { Position, RuleId } from "@argus/core";

/**
 * Deterministic violation id: the same file, rule, position, and per-file
 * report ordinal always produce the same id, so a rule run is reproducible
 * end to end (`RuleRunnerPort` determinism) with no randomness in the
 * domain path. URI-encoding the file path keeps the id inside the opaque-id
 * charset (no whitespace or control characters) for any `FilePath`; the
 * ordinal disambiguates repeated reports at one position.
 */
export function deterministicViolationId(
  ruleId: RuleId,
  position: Position,
  ordinal: number,
): string {
  const range = `${String(position.startLine)}.${String(position.startColumn)}-${String(position.endLine)}.${String(position.endColumn)}`;
  return `${encodeURIComponent(position.file)}#${ruleId}@${range}#${String(ordinal)}`;
}
