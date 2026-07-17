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
  mutate: ["packages/*/src/**/*.ts"],
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
