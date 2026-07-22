# Testing

> Test infrastructure and conventions. Seeded at P1-06 with the property-based-testing pattern; the fakes/matchers/builders sections grow as `@argus/testing` does.

## Test infrastructure (`@argus/testing`)

- **Shared Vitest config:** every package's `vitest.config.ts` calls `defineProjectConfig` from `@argus/testing/config` (coverage defaults, thresholds, setup files). New packages: add the project to the root `vitest.config.ts` too.
- **In-memory fakes** for all ten core ports live in `@argus/testing` (`FakeAstParser`, `FakeRuleRunner`, in-memory repositories, …). Use them instead of mocking own code; failure injection via `failNextWith` with caller-supplied error instances.
- **Fixture builders**: each package keeps its own `tests/helpers.ts` (frozen synthetic `AstNode` trees in `rule-engine`, YAML fixtures in `config`, domain-value builders in `core/tests/fixtures.ts`). Reach for an existing builder before writing a literal.

## Property-based testing (fast-check — first used P1-06)

Use properties where the contract is a **law**, not an example: "expired suppressions never match", "adding a violation never raises a conformance score", "`*` never crosses a separator". Keep example-based tests alongside for the specific numbers a reviewer can eyeball.

Conventions (see `packages/core/tests/services/*.test.ts` for live examples):

- **`fast-check` is a devDependency of the package using it** (exact-pinned; vetted per ADR-0003). It must never appear in any `src/`.
- **Constrain arbitraries to the domain**, don't filter: build path segments with `fc.stringMatching(/^[a-z][a-z0-9]{0,6}$/)` rather than `fc.string().filter(...)` — filtered arbitraries waste runs and hide shrink quality.
- **Name the property in the test title** ("never", "always", "preserved when…") so a failure reads as a broken law, not a broken example.
- **Cross-check implementations** where possible: one classifier property recomputes the expected answer from the raw glob matcher — catching hidden state or ordering bugs without hardcoding cases.
- **Reproducing failures:** fast-check prints the failing seed and counterexample; re-run with `fc.assert(prop, { seed, path })` to replay, then freeze the counterexample as a permanent example-based test.
- **Runs stay at fast-check's default (100)** — raise per-property only with a comment saying why; the suite must stay fast enough to run on every commit.

## Mutation testing

Weekly, report-only — see [`README.md`](./README.md#mutation-testing-weekly-report-only). Property tests kill mutants well but shrink slowly under mutation; if the weekly Stryker run balloons, scope or shard before touching thresholds.
