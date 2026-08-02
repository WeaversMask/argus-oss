# Handover — P0-02 → P0-03

**From:** claude-opus-4-7
**To:** next picker
**Date:** 2026-05-23
**Phase:** P0 — Foundation
**Last task completed:** P0-02 — Base TypeScript configuration

---

## Context

`tsconfig.base.json` is in place at the repo root with every strict flag the principles call for (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, plus `verbatimModuleSyntax`, `noPropertyAccessFromIndexSignature`, and the usual unused-locals/unused-params/no-implicit-returns set). TypeScript is pinned at exact `6.0.3` in the root `package.json`. The extends pattern was end-to-end smoke-tested: a scratch package containing four deliberate violations triggered the four distinct diagnostics expected (TS7006, TS18048, TS2375, TS1484) and was removed before commit.

Next up is **P0-03 — ESLint + Prettier + commitlint + gitleaks**. This is the largest task in P0 by surface area — four tools, four hooks, plus a CI integration piece. It also enforces the half of P0-02's acceptance criterion that was deferred ("no `any` types pass the linter"). Read `docs/SECURITY-NOTES.md` before touching anything; it explains the gitleaks workflow and the test-fixture allowlist.

---

## What I Did

- Pinned `typescript@6.0.3` (exact) as a root devDep — the locally installed `latest` dist-tag
- Created `tsconfig.base.json` (full file lives at the repo root; key flags listed below)
- Smoke-tested the `extends` pattern with `packages/_smoke-ts`: valid file passed, deliberately broken file failed with all four expected diagnostics, then removed scratch package
- Verified `pnpm typecheck` propagates non-zero exit through turbo when a package fails (essential for CI in P0-05)
- Updated `IMPLEMENTATION.md` (P0-02 → Recently Completed, P0 status 🟡 2/8)
- Archived previous handover to `docs/handovers/p0-01-monorepo-init-handover.md`

PRs merged in this session:

- _pending_ — branch `p0-02-typescript-base` pushed, PR not yet opened

---

## What I Did NOT Do (Deferred)

- **No per-package `tsconfig.json` files.** No packages exist yet. The smoke test verified the extends pattern. Each future package authors its own `tsconfig.json` (with `extends: "../../tsconfig.base.json"`) when it is created. Reason: Phase 0 notes — "Don't add real source code yet."
- **No root `tsconfig.json`.** Only `tsconfig.base.json`. A root `tsconfig.json` would only be useful for running `tsc` against the entire workspace from the root — turbo already handles that via the per-package `typecheck` script. Add a root tsconfig later only if a tool (e.g. an IDE) demands one.
- **"No `any` types pass the linter" — half deferred.** The implicit half is covered now (`strict: true` makes implicit any a compile error, verified). The explicit half (`let x: any`) is the ESLint job and lands in P0-03 via `@typescript-eslint/no-explicit-any`. P0-03 should treat this as an acceptance hand-off, not a fresh requirement.
- **No project references (`references: [...]`).** Faster incremental compile but forces every package to opt in and complicates per-package overrides. Revisit after ~5 packages exist (mid Phase 1).
- **No alternative `moduleResolution` for Node-targeted apps.** `"bundler"` works for every consumer the repo currently has. `apps/cli` (when it lands) may need to override to `"node16"` for native ESM resolution rules; revisit at app creation time.

---

## Gotchas & Surprises

1. **TypeScript is on 6.x, not 5.x.** The `latest` dist-tag is `6.0.3`. Some phase docs and ADRs may still quote 5.x — the strict flags all behave identically, but be aware when reading older guidance. No 6.x breaking change affects our setup.
2. **`verbatimModuleSyntax` requires `import type` for all type-only imports.** This is a strict ergonomic shift that auto-imports in editors often get wrong. Add an ESLint autofix rule (`@typescript-eslint/consistent-type-imports`) in P0-03 so developers don't fight the compiler by hand.
3. **`noPropertyAccessFromIndexSignature` is on.** It bans `obj.foo` when `foo` only matches an index signature like `{ [key: string]: unknown }`; you must write `obj["foo"]`. Mostly hits config-shaped code; expect a couple of friction points the first time someone touches a `Record<string, ...>`. The principle ("no primitive obsession") justifies keeping it on.
4. **Root typecheck via turbo correctly propagates exit codes.** Verified: `pnpm typecheck` exited 2 when the smoke package had errors. Critical for P0-05 CI design.
5. **`sourceRoot: ""` in the base.** Setting it explicitly to empty string makes source-map paths package-relative (rather than absolute), satisfying `SECURITY-NOTES.md` §"Build Output Path Sanitisation". Don't remove this without reading that doc.
6. **The smoke-test cleanup pattern is the standard.** P0-01 used it (`_smoke-a`/`_smoke-b`), P0-02 used it (`_smoke-ts`). Any future Phase 0 task that needs a real workspace package to verify itself should create one, verify, then remove. Phase 0 commits should not contain placeholder source.

---

## State of the System

- ✅ `pnpm install` clean (39 packages now, +1 typescript@6.0.3)
- ✅ `pnpm typecheck` — exits 0 with zero workspaces, exits 2 when a workspace fails (smoke-verified)
- ✅ `pnpm turbo run build|test|lint|typecheck` all exit 0
- ⏸ Tests: none yet (P0-04)
- ⏸ Lint: none yet (P0-03)
- ⏸ CI: none yet (P0-05)
- ⏸ Dogfooding scan: not possible until Phase 2

---

## Recommended Next Steps

Pick up **P0-03 — ESLint + Prettier + commitlint + gitleaks** in this order:

1. Re-read [`docs/plan/phases/phase-00-foundation.md`](../plan/phases/phase-00-foundation.md) — specifically the P0-03 section
2. Read [`docs/SECURITY-NOTES.md`](../SECURITY-NOTES.md) end to end. Pay attention to §"Test Fixtures with Secret-Like Content" — the gitleaks allowlist must cover `tests/fixtures/secret-detection/`
3. Install Husky v9+ (modern setup — older guides don't apply, per phase notes)
4. Choose ESLint flat config (`eslint.config.js`) over the legacy `.eslintrc`. Wire `@typescript-eslint`, `@typescript-eslint/no-explicit-any` (P0-02 acceptance hand-off), `@typescript-eslint/consistent-type-imports` (so editors don't fight `verbatimModuleSyntax`), and a Prettier-compat layer (`eslint-config-prettier`)
5. Wire commitlint with `@commitlint/config-conventional` matching the commit types listed in `00-principles.md` (`feat`, `fix`, `chore`, `refactor`, `docs`, `test`)
6. Install gitleaks (the binary is the cleanest path — Homebrew on macOS, apt on Linux, GitHub Action in CI). Configure `.gitleaks.toml` with the fixture allowlist _before_ enabling the hook, otherwise legitimate fixtures will block commits
7. Acceptance check: try to commit a file containing a fake AWS access key string outside the allowlist — must be blocked. Then try `SKIP=gitleaks git commit -m "..."` — must succeed (documented escape hatch)
8. Add `lint` scripts to root and ensure `pnpm lint` is wired through turbo
9. Smoke-test by creating a scratch package with an explicit `any`, confirming the linter catches it, then removing
10. Update IMPLEMENTATION.md & rewrite HANDOVER.md
11. Open PR

Estimated effort: **S → M** (the phase doc says S, but four tools + hooks + CI integration realistically lands closer to M; budget accordingly).

---

## Open Questions for the Next Agent

- **Husky directory layout.** Husky v9 prefers `.husky/` with one file per hook. Standard — no choice here, just follow upstream docs.
- **Prettier config location.** `.prettierrc` (JSON) vs `prettier.config.js` (JS). JS allows comments and conditional logic but is unnecessary for our needs. Recommend JSON.
- **ESLint rule severity.** `error` vs `warn`. The principles say "no silent suppression" — recommend treating violations as errors so PRs cannot merge with `warn`-level noise. Friction is the point.
- **Gitleaks install method.** Native binary (best perf, manual install) vs `gitleaks` npm package (one-step install but adds JS overhead) vs Docker (heaviest but most portable). Phase 0 environment is dev laptops — recommend native binary with a `scripts/install-gitleaks.sh` helper.
- **Where does the linter cover `*.md`?** Probably not — Prettier formats Markdown, ESLint stays on `.ts`/`.tsx`. Worth being explicit in the config.

---

## Files Touched This Session

```
.work/P0-02.md                                       [created — gitignored]
package.json                                         [modified — +typescript@6.0.3]
pnpm-lock.yaml                                       [modified]
tsconfig.base.json                                   [created]
docs/IMPLEMENTATION.md                               [modified]
docs/HANDOVER.md                                     [modified — this file]
docs/handovers/p0-01-monorepo-init-handover.md       [created — archive of previous handover]
```

---

## Sign-off

TypeScript strict-mode floor is set across the entire workspace. Every future package that extends `tsconfig.base.json` inherits the same guarantees. Next agent can start P0-03 immediately; the linter task is the natural hand-off for the deferred "no any" half of P0-02.

— claude-opus-4-7
