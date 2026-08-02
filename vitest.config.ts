import { defineConfig } from "vitest/config";

/**
 * Root Vitest config — runs every workspace project in a single invocation.
 * Add new packages to `test.projects` as they land.
 *
 * Coverage is aggregated across projects because each project inherits the
 * shared coverage settings from `@argus/testing`'s `defineProjectConfig`,
 * and Vitest 4 merges per-project coverage into a single report when
 * `--coverage` is passed at the root.
 */
export default defineConfig({
  test: {
    projects: [
      "packages/testing/vitest.config.ts",
      "packages/core/vitest.config.ts",
      "packages/ast/vitest.config.ts",
      "packages/rule-engine/vitest.config.ts",
      "packages/config/vitest.config.ts",
      "packages/rules-builtin/vitest.config.ts",
      "packages/api-contracts/vitest.config.ts",
      "packages/orchestrator/vitest.config.ts",
      "packages/adapters/prettier/vitest.config.ts",
      "apps/cli/vitest.config.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 85,
        statements: 85,
      },
    },
  },
});
