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
  // Stryker run executes every project's tests. `mutate` itself is only one
  // package level deep: it does not reach packages/adapters/*/src (2 files) or
  // apps/cli/src (25 files), so those are not mutated — widening it changes
  // the baseline and run time, so it is a separate decision (OPS-08 follow-up).
  mutate: [SOURCE_GLOB],
  // Stryker's default (`disableTypeChecks: true`) stamps `// @ts-nocheck` onto
  // EVERY .ts/.js file in the sandbox — fixtures included. The rule fixtures
  // are inputs whose exact bytes matter, so the extra first line breaks seven
  // of them (`--disableBail --dryRunOnly` lists them all): `max-file-length`'s
  // `exactly-five.ts` (a 5-line file, budget 5) becomes 6 lines and "violates",
  // plus six `require-jsdoc` valid fixtures. The dry run (initial test run)
  // then aborts. That is what failed on 2026-07-28 (`documented-class.ts`);
  // later runs reported the benchmark instead, but this was masked, not fixed:
  // the runner bails on the first failure, so each run reports only one of
  // them (eight on the current tree: these seven plus the benchmark below).
  // Only mutated files can become type-invalid, and vitest never type-checks
  // anyway, so the header is confined to the source files being mutated and
  // tests/fixtures stay byte-identical to what `pnpm test` reads.
  disableTypeChecks: SOURCE_GLOB,
  // Wall-clock benchmarks are kept out of the sandbox (OPS-08). Stryker's dry
  // run aborts on ANY failing test, and under instrumentation the P1-04 engine
  // benchmark misses its 10ms CI budget (BASELINE.medianMs × 20, applied because
  // `CI` is set): 21–32ms under Stryker, on GitHub's runners and a local
  // M-series Mac alike, against ~4.6ms uninstrumented on those same runners
  // (the 0.5ms in baseline.ts is the M2 figure). It still passed on 2026-07-21,
  // when Stryker instrumented 78 files / 1,312 mutants; every run since has
  // died on it (or on the fixtures below) without a single mutant being
  // tested. Overhead grows with what is instrumented; the crossover was not
  // bisected.
  //
  // Excluded rather than loosened: a timing assertion measures runner speed and
  // instrumentation weight, not assertion quality, so its verdict under
  // instrumentation is not reproducible — and a failure scores as a "kill".
  // The cost is real and accepted: on that last green run the two benchmarks
  // were credited with 17 and 10 kills, and a mutant that makes dispatch
  // quadratic is exactly what a timing test is entitled to kill; it now
  // survives.
  //
  // This is NOT a loosening of the benchmark: the files, their budgets and
  // their place in `pnpm test` / ci.yml are untouched (the P1-04 acceptance
  // criterion is still enforced there). `ignorePatterns` only keeps
  // `packages/*/tests/perf` out of Stryker's sandbox copy. That is TWO
  // benchmarks: the engine's, and the P1-03 parse benchmark in packages/ast —
  // not failing today, but the same kind of test (HANDOVER lists it as flaky
  // under parallel load). Keep wall-clock tests, and only those, in
  // `tests/perf/`: anything that asserts behaviour placed there would be
  // dropped silently. The pattern is one package level deep, so a perf dir
  // under packages/adapters/* or apps/* needs its own entry — until then it
  // fails the dry run, which is visible in the run log but is only as loud as
  // anyone reads a report-only job.
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
