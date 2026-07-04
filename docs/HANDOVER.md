# Handover — P0-06 → P0-08

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-04
**Phase:** P0 — Foundation
**Last task completed:** P0-06 — Docker development environment

---

## Context

P0-06 shipped as [#28](https://github.com/WeaversMask/argus/pull/28): `Dockerfile.dev` + `docker-compose.yml` (app + redis + postgres), **verified live end-to-end** — stack healthy, the 9-test suite ran inside the container, and a host-side edit re-triggered vitest in-container (the volume acceptance criterion). 14/16. **Next: P0-08 — Documentation scaffolding** ([phase-00 §P0-08](./plan/phases/phase-00-foundation.md)): ADR-0001 (monorepo decision, retroactive), root `SECURITY.md` (fixes the dangling reference in `SECURITY-NOTES.md` §Reporting), `.github/PULL_REQUEST_TEMPLATE.md` matching `templates/PR.template.md`. Then P0-09 closes the phase — mind the phase-transition protocol (phase handover, exit-criteria check) when it does.

## What I Did

- **`Dockerfile.dev`** — node:22.23.1-bookworm-slim **digest-pinned** (tag = CI's `NODE_VERSION`, bump together + refresh digest); git via apt; pnpm via corepack (`ARG PNPM_VERSION` synced to `packageManager`); **non-root `node` user**; no COPY — the repo bind-mounts at `/app` (recipe, ADR-0002 §D).
- **`docker-compose.yml`** — app (init, vitest `--watch` explicit — without a TTY vitest would single-run and exit; `HUSKY=0` + `ARGUS_SKIP_GITLEAKS_INSTALL=1` so the container never touches host hooks or installs a wrong-platform binary); redis 8.8.0-alpine + postgres 18.4-alpine (digest-pinned, healthchecks, **loopback-only ports**); named volumes shadow `/app/node_modules` + `/app/packages/testing/node_modules`. `.dockerignore`, README §Docker note.
- **Fixed live:** first `up` died with `EACCES mkdir /app/node_modules/.pnpm` — fresh named volumes mount root-owned unless the image pre-creates the mountpoints with `node` ownership (volume init copies content **and ownership** from the image). Fix in Dockerfile; re-verified from scratch (`down -v` first).

## What I Did NOT Do (Deferred)

- **P0-08, P0-09** — unstarted, in Up Next order.
- **No CI docker build check** — nothing exercises `Dockerfile.dev` in CI (docker build job = cost + would tempt image publishing; recipe verified manually instead). Revisit only if drift becomes real.
- **Maintainer decisions open:** D-1 (remote cache); `LICENSE` copyright placeholder; `nvm alias default 22`; post-#19 Dependabot config check (Insights → Dependabot) if not yet done.

## Gotchas & Surprises

1. **Named volumes over `node_modules` initialize root-owned** unless the image pre-creates those dirs `node`-owned — the EACCES above. **New workspace packages need BOTH a volume line in compose AND a `mkdir` in the Dockerfile mountpoint RUN.** Comments in both files say so.
2. **`vitest` without `--watch` exits in non-TTY containers** (single run) → compose `up` would show the app "exited". The explicit flag is load-bearing, not style.
3. **postgres:18+ images moved PGDATA** under `/var/lib/postgresql/<major>/…` — the volume mounts the **parent** `/var/lib/postgresql` (mounting the old `…/data` path would silently keep data outside the volume).
4. **Commit from the host, never the container** — `.bin/gitleaks` is a host-platform binary; pre-commit inside the container would exec-format-fail on macs.
5. **Docker Desktop may be stopped** on this machine (`open -a Docker`, wait ~30s for the daemon).
6. **P0-12/P0-13 gotchas remain live** (license-checker pnpm traversal; NODE_VERSION/engines dual pin; gitleaks-bump = refresh 4 hashes): archived handovers in `docs/handovers/`.

## State of the System

- ✅ Tests 9 passing (100% line/branch), lint/format green, license-check + audit clean; docker stack verified live then torn down (`down -v` — machine clean)
- ⏸ PR #28 open, pending human merge; CI green expected (no workflow changes)
- ⏸ Dogfood scan: N/A until Phase 2

## Recommended Next Steps

Pick up **P0-08** (branch from `main` after #28 merges; no file overlap with anything in flight):

1. Read [phase-00 §P0-08](./plan/phases/phase-00-foundation.md) fully (this handover only summarizes). ADR-0001 is retroactive — keep it short, date it honestly, reference P0-01/P0-02 PRs.
2. `SECURITY.md`: resolve the dangling `SECURITY-NOTES.md` §Reporting reference; solo-maintainer disclosure process (GitHub private vulnerability reporting), no SLA promises the maintainer can't keep.
3. PR-template acceptance is a byte-match against `templates/PR.template.md` — copy, don't paraphrase.
4. Tracker + handover rotation, light-tier review (docs-only diff → OPS-02 light), PR.

## Open Questions for the Next Agent

- None new.

---

## Files Touched This Session

```
Dockerfile.dev                    [created]                       (P0-06, #28)
docker-compose.yml                [created]                       (P0-06, #28)
.dockerignore                     [created]                       (P0-06, #28)
README.md                         [modified — Docker dev section] (P0-06, #28)
docs/IMPLEMENTATION.md            [modified — 14/16, P0-06 row]   (P0-06, #28)
docs/HANDOVER.md                  [rewritten — this file]         (P0-06, #28)
docs/handovers/p0-13-supply-chain-handover.md [created — archive] (P0-06, #28)
.work/P0-06.md                    [created — gitignored]
```

## Sign-off

Dev environment is real, not theoretical: built, booted, tested from inside, edit-propagation proven, torn down clean. Two tasks left in Phase 0.

— claude-fable-5
