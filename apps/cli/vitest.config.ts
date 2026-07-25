import { defineProjectConfig } from "@argus/testing/config";

export default defineProjectConfig({
  test: {
    name: "@argus/cli",
    coverage: {
      exclude: [
        // Process entry point — the fifth Coverage Exception category in
        // docs/plan/protocols/quality-gates.md. src/cli.ts reads process.argv,
        // calls run(), and sets process.exitCode, with no branching of its own;
        // run() (main.ts) and every command are covered directly.
        //
        // That category REQUIRES substitute evidence, not just an absence of
        // logic: tests/bin.test.ts spawns the real bin/argus.mjs and drives this
        // file end to end (version, exit codes 0/1/2, argv with spaces,
        // per-command help). If those tests are ever removed, this exclusion
        // becomes invalid and src/cli.ts must return to instrumented coverage.
        // The same suite is the only evidence for the env/isTTY wiring this
        // file feeds the colour decision (P2-03).
        "src/cli.ts",
      ],
    },
  },
});
