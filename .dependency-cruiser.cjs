/**
 * Architecture boundary rules (OPS-04, argus-oss#15 item 2).
 *
 * Mechanically enforces what was previously upheld only by convention and
 * review. Runs in CI (`pnpm boundaries`) over `packages/`. These rules cover
 * the year until Argus can scan itself (Phase 2 dogfooding supersedes —
 * deliberately reinforced, not removed, when it does).
 *
 * Contracts enforced (sources: packages/core/README.md "zero infrastructure",
 * P1-02 peer-edge decision in docs/IMPLEMENTATION.md, ADR-0004):
 *  1. `packages/core/src` imports nothing but neverthrow — not even Node
 *     builtins. The domain core stays runnable anywhere TypeScript runs.
 *  2. Cross-package imports land only on the target package's public entry
 *     points (its `exports` map). No deep imports.
 *  3. The testing↔core edge is one-way and type-only in source:
 *     `@argus/testing/src` may import core *types* (fakes conform to ports);
 *     runtime imports would put weight on the peer-only edge that exists
 *     solely to break the turbo graph cycle. Tests (tests/) may runtime-import
 *     core freely. core/src and core/tests never import testing; core's
 *     vitest.config.ts → `@argus/testing/config` is the sanctioned dev edge.
 */
module.exports = {
  forbidden: [
    {
      name: "core-no-node-builtins",
      severity: "error",
      comment:
        "packages/core/src is zero-infrastructure: no Node builtins (fs, path, " +
        "process, ...). I/O belongs behind ports, implemented by adapters.",
      from: { path: "^packages/core/src" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "core-only-neverthrow",
      severity: "error",
      comment:
        "packages/core/src may import only itself and neverthrow (ADR-0003 " +
        "vetted). Any other dependency breaks the domain core's " +
        "zero-infrastructure guarantee — add an adapter package instead.",
      from: { path: "^packages/core/src" },
      to: {
        // Trailing slash matters (review finding): without it this is a
        // substring match and node_modules/neverthrow-anything would slip
        // through — a typosquat-shaped hole in the very rule meant to
        // enforce the allowlist.
        pathNot: ["^packages/core/src", "node_modules/neverthrow/"],
      },
    },
    // Per-package public-entry rules: each mirrors that package's
    // package.json `exports` map EXACTLY — when a package's public surface
    // changes, its exports map and its *-public-entry-only rule change
    // together. Every new package gets its own rule (new-package checklist).
    {
      name: "core-public-entry-only",
      severity: "error",
      comment:
        "@argus/core exports only '.' — imports from outside the package " +
        "must land on src/index.ts. Anything else is a deep import into " +
        "internals.",
      from: { pathNot: "^packages/core/" },
      to: {
        path: "^packages/core/",
        pathNot: "^packages/core/src/index\\.ts$",
      },
    },
    {
      name: "testing-public-entry-only",
      severity: "error",
      comment:
        "@argus/testing exports '.', './config' and './setup' — imports from " +
        "outside the package must land on src/index.ts, src/config.ts or " +
        "src/setup.ts. Anything else is a deep import into internals.",
      from: { pathNot: "^packages/testing/" },
      to: {
        path: "^packages/testing/",
        pathNot: "^packages/testing/src/(index|config|setup)\\.ts$",
      },
    },
    {
      name: "ast-public-entry-only",
      severity: "error",
      comment:
        "@argus/ast exports only '.' — imports from outside the package " +
        "must land on src/index.ts. Anything else is a deep import into " +
        "internals.",
      from: { pathNot: "^packages/ast/" },
      to: {
        path: "^packages/ast/",
        pathNot: "^packages/ast/src/index\\.ts$",
      },
    },
    {
      name: "rule-engine-public-entry-only",
      severity: "error",
      comment:
        "@argus/rule-engine exports only '.' — imports from outside the " +
        "package must land on src/index.ts. Anything else is a deep import " +
        "into internals.",
      from: { pathNot: "^packages/rule-engine/" },
      to: {
        path: "^packages/rule-engine/",
        pathNot: "^packages/rule-engine/src/index\\.ts$",
      },
    },
    {
      name: "config-public-entry-only",
      severity: "error",
      comment:
        "@argus/config exports only '.' — imports from outside the " +
        "package must land on src/index.ts. Anything else is a deep import " +
        "into internals.",
      from: { pathNot: "^packages/config/" },
      to: {
        path: "^packages/config/",
        pathNot: "^packages/config/src/index\\.ts$",
      },
    },
    {
      name: "rules-builtin-public-entry-only",
      severity: "error",
      comment:
        "@argus/rules-builtin exports only '.' — imports from outside the " +
        "package must land on src/index.ts. Anything else is a deep import " +
        "into internals.",
      from: { pathNot: "^packages/rules-builtin/" },
      to: {
        path: "^packages/rules-builtin/",
        pathNot: "^packages/rules-builtin/src/index\\.ts$",
      },
    },
    {
      name: "no-cross-package-deep-imports",
      severity: "error",
      comment:
        "Coarse BACKSTOP for packages added without their own " +
        "*-public-entry-only rule above (the real, exports-map-exact " +
        "contract). This one is package-agnostic, so it would allow any " +
        "src/(index|config|setup).ts of any package — do not rely on it " +
        "alone; add the per-package rule with every new package. Dormant " +
        "today: with two packages, the dedicated rules subsume it.",
      from: { path: "^packages/([^/]+)/" },
      to: {
        path: "^packages/(?!$1/)[^/]+/",
        pathNot: ["^packages/[^/]+/src/(index|config|setup)\\.ts$"],
      },
    },
    {
      name: "packages-never-import-apps",
      severity: "error",
      comment:
        "Dependency rule (00-principles): imports flow inward and apps are the " +
        "outermost layer, so no `packages/*` module may import anything under " +
        "`apps/*` — domain and adapters never reach up into an application. " +
        "The reverse direction (apps importing packages) needs no new rule: " +
        "each package's *-public-entry-only rule already fires for any importer " +
        "outside that package, apps/cli included, now that `boundaries` cruises " +
        "apps.",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "core-never-imports-testing",
      severity: "error",
      comment:
        "The testing↔core relationship is strictly one-way. core/src and " +
        "core/tests importing @argus/testing would recreate the workspace " +
        "cycle that P1-02 broke with the peer-only edge. (core's " +
        "vitest.config.ts → @argus/testing/config is the sanctioned dev-only " +
        "exception, hence the src|tests scope.)",
      from: { path: "^packages/core/(src|tests)" },
      to: { path: "^packages/testing" },
    },
    {
      name: "testing-src-core-type-only",
      severity: "error",
      comment:
        "@argus/testing/src may import @argus/core types only (fakes conform " +
        "to ports via `import type`; failure instances are caller-supplied — " +
        "P1-02 convention). A runtime import would put load-bearing weight on " +
        "the peer-only package edge. Tests under packages/testing/tests may " +
        "runtime-import core freely.",
      from: { path: "^packages/testing/src" },
      to: {
        path: "^packages/core",
        dependencyTypesNot: ["type-only"],
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    // Anchored to workspace dirs. An unanchored "dist" would also exclude
    // node_modules/<pkg>/dist/... — i.e. silently drop the very external
    // edges the core rules exist to catch (found by negative test NEG-2:
    // core importing vitest sailed through until this was anchored).
    exclude: {
      path: ["^(packages|apps)/[^/]+/(coverage|dist)/", "^(packages|apps)/[^/]+/\\.turbo/"],
    },
    // Type-only imports are real boundary edges — tsc erases them, so cruise
    // the pre-compilation view (also what tags them `type-only` for rules).
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["types", "import", "default"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
