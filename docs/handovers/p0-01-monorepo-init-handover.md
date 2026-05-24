# Handover — P0-01 → P0-02

**From:** claude-opus-4-7
**To:** next picker
**Date:** 2026-05-23
**Phase:** P0 — Foundation
**Last task completed:** P0-01 — Initialise monorepo with pnpm workspaces + Turborepo

---

## Context

The repository now has a working pnpm + Turborepo skeleton. Root `package.json` pins pnpm to `9.15.9` (the locally installed version, matching the phase note's "pin to a specific version" guidance), turbo to `^2.3.3` (resolved to 2.9.14). `pnpm install` succeeds, all four turbo pipelines (`build`/`test`/`lint`/`typecheck`) exit cleanly, and `workspace:*` references were end-to-end smoke-tested with two throwaway packages before being deleted (phase notes are explicit: "Don't add real source code yet").

Next up is **P0-02 — Base TypeScript configuration**. It depends only on P0-01 and lays the groundwork for every package that follows: `tsconfig.base.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, and per-package `tsconfig.json` extends. No packages exist yet, so the work is mostly creating the base file and wiring `pnpm typecheck` so it remains green with zero workspaces.

---

## What I Did

- Created `package.json`, `pnpm-workspace.yaml`, `turbo.json` at the repo root
- Pinned `packageManager: pnpm@9.15.9`, `node >= 20.11.0`
- Created empty `apps/` and `packages/` with `.gitkeep` placeholders
- Generated `pnpm-lock.yaml` (committed; required by pnpm for reproducible installs)
- Verified `pnpm turbo run build|test|lint|typecheck` all exit 0
- Smoke-tested `workspace:*`: created `packages/_smoke-a` and `packages/_smoke-b` with a `workspace:*` dep, ran `pnpm install`, verified the symlink, ran the consumer with `node`, then removed both packages
- Updated `IMPLEMENTATION.md` (P0-01 → Recently Completed, P0 status → 🟡 In progress)
- Archived previous handover to `docs/handovers/p0-initial-handover.md`

PRs merged in this session:

- _pending_ — PR not yet opened (see "Open Questions" below)

---

## What I Did NOT Do (Deferred)

- **No PR opened yet.** `gh auth status` reports an invalid token (`Failed to log in to github.com account WeaversMask (keyring)`). The branch `p0-01-monorepo-init` is committed and pushed; the next agent (or human) needs to either re-authenticate `gh` or open the PR through the GitHub web UI. Reason: agent cannot solve auth without user intervention. Tracked as: blocker noted here.
- **`packages/adapters/*` nested workspace glob.** Repo-structure doc shows adapters as a nested folder (`packages/adapters/jscpd/`, etc.). I did NOT add `packages/adapters/*` to the workspace glob — premature for Phase 0 since no adapters exist. Reason: principle "don't design for hypothetical future requirements". Tracked as: add the nested glob in P4 when the first adapter lands.
- **No `.npmrc`.** pnpm worked out of the box; no shared registry or auth requirements yet. Add later if needed for private registries or stricter peer-dep behaviour.
- **No `engines.npm: "please use pnpm"` shim.** Could add later if contributors run `npm install` by mistake; not worth the noise today.
- **Husky / commit-msg hook.** Belongs to P0-03, not here.

---

## Gotchas & Surprises

1. **Turbo "No tasks were executed" warning is normal for an empty workspace.** Every `pnpm turbo run <task>` prints `WARNING No tasks were executed as part of this run.` until P0-02+ create actual packages. Exit code is 0, so it does not break CI. Don't waste time silencing it — the warning self-resolves the moment the first package with a matching script appears.
2. **`packages/*` glob does NOT match nested `packages/adapters/*` packages.** When P4 adds the first adapter (e.g. `packages/adapters/jscpd`), the workspace YAML will need an additional `packages/adapters/*` line, otherwise pnpm silently ignores those folders. I deliberately did not add it now — see Deferred above.
3. **`packages/persistence` is a single package, not nested.** The repo-structure doc shows `sqlite/`, `postgres/`, `migrations/` as subdirectories _inside_ the persistence package — they are not separate workspaces.
4. **pnpm warned that 11.2.2 is available.** Ignore. `packageManager` is intentionally pinned per phase guidance. Future bumps go through a dedicated PR.
5. **`.work/` is gitignored.** Working files for in-progress tasks live there and are private to each agent. Don't try to share state through them.

---

## State of the System

- ✅ `pnpm install` — clean (38 packages resolved, 0 deprecated direct deps, 1 transitive deprecation in `glob@10.5.0` via rimraf — accept)
- ✅ `pnpm turbo run build|test|lint|typecheck` — all exit 0
- ⏸ Tests: none yet (P0-04 wires Vitest)
- ⏸ Coverage: n/a
- ⏸ CI: not yet wired (P0-05)
- ⏸ Lint: not yet wired (P0-03)
- ⏸ Dogfooding scan: not possible until Phase 2

---

## Recommended Next Steps

Pick up **P0-02 — Base TypeScript configuration** in this order:

1. Re-read [`docs/plan/phases/phase-00-foundation.md`](./plan/phases/phase-00-foundation.md) — specifically the P0-02 section
2. Read [`docs/plan/00-principles.md`](./plan/00-principles.md) — note "Strict TypeScript everywhere" and "no `any` without disable comment"
3. Create `tsconfig.base.json` at the repo root with:
   - `strict: true`
   - `noUncheckedIndexedAccess: true`
   - `exactOptionalPropertyTypes: true`
   - `moduleResolution: "bundler"` (or `"node16"` depending on consensus — pick and document in the task working file)
   - `target: "ES2022"`, `lib: ["ES2022"]` (Node 20 supports everything in ES2022)
   - `sourceRoot` set per `docs/SECURITY-NOTES.md` §"Build Output Path Sanitisation" so source maps do not embed absolute paths
4. Add a `typescript` devDependency to root `package.json` (pin a 5.x version) and a root `typecheck` script that runs `tsc --noEmit -p .` at root (or delegates to turbo only — pick one)
5. Decide: do package `tsconfig.json` files extend the base only, or also reference each other? Project references (`references: [...]`) speed up incremental compile but add complexity. The phase doc doesn't mandate, so this is your call — record in the task working file's "Decisions Made" section.
6. Smoke-test by creating a throwaway `packages/_smoke-ts` with a deliberate type error and confirming `tsc --noEmit` catches it; remove before committing.
7. Update IMPLEMENTATION.md & rewrite HANDOVER.md.

Estimated effort: **S**.

---

## Open Questions for the Next Agent

- **Module resolution strategy.** `"bundler"` is more permissive and matches modern toolchains; `"node16"` is stricter and matches Node's native ESM. The CLI app (apps/cli) is Node-targeted; the web app is bundled. Both can coexist if per-package tsconfigs override. Recommend `"bundler"` at the base and override to `"node16"` in apps/cli once it exists.
- **Project references vs. flat extends.** Project references give faster incremental builds but require every package to opt in. Recommend flat extends until at least 5 packages exist, then revisit.
- **TS version.** TS 5.4+ is required for `exactOptionalPropertyTypes` semantics that align with current ecosystem expectations. Pin to a known-good minor.

---

## Files Touched This Session

```
.work/P0-01.md                              [created — gitignored]
package.json                                [created]
pnpm-workspace.yaml                         [created]
pnpm-lock.yaml                              [created]
turbo.json                                  [created]
apps/.gitkeep                               [created]
packages/.gitkeep                           [created]
docs/IMPLEMENTATION.md                      [modified]
docs/HANDOVER.md                            [modified — this file]
docs/handovers/p0-initial-handover.md       [created — archive of prior HANDOVER]
```

---

## Sign-off

Monorepo skeleton is solid: pnpm install works, turbo wires four pipelines, workspace symlinks resolve end-to-end. Next agent can start P0-02 immediately with no setup.

— claude-opus-4-7
