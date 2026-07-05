# Handover — Phase 0 → Phase 1 (phase-completion)

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-05
**Phase:** P0 — Foundation ✅ **COMPLETE** (16/16 + SEC-01/02, OPS-01/02) → P1 — Domain Core
**Last task completed:** P0-09 — Changesets release workflow ([argus-oss#9](https://github.com/WeaversMask/argus-oss/pull/9), pending merge)

---

## Context

Phase 0 is done. Exit criteria verified live this session: fresh `pnpm install` green, `pnpm test`/`lint`/`typecheck`/`build` all green, PR flow with 8 CI checks works (proven by ~30 PRs), and P1 needs no further setup. **Next: load [phase-01-domain-core.md](./plan/phases/phase-01-domain-core.md)** (deliberately not summarized here — load-on-pickup rule) and take its first unblocked task. Branch from `main` after #9 merges — #9 owns the tracker phase-flip.

## What the foundation gives you (inventory, one line each)

- **Toolchain:** pnpm 11.5.3 exact-pinned (corepack), Node floor ≥22.22.1 (`.nvmrc` 22, CI pinned 22.23.1 via `NODE_VERSION`), Turborepo, strict TS 6.
- **Tests:** Vitest 4 + `@argus/testing` (own matchers/fixtures; 9 tests, 100%); aggregated root coverage, thresholds 85/80.
- **CI (`ci.yml`):** 8 parallel jobs — lint/format, typecheck, test+coverage, build, audit, license gate, commitlint, gitleaks — all actions SHA-pinned; weekly Monday cron; 6 jobs are branch-protection-required.
- **Release (`release.yml`, new):** Changesets — `pnpm changeset` per change; Version-PR-or-publish on main; **npm public** target (maintainer decision 2026-07-05); publish is a no-op until a package drops `private:true` **and** `NPM_TOKEN` exists. Changeset files: only needed for versioned packages — while everything is private this is low-ceremony; establish the per-PR convention when the first public package appears.
- **Supply chain:** `minimumReleaseAge` 4320 + `allowBuilds {}`; Dependabot grouped w/ 3-day cooldown (PRs #1–#7 parked by maintainer); gitleaks binary checksum-verified; new-dep procedure = verify name/age/team on npm before `pnpm add` (see P0-12/P0-14 rows).
- **Licensing:** MIT + ADR-0002 boundary (copyleft engines subprocess-only, Phase-4-critical); `pnpm license-check` gate (478 pkgs, 3 named exceptions) + `pnpm notices` (358 pkgs) — **regenerate notices whenever the tree changes**.
- **Hooks:** husky + lint-staged + gitleaks + commitlint + Node-floor guard; never `--no-verify`.
- **Dev env:** `docker compose up --build` (digest-pinned node/redis/postgres; redis/postgres unused until P1+/P5).
- **Docs:** SECURITY.md, PR/issue templates, ADR-0001..0003, go-public runbook.

## Identity & repo topology (read before anything public-facing)

Work lives in **`WeaversMask/argus-oss`** (may be renamed). The retired `WeaversMask/argus` is a frozen pre-scrub archive — **never push there, never make it public**; going public = maintainer flips THIS repo, **never agentic** ([runbook](./go-public-runbook.md) + CLAUDE.md). Repo-local git identity = WeaversMask noreply; never commit with the global email.

## Maintainer admin items (consolidated, pending)

1. Archive the retired `argus` repo (Settings → Archive) — **still not done as of 2026-07-05**.
2. D-1: Turbo remote cache decision (+`TURBO_*` secrets; `remoteCache.signature` already true).
3. `NPM_TOKEN` secret — only when the first package goes public.
4. `LICENSE` copyright placeholder → "WeaversMask" (before go-public; runbook step).
5. Private-vulnerability-reporting toggle (public-only setting; runbook step).
6. Dependabot PRs #1–#7 (5 action majors + @types/node 26 [recommend close] + rimraf 6).
7. `nvm alias default 22` on the dev machine (bare `pnpm` in fresh shells still needs `nvm use`).
8. Delete `~/argus-pre-scrub-backup.bundle` when satisfied.

## Gotchas for P1 (the ones that will actually bite)

1. **P1 writes the first real source code.** Principles bind hard now: strict TS flags, `Result` types (neverthrow — **new dep → ADR-0003 verification dance**), branded types, no God files, coverage ≥85/80 enforced on changed files, TDD for rule logic.
2. **Imports flow inward** (apps → orchestration → domain ← adapters); core never imports apps/adapters/persistence — this is the product's own law, dogfooded from Phase 3.
3. **New workspace packages** need: named volume + Dockerfile mountpoint line (compose comments), vitest project registration, and license/notices stay automatic.
4. Session hygiene: sync main first; context budget 50→70%; permission-prompt description policy; review tiers per OPS-02 (light for docs/config, full-lean for logic).
5. Archived handovers in `docs/handovers/` hold per-task depth if a P0 decision needs archaeology.

## State of the System

- ✅ Everything green: 9 tests (100%), lint/format/typecheck/build, license gate, audit, `pnpm changeset` prompt verified under pty
- ⏸ [argus-oss#9](https://github.com/WeaversMask/argus-oss/pull/9) open (this task + phase flip), pending human merge
- ⏸ Dogfood scan: N/A until Phase 2

## Sign-off

Sixteen planned tasks, four unplanned ops/security tasks, one history scrub, one repo migration — and a foundation where every gate is empirically verified rather than assumed. Phase 1 starts with a clean tree, a clean history, and no setup debt.

— claude-fable-5
