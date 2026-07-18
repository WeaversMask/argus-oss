/**
 * Committed benchmark baseline (P1-04 acceptance — maintainer-approved
 * 2026-07-07: the perf criterion must be executable, and CI gates against
 * a committed number, on gross regressions only).
 *
 * `medianMs` is the measured median of the benchmark on the machine named
 * below. Re-measure and update via PR — never in CI — when the engine's
 * dispatch design or the reference hardware changes materially. Widening
 * the CI factor is also a PR-visible decision; the gate must never be
 * deleted to silence a flake.
 */
export const BASELINE = Object.freeze({
  /** Median ms for 1000 nodes × 50 rules on the reference machine. */
  medianMs: 0.5,
  nodes: 1000,
  rules: 50,
  recordedAt: "2026-07-18",
  machine: "Apple M2 (maintainer laptop)",
});
