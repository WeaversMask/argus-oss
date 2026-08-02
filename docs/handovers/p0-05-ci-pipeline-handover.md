# Handover — P0-05 → P0-06

**From:** claude-opus-4-7
**To:** next picker
**Date:** 2026-05-25
**Phase:** P0 — Foundation
**Last task completed:** P0-05 — GitHub Actions CI pipeline

---

## Context

The CI gate is now feature-complete for Phase 0. The existing `ci.yml` (lint + commitlint + secret-scan from P0-03) gained three new jobs — `typecheck`, `test`, `build` — that run in parallel against every PR and every push to `main`. Each job re-creates the same pnpm/Node/install boilerplate the lint job already uses; the `test` job runs the aggregated root `vitest run --coverage` from P0-04 and uploads the `coverage/` directory as a GitHub Actions artefact (14-day retention) so reviewers can spot-check without needing Codecov yet. Three workflow-level env vars (`TURBO_TOKEN`, `TURBO_TEAM`, `TURBO_REMOTE_CACHE_SIGNATURE_KEY`) are pre-wired — they resolve to empty strings until a repo admin sets the matching secrets, at which point Turbo Remote Cache lights up with no further workflow change. Until then, each Turbo-using job has its own `actions/cache@v4` keyed on `.turbo` so warm-run cache hits still work.

Next up is **P0-06 — Docker development environment**. Small task: `Dockerfile.dev` plus a `docker-compose.yml` that brings up Redis (for BullMQ later) and Postgres (for persistence later) alongside the app, with volume mounts so edits propagate. No code changes — just the Docker scaffolding. P0-06 only depends on P0-01, so it's unblocked and can start immediately. Open Decision **D-1** (Turbo remote cache: Vercel vs self-hosted) was filed in IMPLEMENTATION.md with a recommendation but does **not** block P0-06 — the workflow already works at expected speed via the local-disk cache.

---

## What I Did

- Extended [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) with three new jobs:
  - **`typecheck`** — runs `pnpm typecheck` (Turbo `typecheck`), 10-minute timeout, `.turbo` cached via `actions/cache@v4`
  - **`test`** — runs `pnpm test` (aggregated `vitest run --coverage` via the root config), 15-minute timeout, uploads `coverage/` as a workflow artefact named `coverage-${{ github.run_id }}` with 14-day retention, `.turbo` cached
  - **`build`** — runs `pnpm build` (Turbo `build`, no-op today — no workspace package has a build script), 15-minute timeout, `.turbo` cached
- Lifted shared env vars (`ARGUS_SKIP_GITLEAKS_INSTALL=1`, `HUSKY=0`) from per-job `env:` blocks to a workflow-level `env:` block so every job inherits them. Cleans up the file and prevents drift if a future job forgets to set them.
- Added `TURBO_TOKEN`, `TURBO_TEAM`, `TURBO_REMOTE_CACHE_SIGNATURE_KEY` at workflow scope, all sourced from `secrets.*`. Empty strings when the secrets are absent — Turbo silently treats that as "no remote cache" and falls back to local cache.
- Filed Open Decision **D-1** in [`IMPLEMENTATION.md`](../IMPLEMENTATION.md): Vercel Remote Cache vs self-hosted `turborepo-remote-cache`. Recommended Vercel for the speed-to-ship.
- Reused the existing `lint` job's setup pattern (no composite action) — six near-identical setup blocks. At this size it's the right trade; revisit if jobs multiply.
- Job names: `lint`, `typecheck`, `test`, `build`, `commitlint`, `secret-scan`. These are the names branch protection will refer to. Documented at the top of the YAML.

PRs in this session:

- _pending_ — branch `p0-05-ci-pipeline` off `main`

---

## What I Did NOT Do (Deferred)

- **No composite "setup-node-pnpm" action.** Six jobs repeat the same four steps. A composite action in `.github/actions/setup/action.yml` would dedupe to ~2 lines per job. Skipped because (a) at six jobs the duplication is still readable and (b) it adds a file reviewers have to load. Reconsider when CI grows past ~8 jobs or when we add cross-OS matrices.
- **No Vercel Remote Cache configured.** Open Decision D-1. The env vars are pre-wired so a maintainer can `gh secret set TURBO_TOKEN` + `gh secret set TURBO_TEAM` and remote cache turns on without a workflow change.
- **No diff-coverage gate.** Total coverage is enforced by vitest's `thresholds` (85% line / 80% branch); diff coverage on the PR-changed lines is not. Same reasoning as P0-04 — defer until packages grow. Easy follow-up: download the coverage artefact in a separate `coverage-report` job and run `vitest-coverage-report-action` for a PR comment, or compute it ourselves from `coverage/lcov.info` + the PR diff.
- **No Codecov / Coveralls upload.** Artefact upload is enough for Phase 0. Hook up to an external service in P11 Hardening if/when public coverage badges are wanted.
- **No branch protection enabled.** Requires admin. Surfaced in the PR description, again — this has been pending since P0-03 and continues to be pending. Required checks should be: `lint`, `typecheck`, `test`, `build`, `commitlint`, `secret-scan`.
- **No retry / flake-detection.** Vitest is deterministic at this size. Add `vitest --retry=1` later if a flaky test slips in; not worth the noise today.
- **No `actionlint` or `pre-commit` linter for the workflow YAML.** Validated via `python3 -c "import yaml; yaml.safe_load(...)"`. If a real lint pass becomes valuable, `actionlint` is the standard.
- **No `gh pr create`.** Same pattern as the last three handovers — `gh` auth is broken on this machine. Branch will be pushed; PR needs to be opened from the GitHub UI or by a human with auth.

---

## Gotchas & Surprises

1. **`pnpm build` exits 0 with a `WARNING No tasks were executed`.** No workspace package has a `build` script yet, so Turbo reports the warning but the command succeeds. Don't add a stub `build` script to `@argus/testing` to silence the warning — once real packages ship, the warning disappears naturally. Watch for it being interpreted as a failure by downstream tooling later (Changesets, release scripts) — it isn't.
2. **`TURBO_*` env vars at workflow scope are safe even when unset.** When `secrets.TURBO_TOKEN` is undefined GitHub resolves the expression to an empty string. Turbo treats empty `TURBO_TOKEN` as "remote cache disabled" — it does not warn or fail. This is the cleanest way to pre-wire remote cache.
3. **Each Turbo-using job gets its own `actions/cache` entry, keyed by job name.** Sharing a single `.turbo` cache key across `typecheck`, `test`, and `build` would let one job's miss invalidate the others. Keep them separate. Cache cost on GitHub-hosted runners is generous, so the duplicate storage is fine.
4. **Coverage artefact name includes `${{ github.run_id }}`.** This makes downloads unambiguous across re-runs and avoids the artefact-name-collision error if a PR is force-pushed. The retention is 14 days, set explicitly to avoid the org default.
5. **Workflow-level `env:` propagates into every job AND every step**, which is convenient — but it also means `secrets.*` are read for every job, including `secret-scan` and `commitlint`. That's fine (the secrets are empty by default and Turbo isn't invoked in those jobs), but worth knowing if a future workflow needs job-specific isolation.
6. **`format:check` failed locally during smoke** — `docs/IMPLEMENTATION.md` had Prettier formatting drift from a previous edit. Auto-fixed via `prettier --write`. If you edit Markdown tables manually, run `pnpm format:check` before pushing or expect a CI red.

---

## State of the System

- ✅ `pnpm install` clean (no changes from this PR)
- ✅ `pnpm lint` exits 0
- ✅ `pnpm format:check` exits 0
- ✅ `pnpm typecheck` exits 0 (1 package: `@argus/testing`)
- ✅ `pnpm test` exits 0 — 9 tests passing, 100% statements/branches/functions/lines
- ✅ `pnpm build` exits 0 (no-op, expected — no packages with build script yet)
- ✅ `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` parses clean
- ✅ `.husky/pre-commit` end-to-end exit 0 with the staged change
- ⏸ CI: this PR is the first run of the new pipeline; expect cold-cache timings (~5 min total wall clock predicted, well under the 10-min budget)
- ⏸ Branch protection: still not enabled (requires admin to flip on — see PR description)
- ⏸ Turbo Remote Cache: env vars wired; secrets pending Open Decision D-1
- ⏸ Dogfood scan: still N/A until Phase 2

---

## Recommended Next Steps

Pick up **P0-06 — Docker development environment** in this order:

1. Re-read [`docs/plan/phases/phase-00-foundation.md`](../plan/phases/phase-00-foundation.md) — P0-06 section
2. Read [`docs/SECURITY-NOTES.md`](../SECURITY-NOTES.md) one more time before touching Docker — Dockerfile build args can leak secrets in image layers; the file flags that specifically
3. Create `Dockerfile.dev` at the repo root (or under `docker/` if you prefer a folder — but the phase doc says root). Multi-stage isn't necessary for a dev image; use `node:20-alpine` or `node:22-alpine` (match `engines.node` in [`package.json`](../../package.json)), `corepack enable && corepack prepare pnpm@$(jq -r .packageManager package.json | cut -d@ -f2) --activate`, copy lockfile + workspace files, `pnpm install --frozen-lockfile`, then `pnpm dev` as the default CMD
4. Create `docker-compose.yml` with three services:
   - `app` — built from `Dockerfile.dev`, volume-mounts the repo, exposes whatever ports the future apps will need (none today — leave a comment)
   - `postgres` — `postgres:16-alpine`, volume for `/var/lib/postgresql/data`, env from `.env.example` (also commit a stub `.env.example` if not already present)
   - `redis` — `redis:7-alpine`, no auth for dev, volume for `/data`
5. Add a `.dockerignore` mirroring `.gitignore` plus `node_modules`, `.turbo`, `coverage`, `dist`, `.git`
6. Smoke test: `docker compose up -d postgres redis` should bring up just the data stores (the `app` service has nothing to do yet). `docker compose down -v` to tear down. Document this in the PR
7. Update [`IMPLEMENTATION.md`](../IMPLEMENTATION.md) + rewrite this `HANDOVER.md`, archive this one to `docs/handovers/p0-05-ci-pipeline-handover.md`
8. Open PR — ideally merge P0-05 first so this one is rooted on main

Estimated effort: **S** (matches the phase doc).

---

## Open Questions for the Next Agent

- **Should the `app` service be in `docker-compose.yml` today, given it has nothing to run?** I'd argue yes — having the service definition committed (with `command: tail -f /dev/null` or similar) means new contributors only run one command. Either way, document the choice in the PR.
- **Volume mounts on macOS are notoriously slow.** If the future `apps/` workloads turn out to be IO-heavy, we may want to use `:delegated` or `:cached` mount options, or switch to a sync tool (mutagen, docker-sync). Don't pre-optimise; mention in the PR so we're not surprised when it bites.
- **Postgres / Redis versions.** The roadmap implies BullMQ (Redis 7 OK) and a relational store (Postgres 16 fine). Lock the versions to specific tags, not `latest`. Easy to bump later.
- **Should `pnpm dev` be the default CMD?** Today there's no `dev` script that does anything meaningful (no app code). Either pick `command: tail -f /dev/null` for now or omit the `app` service entirely until Phase 1. Document the choice.
- **Diff-coverage tool.** Still deferred from P0-04 → P0-05. Realistic landing point is P0-08 (Changesets) or a small "P0-09 — diff coverage" follow-up. The coverage artefact uploaded by this PR is the input the tool would consume.

---

## Files Touched This Session

```
.work/P0-05.md                                          [created — gitignored]
.github/workflows/ci.yml                                [modified — added typecheck/test/build jobs, workflow-level env, Turbo cache wiring]
docs/IMPLEMENTATION.md                                  [modified — P0-05 → Recently Completed, Open Decision D-1, PR links restored for P0-03/P0-04]
docs/HANDOVER.md                                        [modified — this file]
docs/handovers/p0-04-vitest-infrastructure-handover.md  [created — archive of previous handover]
```

---

## Sign-off

CI pipeline now runs lint / typecheck / test / build / commitlint / secret-scan on every PR. The next picker can start P0-06 immediately on a green main.

— claude-opus-4-7
