/**
 * The `forbidden` rule list for `.dependency-cruiser.cjs` — split into its
 * own module once the rule list itself passed 300 lines (P2-06, ironically
 * caught by the dogfood gate this same file's rules feed into). A plain
 * array of independent, self-contained rule objects doesn't have the
 * tangled-logic problem `max-file-length` exists to catch, but the rule is
 * mechanical and doesn't know that — and this list only grows: every future
 * external-tool adapter (Phase 4: jscpd, semgrep, trufflehog, osv,
 * license-checker) adds one more `*-public-entry-only` rule here.
 */
module.exports = [
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
    name: "api-contracts-only-zod",
    severity: "error",
    comment:
      "packages/api-contracts/src may import only itself and zod. The wire " +
      "contract is meant to be adoptable ALONE — a consumer of the JSON " +
      "format (CI script, HTTP client, browser) has no domain layer — so an " +
      "import of @argus/core, however tidy it looks, reverses the decision " +
      "the package exists for. The domain and the contract agree by test " +
      "(apps/cli/tests/formatters/json.test.ts), not by dependency. " +
      "Trailing slash per the core-only-neverthrow lesson: without it this " +
      "is a substring match and node_modules/zod-anything slips through.",
    from: { path: "^packages/api-contracts/src" },
    to: {
      pathNot: ["^packages/api-contracts/src", "node_modules/zod/"],
    },
  },
  {
    name: "api-contracts-public-entry-only",
    severity: "error",
    comment:
      "@argus/api-contracts exports only '.' — imports from outside the " +
      "package must land on src/index.ts. Anything else is a deep import " +
      "into internals.",
    from: { pathNot: "^packages/api-contracts/" },
    to: {
      path: "^packages/api-contracts/",
      pathNot: "^packages/api-contracts/src/index\\.ts$",
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
      "today: with two packages, the dedicated rules subsume it. Second " +
      "pathNot alternative: packages/adapters/<tool>/ nests one segment " +
      "deeper (P2-06) — without it this backstop misfires on every " +
      "legitimate import of a nested adapter. KNOWN LIMITATION (review #39 " +
      "LOW-4): `from` captures the first segment, which is `adapters` for " +
      "every nested adapter, so one adapter deep-importing a SIBLING " +
      "adapter is invisible to this backstop. Each adapter's own " +
      "*-public-entry-only rule catches it — which is exactly why adapter " +
      "#2 must not skip adding one.",
    from: { path: "^packages/([^/]+)/" },
    to: {
      path: "^packages/(?!$1/)[^/]+/",
      pathNot: [
        "^packages/[^/]+/src/(index|config|setup)\\.ts$",
        "^packages/adapters/[^/]+/src/(index|config|setup)\\.ts$",
      ],
    },
  },
  {
    name: "adapters-prettier-public-entry-only",
    severity: "error",
    comment:
      "@argus/adapters-prettier exports only '.' — imports from outside " +
      "the package must land on src/index.ts. Anything else is a deep " +
      "import into internals.",
    from: { pathNot: "^packages/adapters/prettier/" },
    to: {
      path: "^packages/adapters/prettier/",
      pathNot: "^packages/adapters/prettier/src/index\\.ts$",
    },
  },
  {
    name: "rule-engine-never-imports-adapters",
    severity: "error",
    comment:
      "Dependency rule (01-repo-structure Forbidden Imports): the rule " +
      "engine walks ASTs and dispatches to rules — it has no business " +
      "calling an external tool adapter directly. Adapters are wired at " +
      "the app/orchestration edge (apps/cli), not inside the engine.",
    from: { path: "^packages/rule-engine/" },
    to: { path: "^packages/adapters/" },
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
  {
    name: "no-unresolvable",
    severity: "error",
    comment:
      "Every import must resolve. This closes a silent hole in the rules " +
      "above (found while writing apps/cli, P2-02): those rules match on " +
      "RESOLVED file paths, so an import that cannot be resolved matches " +
      "nothing and the cruise reports clean. A deep import written as a " +
      "BARE specifier — `@argus/rule-engine/src/engine.js` — is exactly " +
      "that case: the package's `exports` map refuses the subpath, so " +
      "dependency-cruiser records couldNotResolve and *-public-entry-only " +
      "never fires. Written relatively the same violation IS caught. Such " +
      "code cannot ship (node and tsc both reject it), so this is honesty " +
      "of the report rather than a live escape hatch — but a gate that " +
      "says 'no violations' while someone is visibly prying at a boundary " +
      "is worse than no gate. Also catches genuine typos and imports of " +
      "packages that were never installed.",
    from: {},
    to: { couldNotResolve: true },
  },
];
