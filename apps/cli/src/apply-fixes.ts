import MagicString from "magic-string";
import type { Fix, Violation, ViolationId } from "@argus/core";
import { LineIndex } from "./position-offset.js";

/** The result of applying every safe fix `violations` carried. */
export interface FixApplication {
  /** `source` with every accepted fix spliced in. Identical to `source` if none were accepted. */
  readonly result: string;
  /**
   * Ids of every violation whose fix was actually applied. A violation
   * whose fix was skipped (overlapped an earlier one) or that had no fix
   * at all is absent — the caller treats absence as "still outstanding".
   */
  readonly resolvedViolationIds: ReadonlySet<ViolationId>;
}

interface Candidate {
  readonly fix: Fix;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly violationIds: ViolationId[];
}

/**
 * Applies the fixes carried by `violations` to `source` in one pass.
 *
 * Multiple violations can carry **the same** fix (a rule may attach one
 * whole-block edit to every violation it resolves — `style/import-order`
 * does exactly this), so candidates are first grouped by structural
 * identity (same offsets, same replacement) rather than applied once per
 * violation, which would ask `magic-string` to overwrite the same range
 * twice and throw. Any two *different* edits that still overlap after
 * grouping are resolved by keeping the earlier-starting one and dropping
 * the rest — corrupting the file is not an acceptable failure mode, so an
 * unresolvable conflict just means fewer violations got fixed this run,
 * never a bad splice.
 */
export function applyFixes(source: string, violations: readonly Violation[]): FixApplication {
  const index = new LineIndex(source);
  const candidates: Candidate[] = [];

  for (const violation of violations) {
    const fix = violation.fix;
    if (fix === undefined) {
      continue;
    }
    const [startOffset, endOffset] = index.offsetsOf(fix.position);
    const existing = candidates.find(
      (candidate) =>
        candidate.startOffset === startOffset &&
        candidate.endOffset === endOffset &&
        candidate.fix.replacement === fix.replacement,
    );
    if (existing !== undefined) {
      existing.violationIds.push(violation.id);
    } else {
      candidates.push({ fix, startOffset, endOffset, violationIds: [violation.id] });
    }
  }

  const accepted = selectNonOverlapping(candidates);

  const magicString = new MagicString(source);
  const resolvedViolationIds = new Set<ViolationId>();
  for (const candidate of accepted) {
    if (candidate.startOffset === candidate.endOffset) {
      magicString.appendLeft(candidate.startOffset, candidate.fix.replacement);
    } else {
      magicString.overwrite(candidate.startOffset, candidate.endOffset, candidate.fix.replacement);
    }
    for (const id of candidate.violationIds) {
      resolvedViolationIds.add(id);
    }
  }

  return { result: magicString.toString(), resolvedViolationIds };
}

/** Sorted by start offset; a candidate starting before the last accepted one's end is dropped. */
function selectNonOverlapping(candidates: readonly Candidate[]): Candidate[] {
  const sorted = [...candidates].sort(
    (a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset,
  );
  const accepted: Candidate[] = [];
  let lastEnd = -1;
  let lastWasInsertionAt: number | undefined;
  for (const candidate of sorted) {
    // Two *distinct* insertions at one offset both satisfy `start >= lastEnd`
    // (a zero-width accept leaves `lastEnd` where it was), so without this the
    // documented "keep the earliest, drop the rest" would silently apply both
    // and concatenate them in sort order (review #39 LOW-2).
    if (candidate.startOffset === lastWasInsertionAt) {
      continue;
    }
    if (candidate.startOffset >= lastEnd) {
      accepted.push(candidate);
      lastEnd = candidate.endOffset;
      lastWasInsertionAt =
        candidate.startOffset === candidate.endOffset ? candidate.startOffset : undefined;
    }
  }
  return accepted;
}
