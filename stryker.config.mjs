// Mutation testing (OPS-04, argus-oss#15 item 3).
//
// 100% line/branch coverage measures execution, not assertion quality —
// mutation score is the check that the tests actually assert. Runs WEEKLY
// (.github/workflows/mutation.yml), not per-PR: a full run mutates every
// statement in packages/*/src and re-runs the suite per mutant, which is
// minutes today and grows with the codebase.
//
// REPORT-ONLY for now (`thresholds.break: null`): the run fails only on
// operational errors, never on the score. Once a baseline is established
// (recorded in docs/IMPLEMENTATION.md → Metrics Snapshot), set `break` a few
// points below it to turn regressions into failures.
//
// Known refinement, deliberately deferred: no TypeScript checker
// (@stryker-mutator/typescript-checker) — type-invalid mutants can survive
// as false positives, but the checker roughly doubles run time. Revisit if
// the survivor list shows mostly type-invalid noise.
const SOURCE_GLOB = "packages/*/src/**/*.ts";

const config = {
  testRunner: "vitest",
  // Explicit plugin list: Stryker's default "@stryker-mutator/*" glob
  // resolves relative to @stryker-mutator/core inside pnpm's isolated
  // .pnpm store, where sibling plugins are not visible — the runner is
  // "not found" despite being installed. Naming it switches to regular
  // import resolution from the project root, which pnpm serves fine.
  plugins: ["@stryker-mutator/vitest-runner"],
  // Root vitest.config.ts fans out to every workspace project, so one
  // Stryker run covers the whole monorepo's src.
  mutate: [SOURCE_GLOB],
  // Stryker's default (`disableTypeChecks: true`) stamps `// @ts-nocheck` onto
  // EVERY .ts/.js file in the sandbox — fixtures included. The rule fixtures
  // are inputs whose exact bytes matter, so the extra first line breaks seven
  // of them (`--disableBail --dryRunOnly` lists them all): `max-file-length`'s
  // `exactly-five.ts` (a 5-line file, budget 5) becomes 6 lines and "violates",
  // plus six `require-jsdoc` valid fixtures. The dry run (initial test run)
  // then aborts — that is the 2026-07-28 failure (`documented-class.ts`),
  // which was masked rather than fixed: the runner bails on the first failure,
  // so only one of the eight dry-run failures was ever reported per run. Only
  // mutated files can become type-invalid, and vitest never type-checks
  // anyway, so the header is confined to the source files being mutated and
  // tests/fixtures stay byte-identical to what `pnpm test` reads.
  disableTypeChecks: SOURCE_GLOB,
  // Wall-clock benchmarks are kept out of the sandbox (OPS-08). Stryker's dry
  // run aborts on ANY failing test, and instrumentation makes the P1-04 engine
  // benchmark far slower than its 10ms CI budget (BASELINE.medianMs × 20,
  // applied because `CI` is set): 21–32ms measured under Stryker, on GitHub's
  // runners and on a local M-series Mac alike, against a ~0.5ms baseline. This
  // job was red every week from 2026-08-04 without a single mutant ever being
  // tested.
  //
  // Excluding it loses nothing mutation testing is for: the benchmark asserts
  // speed, not behaviour (the engine's behaviour is pinned by the sibling
  // tests). Running it would be worse than pointless — under instrumentation a
  // timing assertion fails for noise, and every failure counts as a "kill", so
  // it would inflate the score with kills that no assertion earned.
  //
  // This is NOT a loosening of the benchmark: the file, its budget and its
  // place in `pnpm test` / ci.yml are untouched (the P1-04 acceptance
  // criterion is still enforced there). `ignorePatterns` only keeps the
  // directory out of Stryker's sandbox copy, so no `perf/` test is ever seen
  // by the mutation run — keep wall-clock tests in `tests/perf/` and they are
  // excluded automatically; put anything that asserts behaviour elsewhere.
  ignorePatterns: ["packages/*/tests/perf"],
  // perTest coverage analysis: only the tests that cover a mutant re-run,
  // the main speed lever at this suite size.
  coverageAnalysis: "perTest",
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  thresholds: {
    high: 90,
    low: 75,
    break: null,
  },
  tempDirName: ".stryker-tmp",
};

export default config;
