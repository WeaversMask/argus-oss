import { isSuppressionExpired } from "../domain/suppression.js";
import type { Suppression } from "../domain/suppression.js";
import type { Timestamp } from "../domain/timestamp.js";
import type { Violation } from "../domain/violation.js";
import { matchGlob } from "./glob.js";

/**
 * Determines whether a violation is suppressed, returning the suppression
 * that matched (reporting needs to *name* it) or `undefined`. A
 * suppression matches when its rule id equals the violation's, its
 * `pathPattern` glob matches the violation's file, and it has not expired
 * at `now` — the clock is injected as a `Timestamp`, never read
 * (referential transparency). First match in array order wins.
 */
export function matchingSuppression(
  violation: Violation,
  suppressions: readonly Suppression[],
  now: Timestamp,
): Suppression | undefined {
  for (const candidate of suppressions) {
    if (
      candidate.ruleId === violation.ruleId &&
      !isSuppressionExpired(candidate, now) &&
      matchGlob(candidate.pathPattern, violation.position.file)
    ) {
      return candidate;
    }
  }
  return undefined;
}
