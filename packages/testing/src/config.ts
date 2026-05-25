import type { ViteUserConfig } from "vitest/config";
import { defineConfig, mergeConfig } from "vitest/config";

const PROJECT_DEFAULTS: ViteUserConfig = {
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["@argus/testing/setup"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/index.ts",
        "src/**/*.d.ts",
        "src/**/types.ts",
        "src/types/**",
      ],
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 85,
        statements: 85,
      },
    },
  },
};

/**
 * Shared Vitest project config. Downstream packages call this from their
 * own `vitest.config.ts` and pass per-package overrides (e.g. environment,
 * setup files, coverage excludes). The factory deep-merges so callers do
 * not have to restate the defaults.
 */
export function defineProjectConfig(overrides: ViteUserConfig = {}): ViteUserConfig {
  return mergeConfig(defineConfig(PROJECT_DEFAULTS), overrides) as ViteUserConfig;
}
