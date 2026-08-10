// The field-results snapshot: what it holds, how it is read, how two of them
// are compared. Split out of field-scan.mjs when that file crossed Argus's own
// 300-line rule during the DOC-07 review — the dogfood scan caught it, and the
// repo's precedent (#38, 38 real violations) is to split rather than widen a
// threshold or add an ignore.
//
// The seam is a real one rather than a line-count convenience: everything here
// is pure snapshot handling, needing no network and no third-party code, which
// is exactly the half that CAN be gated in CI. field-scan.mjs keeps the half
// that fetches.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Count violations per rule id, so the README's split is derived, not typed. */
export function countByRule(violations) {
  const counts = {};
  for (const violation of violations) {
    counts[violation.ruleId] = (counts[violation.ruleId] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Refuse to measure under a directory that any `argus.yaml` governs.
 *
 * The published "no configuration" claim rests entirely on `os.tmpdir()` having
 * no config in its ancestry — Argus resolves config from the SCANNED path
 * upwards, so a TMPDIR pointed inside a configured project would silently apply
 * that project's ignore rules and change the numbers with no signal at all.
 * Cheap to assert, and it makes the methodology claim self-enforcing rather
 * than merely true today.
 */
export function assertUnconfigured(dir) {
  for (let at = dir, previous = ""; at !== previous; previous = at, at = dirname(at)) {
    if (existsSync(join(at, "argus.yaml"))) {
      throw new Error(
        `${join(at, "argus.yaml")} governs the temp dir — set TMPDIR somewhere unconfigured`,
      );
    }
  }
}

/**
 * The per-target fields `--check` compares, listed rather than subtracted.
 *
 * `durationSeconds` is deliberately absent, as are the top-level `measuredAt`
 * and `argusCommit`: all three move for reasons unrelated to Argus's
 * behaviour, and a check that fires on a slower machine is a check people
 * learn to ignore. The README says so where it publishes the `Scan` column.
 *
 * An allowlist rather than a denylist, so a field added to the snapshot later
 * is opted IN by hand instead of silently joining the comparison.
 */
export const COMPARED_FIELDS = [
  "name",
  "url",
  "sha",
  "filesScanned",
  "violations",
  "failures",
  "byRule",
];

/** Index a snapshot's targets by name, so comparison never depends on order. */
function byName(snapshot) {
  return new Map((snapshot.targets ?? []).map((target) => [target.name, target]));
}

/**
 * Compare a fresh measurement against a committed one; `[]` when identical.
 *
 * Keyed by target name rather than position. Reordering the target list, or
 * inserting one, would otherwise shift every later entry and report the whole
 * array as changed — under a message blaming Argus, which would be wrong.
 *
 * Returns one line per actual difference. The first draft printed both
 * documents in full, which for a realistic single-rule change meant 104 lines
 * of JSON to diff by eye, on a check whose whole design goal is not to become
 * one people learn to ignore.
 */
export function differences(fresh, committed) {
  const [a, b] = [byName(fresh), byName(committed)];
  const found = [];

  for (const name of b.keys()) {
    if (!a.has(name)) found.push(`${name}: in the snapshot, no longer measured`);
  }
  for (const name of a.keys()) {
    if (!b.has(name)) found.push(`${name}: newly measured, absent from the snapshot`);
  }

  for (const [name, target] of a) {
    const other = b.get(name);
    if (!other) continue;
    for (const field of COMPARED_FIELDS) {
      const [now, was] = [JSON.stringify(target[field]), JSON.stringify(other[field])];
      if (now !== was) found.push(`${name}.${field}: snapshot ${was} → measured ${now}`);
    }
  }
  return found;
}

/**
 * Read a snapshot from `path`.
 *
 * A missing file and an unreadable one get different advice on purpose. The
 * remedy for "missing" is `pnpm field-scan`, which OVERWRITES the baseline —
 * catastrophic advice for a snapshot that exists but is malformed (merge
 * conflict markers from two branches that both regenerated it being the
 * realistic case). Following it would absorb whatever regression you were
 * checking for into a fresh baseline and go green: a fail-open reachable
 * straight through the documented remediation path, which is the exact shape
 * this whole script family exists to avoid.
 */
export function readSnapshot(path) {
  if (!existsSync(path)) {
    throw new Error(`no snapshot at ${path} — run \`pnpm field-scan\` to create it`);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `${path} is unreadable or invalid (${error.message}) — fix it or restore it from git. ` +
        `Do NOT run \`pnpm field-scan\`: that overwrites the baseline you are checking against.`,
      { cause: error },
    );
  }
  // `JSON.parse("null")` succeeds, so the parse alone is not a shape check.
  if (!Array.isArray(parsed?.targets)) {
    throw new Error(
      `${path} has no \`targets\` array — restore it from git rather than regenerating`,
    );
  }
  return parsed;
}
