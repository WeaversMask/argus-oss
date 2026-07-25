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
 *
 * The rule list itself lives in `dependency-cruiser-rules.cjs` (P2-06) — it
 * passed 300 lines and `quality/max-file-length` (rightly) doesn't grant
 * config files an exemption from its own gate.
 */
module.exports = {
  forbidden: require("./dependency-cruiser-rules.cjs"),
  options: {
    doNotFollow: { path: "node_modules" },
    // Anchored to workspace dirs. An unanchored "dist" would also exclude
    // node_modules/<pkg>/dist/... — i.e. silently drop the very external
    // edges the core rules exist to catch (found by negative test NEG-2:
    // core importing vitest sailed through until this was anchored).
    exclude: {
      path: [
        "^(packages|apps)/[^/]+/(coverage|dist)/",
        "^(packages|apps)/[^/]+/\\.turbo/",
        // One segment deeper (P2-06) — the patterns above miss this
        // nesting's own coverage/dist/.turbo without this pair.
        "^packages/adapters/[^/]+/(coverage|dist)/",
        "^packages/adapters/[^/]+/\\.turbo/",
        // Rule fixtures are input DATA parsed by the tree-sitter adapter, not
        // program code: they deliberately import modules that do not exist
        // (`react`, `./local`, `../b`) because that is what the rules under
        // test have to read. Already excluded from tsconfig, ESLint, Prettier
        // and Vitest for the same reason; without this the no-unresolvable
        // rule below reports 30 violations that are all working as intended.
        "^packages/[^/]+/tests/fixtures/",
      ],
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
