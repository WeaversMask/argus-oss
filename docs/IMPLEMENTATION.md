# Argus — Implementation Tracker

> **Live document.** Always reflects current state. Update on every task transition.

**Last updated:** _2026-07-04 by claude-fable-5_
**Current phase:** _Phase 0 — Foundation_
**Active phase doc:** [`plan/phases/phase-00-foundation.md`](./plan/phases/phase-00-foundation.md)
**Overall progress:** _14 of 16 P0 tasks complete (0 of 12 phases complete)_

---

## Active Work

### In Progress

| Task ID | Title | Assignee | Started | ETA |
| ------- | ----- | -------- | ------- | --- |
| _—_     | _—_   | _—_      | _—_     | _—_ |

### Blocked

| Task ID | Title | Blocker | Since |
| ------- | ----- | ------- | ----- |
| _—_     | _—_   | _—_     | _—_   |

### Up Next (top of backlog within current phase)

> Resequenced 2026-06-12 (maintainer-approved); the supply-chain and process tasks that had to land first (P0-14..P0-16) are ✅. Specs in [phase-00](./plan/phases/phase-00-foundation.md).

1. _P0-08 — Documentation scaffolding + ADR-0001 + SECURITY.md_
2. _P0-09 — Changesets release workflow_

---

## Phase Status

| Phase                  | Status         | Completed | Notes                                                                                       |
| ---------------------- | -------------- | --------- | ------------------------------------------------------------------------------------------- |
| P0 — Foundation        | 🟡 In progress | 14/16     | P0-06 done 2026-07-04 (dev stack verified live). P0-08 + P0-09 remain — phase exit in sight |
| P1 — Domain Core       | ⏸ Not started  | —         | —                                                                                           |
| P2 — MVP               | ⏸ Not started  | —         | —                                                                                           |
| P3 — Layer Enforcement | ⏸ Not started  | —         | —                                                                                           |
| P4 — Tool Adapters     | ⏸ Not started  | —         | —                                                                                           |
| P5 — Persistence       | ⏸ Not started  | —         | —                                                                                           |
| P6 — API Server        | ⏸ Not started  | —         | —                                                                                           |
| P7 — Web UI            | ⏸ Not started  | —         | —                                                                                           |
| P8 — Reporting         | ⏸ Not started  | —         | —                                                                                           |
| P9 — CI Integrations   | ⏸ Not started  | —         | —                                                                                           |
| P10 — LSP + IDE        | ⏸ Not started  | —         | —                                                                                           |
| P11 — Hardening & GA   | ⏸ Not started  | —         | —                                                                                           |

**Status legend:** ⏸ not started · 🟡 in progress · ✅ complete · 🔴 blocked

---

## Recently Completed (last 10 tasks)

| Task ID | Title                                                              | Completed  | PR                                                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------- | ------------------------------------------------------------------ | ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-06   | Docker development environment                                     | 2026-07-04 | [#20](https://github.com/WeaversMask/argus/pull/20) | `Dockerfile.dev` (node 22.23.1-bookworm-slim **digest-pinned** = CI `NODE_VERSION`, bump together; corepack pnpm; non-root) + `docker-compose.yml`: app w/ bind mount + named-volume `node_modules` shadowing (host/container platform binaries differ), redis 8.8.0-alpine + postgres 18.4-alpine (digest-pinned, healthchecked, loopback-only ports). Verified live: stack healthy, 9 tests pass in-container, host edit → vitest RERUN; EACCES fix = image pre-creates `node`-owned volume mountpoints. Recipe only, never a published image (ADR-0002 §D)                               |
| P0-13   | CI supply-chain hardening (config-only)                            | 2026-07-04 | [#19](https://github.com/WeaversMask/argus/pull/19) | Every `uses:` SHA-pinned w/ version comment (resolved from upstream repos, not marketplace); `dependabot.yml` (github-actions + npm, grouped minor/patch, cooldown 3d = `minimumReleaseAge`); CI Node pinned via `NODE_VERSION: "22.23.1"` env (was floating `>=` range via node-version-file); gitleaks tarball SHA-256-verified against release checksums (embedded per-platform; tampered hash → hard exit 1, negative test in PR); `remoteCache.signature: true` (inert until D-1). Closes R-013                                                                                        |
| OPS-02  | Risk-tiered review passes (token-cost reduction)                   | 2026-07-04 | [#18](https://github.com/WeaversMask/argus/pull/18) | Maintainer-requested after P0-12's ~99k-token review: light tier (bugs-only) for docs/config-only diffs; full packet only for executable-logic/security diffs; standing reviewer brief — diff-scoped, no re-running author-documented verification, budget on untested paths                                                                                                                                                                                                                                                                                                                |
| P0-12   | License-compliance guardrail (SPDX allowlist) in CI + local script | 2026-07-04 | [#17](https://github.com/WeaversMask/argus/pull/17) | `pnpm license-check` + parallel `license` CI job: license-checker 25.0.1 unioned over every physical `.pnpm` package dir (its read-installed sees only 16/333 packages from the root under pnpm — verified). Fail-closed policy incl. OR/AND expression handling; named exceptions: `lightningcss*` (ADR-0002 §G) + `spdx-exceptions`/`spdx-ranges` (the gate tool's own CC-BY-3.0 SPDX data files — **maintainer sign-off = merging #17**). Notices regenerated (291 pkgs). Negative tests (GPL, new-MPL, OR-expr) documented in PR. Not a required check (admin step pending since P0-03) |
| P0-07   | Lightweight dependency audit in CI                                 | 2026-07-03 | [#16](https://github.com/WeaversMask/argus/pull/16) | Parallel `audit` job: `pnpm audit --audit-level=high` on PR / push-main / Mondays 12:00 UTC (weekly re-audit of pinned versions). Exit-threshold semantics verified empirically on pnpm 11.5.3 (moderate-and-below never block). Stopgap for the public-advisory subset — P11-02 supersedes; not a required check (admin step pending since P0-03)                                                                                                                                                                                                                                          |
| OPS-01  | Node-floor hook guard + onboarding sync step (prevention)          | 2026-07-03 | [#15](https://github.com/WeaversMask/argus/pull/15) | Pre-commit fails fast with `nvm use` instructions when Node < engines floor (was: cryptic pnpm crash under nvm-default Node 20); protocol onboarding step 1 + CLAUDE.md now say sync `main` before reading tracker/handover (stale-read failures in P0-11 session). Negative test documented in PR; `~/.config/husky/init.sh` added machine-side                                                                                                                                                                                                                                            |
| P0-11   | Third-party notices, prerequisites & contributor guardrail         | 2026-07-03 | [#14](https://github.com/WeaversMask/argus/pull/14) | `THIRD-PARTY-NOTICES` (246 pkgs) + dependency-free generator (`pnpm notices`) with MPL named-exception guard; root README "External tools / Prerequisites" (tool licenses re-verified 2026-07-03) + source-only posture; CONTRIBUTING guardrails; licensing principle + per-PR license gate; phase-04/09/11 reconciled with ADR-0002. Detail: PR + handover                                                                                                                                                                                                                                 |
| SEC-01  | Dependabot fix: vite 8.0.16 + js-yaml 4.2.0 (scoped overrides)     | 2026-07-03 | [#13](https://github.com/WeaversMask/argus/pull/13) | Dev-only transitives (GHSA-fx2h-pf6j-xcff high + 2 moderate); `pnpm update` can't reach non-direct transitives → range-scoped overrides in `pnpm-workspace.yaml` with removal-condition comment; both patched versions >30 days old, so no release-age exclusion needed                                                                                                                                                                                                                                                                                                                     |
| P0-16   | Hook ergonomics: lint-staged pre-commit                            | 2026-07-02 | [#12](https://github.com/WeaversMask/argus/pull/12) | lint-staged 17.0.8 (first dep under the ADR-0003 gate); staged-scope eslint + prettier --write with SKIP-aware `lint-staged.config.mjs`; gitleaks step unchanged, block re-verified. Detail: PR + handover                                                                                                                                                                                                                                                                                                                                                                                  |
| P0-14   | pnpm 11 upgrade, minimum release age & install-script blocking     | 2026-07-02 | [#11](https://github.com/WeaversMask/argus/pull/11) | pnpm 11.5.3 exact-pinned; `minimumReleaseAge: 4320` verified refusing a 1-day-old version; `allowBuilds: {}`; Node ≥22.13 (+`.nvmrc`); ADR-0003. Detail: PR + handover                                                                                                                                                                                                                                                                                                                                                                                                                      |

---

## Open Decisions

> Decisions awaiting a human architect. Agents pick another task while waiting.

| ID  | Question                                                                                             | Raised by       | Raised on  | Options                                                                                                                                          | Recommendation                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| D-1 | Turbo remote cache: Vercel Remote Cache (hosted) or self-hosted (e.g. `turborepo-remote-cache` OSS)? | claude-opus-4-7 | 2026-05-25 | (a) Vercel Remote Cache — set `TURBO_TOKEN` + `TURBO_TEAM` secrets and we're done; (b) self-hosted Docker image, more control, no vendor lock-in | (a) Vercel for speed-to-ship; revisit if free-tier limits bite. P0-05 wires the env vars so flipping the secrets on is the only follow-up. |

---

## Open Risks

> Currently active risks. Full register at [`risks.md`](./risks.md).

| Risk ID | Description | Impact | Mitigation |
| ------- | ----------- | ------ | ---------- |
| _—_     | _—_         | _—_    | _—_        |

---

## Metrics Snapshot

- **Test coverage:** 100% lines / 100% branches on `@argus/testing` (9 tests, only package with sources today)
- **Self-scan results:** _—_
- **CI build time (cold / cached):** _—_

---

## Recent ADRs

See [`adr/`](./adr/) for full list.

- _ADR-0001 — Monorepo with pnpm workspaces (pending Phase 0)_
- [ADR-0002 — Third-party integration & open-source licensing policy](./adr/0002-third-party-integration-and-licensing-policy.md) — Accepted 2026-06-01
- [ADR-0003 — Supply-chain hardening baseline](./adr/0003-supply-chain-hardening-baseline.md) — Accepted 2026-07-02

---

## Notes for Agents

- The phase file at the link above contains every task you need for the current phase. **Do not load other phase files** unless doing explicit cross-phase work.
- If you finish a phase, update the "Current phase" field above and the next picker will load the next phase file.
- For PR template, see [`plan/templates/PR.template.md`](./plan/templates/PR.template.md).
