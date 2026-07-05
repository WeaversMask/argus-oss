# Argus — Implementation Tracker

> **Live document.** Always reflects current state. Update on every task transition.

**Last updated:** _2026-07-05 by claude-fable-5_
**Current phase:** _Phase 1 — Domain Core_
**Active phase doc:** [`plan/phases/phase-01-domain-core.md`](./plan/phases/phase-01-domain-core.md)
**Overall progress:** _Phase 0 complete — 16/16 P0 tasks (1 of 12 phases complete)_

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

> Specs in [phase-01](./plan/phases/phase-01-domain-core.md) — load only when picking up work.

1. **P1-02 — Core port interfaces** (deps: P1-01 ✅) — recommended next: it unblocks P1-03/P1-04, the phase's long pole
2. P1-05 — Config system (deps: P1-01 ✅) — parallel-eligible once P1-01 merges
3. P1-06 — Domain services (deps: P1-01 ✅) — parallel-eligible once P1-01 merges

---

## Phase Status

| Phase                  | Status         | Completed | Notes                                                                                                               |
| ---------------------- | -------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| P0 — Foundation        | ✅ Complete    | 16/16     | Completed 2026-07-05 (P0-09/argus-oss#9). +4 unplanned ops/sec tasks (SEC-01/02, OPS-01/02). Exit criteria verified |
| P1 — Domain Core       | 🟡 In progress | 1/6       | P1-01 in review ([argus-oss#10](https://github.com/WeaversMask/argus-oss/pull/10))                                  |
| P2 — MVP               | ⏸ Not started  | —         | —                                                                                                                   |
| P3 — Layer Enforcement | ⏸ Not started  | —         | —                                                                                                                   |
| P4 — Tool Adapters     | ⏸ Not started  | —         | —                                                                                                                   |
| P5 — Persistence       | ⏸ Not started  | —         | —                                                                                                                   |
| P6 — API Server        | ⏸ Not started  | —         | —                                                                                                                   |
| P7 — Web UI            | ⏸ Not started  | —         | —                                                                                                                   |
| P8 — Reporting         | ⏸ Not started  | —         | —                                                                                                                   |
| P9 — CI Integrations   | ⏸ Not started  | —         | —                                                                                                                   |
| P10 — LSP + IDE        | ⏸ Not started  | —         | —                                                                                                                   |
| P11 — Hardening & GA   | ⏸ Not started  | —         | —                                                                                                                   |

**Status legend:** ⏸ not started · 🟡 in progress · ✅ complete · 🔴 blocked

---

## Recently Completed (last 10 tasks)

| Task ID | Title                                                              | Completed  | PR                                                               | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-01   | Core domain entities (`@argus/core`)                               | 2026-07-05 | [argus-oss#10](https://github.com/WeaversMask/argus-oss/pull/10) | First real source package. Full domain model — Scan (discriminated union: queued/running/completed/failed; transitions take narrow member types → wrong-status moves are compile errors), Violation/Severity/Position, Rule/RuleId/RuleProfile, Layer/LayerManifest/LayerBoundary, Finding, Project, Suppression, Metrics. Hand-rolled `Brand<T,B>`; factories → `Result<T, ValidationError>` (neverthrow 8.2.0, ADR-0003 dance done: MIT, 16 months old, author verified); all outputs `Object.freeze`d; time injected as branded epoch-ms `Timestamp`. 107 tests, 100% stmt/branch/func/line. Compose/Dockerfile volume lines added per P0-06 pattern; notices → 359 pkgs (license gate 479). Full-packet review done (fresh-context, escalated model): approve-with-nits; nits fixed in-PR, contract questions filed as D-2/D-3/D-4 |
| P0-09   | Changesets release workflow — Phase 0 complete                     | 2026-07-05 | [argus-oss#9](https://github.com/WeaversMask/argus-oss/pull/9)   | `@changesets/cli` 2.31.0 exact-pinned (age gate cleared, team verified); `.changeset/config.json` with **access=public** (maintainer registry decision 2026-07-05: npm public); `release.yml` — SHA-pinned actions incl. `changesets/action` v1.9.0 (tag↔SHA verified), Version-PR-or-publish flow, publish = structural **no-op while all packages are private:true**; `NPM_TOKEN` = admin step at first real publish. Interactive-prompt acceptance verified under a pty (🦋 bump-type prompt). License gate green over +145 transitives — first live exercise of the guessed-license path (`spawndamnit` MIT\*); notices → 358 pkgs. **Phase transition executed** (exit criteria verified, phase handover written)                                                                                                                 |
| SEC-02  | PII scrub (history rewrite) + migration to argus-oss               | 2026-07-04 | [argus-oss#8](https://github.com/WeaversMask/argus-oss/pull/8)   | Maintainer-directed: author/committer personal email rewritten to the noreply address across all 68 commits (filter-branch email map; HEAD tree verified byte-identical; API-verified **0 hits** post-force-push). Work **migrated to argus-oss** (this repo — clean history from birth; branch protection + Dependabot replicated at migration); retired `argus` repo stays private/frozen forever (`refs/pull/*` keep pre-scrub SHAs) — go-public = flip **this** repo per [go-public-runbook](./go-public-runbook.md), **voluntary, unscheduled, never agentic** (CLAUDE.md rule). Old repo's 7 Dependabot PRs auto-closed at force-push, re-opened clean here (#1–#7); repo-local git identity = noreply. Backup: `~/argus-pre-scrub-backup.bundle`. Old merge commits show unverified signatures (cosmetic)                       |
| P0-08   | Documentation scaffolding                                          | 2026-07-04 | [#30](https://github.com/WeaversMask/argus/pull/30)              | Root `SECURITY.md` (private vulnerability reporting only, 7-day best-effort ack, no bounty — solo-honest; SECURITY-NOTES §Reporting now links to it); `.github/PULL_REQUEST_TEMPLATE.md` **byte-copied** from templates (diff-verified); issue templates w/ security contact-link to private advisories; ADR-0001 reconciled (real date 2026-05-23, solo decision-maker, stale `pnpm@9.x` note superseded → ADR-0003). **New admin step: enable Private vulnerability reporting** (same bucket as P0-03). Sibling maintenance PR: [#29](https://github.com/WeaversMask/argus/pull/29) notices regen after #25                                                                                                                                                                                                                          |
| P0-06   | Docker development environment                                     | 2026-07-04 | [#28](https://github.com/WeaversMask/argus/pull/28)              | `Dockerfile.dev` (node 22.23.1-bookworm-slim **digest-pinned** = CI `NODE_VERSION`, bump together; corepack pnpm; non-root) + `docker-compose.yml`: app w/ bind mount + named-volume `node_modules` shadowing (host/container platform binaries differ), redis 8.8.0-alpine + postgres 18.4-alpine (digest-pinned, healthchecked, loopback-only ports). Verified live: stack healthy, 9 tests pass in-container, host edit → vitest RERUN; EACCES fix = image pre-creates `node`-owned volume mountpoints. Recipe only, never a published image (ADR-0002 §D)                                                                                                                                                                                                                                                                          |
| P0-13   | CI supply-chain hardening (config-only)                            | 2026-07-04 | [#19](https://github.com/WeaversMask/argus/pull/19)              | Every `uses:` SHA-pinned w/ version comment (resolved from upstream repos, not marketplace); `dependabot.yml` (github-actions + npm, grouped minor/patch, cooldown 3d = `minimumReleaseAge`); CI Node pinned via `NODE_VERSION: "22.23.1"` env (was floating `>=` range via node-version-file); gitleaks tarball SHA-256-verified against release checksums (embedded per-platform; tampered hash → hard exit 1, negative test in PR); `remoteCache.signature: true` (inert until D-1). Closes R-013                                                                                                                                                                                                                                                                                                                                   |
| OPS-02  | Risk-tiered review passes (token-cost reduction)                   | 2026-07-04 | [#18](https://github.com/WeaversMask/argus/pull/18)              | Maintainer-requested after P0-12's ~99k-token review: light tier (bugs-only) for docs/config-only diffs; full packet only for executable-logic/security diffs; standing reviewer brief — diff-scoped, no re-running author-documented verification, budget on untested paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| P0-12   | License-compliance guardrail (SPDX allowlist) in CI + local script | 2026-07-04 | [#17](https://github.com/WeaversMask/argus/pull/17)              | `pnpm license-check` + parallel `license` CI job: license-checker 25.0.1 unioned over every physical `.pnpm` package dir (its read-installed sees only 16/333 packages from the root under pnpm — verified). Fail-closed policy incl. OR/AND expression handling; named exceptions: `lightningcss*` (ADR-0002 §G) + `spdx-exceptions`/`spdx-ranges` (the gate tool's own CC-BY-3.0 SPDX data files — **maintainer sign-off = merging #17**). Notices regenerated (291 pkgs). Negative tests (GPL, new-MPL, OR-expr) documented in PR. Not a required check (admin step pending since P0-03)                                                                                                                                                                                                                                            |
| P0-07   | Lightweight dependency audit in CI                                 | 2026-07-03 | [#16](https://github.com/WeaversMask/argus/pull/16)              | Parallel `audit` job: `pnpm audit --audit-level=high` on PR / push-main / Mondays 12:00 UTC (weekly re-audit of pinned versions). Exit-threshold semantics verified empirically on pnpm 11.5.3 (moderate-and-below never block). Stopgap for the public-advisory subset — P11-02 supersedes; not a required check (admin step pending since P0-03)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| OPS-01  | Node-floor hook guard + onboarding sync step (prevention)          | 2026-07-03 | [#15](https://github.com/WeaversMask/argus/pull/15)              | Pre-commit fails fast with `nvm use` instructions when Node < engines floor (was: cryptic pnpm crash under nvm-default Node 20); protocol onboarding step 1 + CLAUDE.md now say sync `main` before reading tracker/handover (stale-read failures in P0-11 session). Negative test documented in PR; `~/.config/husky/init.sh` added machine-side                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

---

## Open Decisions

> Decisions awaiting a human architect. Agents pick another task while waiting.

| ID  | Question                                                                                                                                                                                                                                                                                             | Raised by       | Raised on  | Options                                                                                                                                                                                                                                                 | Recommendation                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1 | Turbo remote cache: Vercel Remote Cache (hosted) or self-hosted (e.g. `turborepo-remote-cache` OSS)?                                                                                                                                                                                                 | claude-opus-4-7 | 2026-05-25 | (a) Vercel Remote Cache — set `TURBO_TOKEN` + `TURBO_TEAM` secrets and we're done; (b) self-hosted Docker image, more control, no vendor lock-in                                                                                                        | (a) Vercel for speed-to-ship; revisit if free-tier limits bite. P0-05 wires the env vars so flipping the secrets on is the only follow-up.                                                                                              |
| D-2 | Composite factories (`violation`, `finding`, `layerManifest`, `scanResult`) trust embedded components structurally — an unvalidated inline `Position` literal compiles and passes (P1-01 review finding 1, major). Re-validate components inside composite factories, or brand validated composites? | claude-fable-5  | 2026-07-05 | (a) composite factories re-run component validation + deep-freeze — simple, keeps inputs ergonomic, small runtime cost; (b) brand composite types (`Position` etc.) so only their factories can produce them — zero runtime cost, stricter, heavier API | (a) re-validate + deep-freeze: entity construction isn't the hot path (rule dispatch is), and structural inputs keep adapters simple. Must land before P1-03 (tree-sitter is 0-based — exactly the literal-bypass risk).                |
| D-3 | `Position` end-semantics contradict themselves: TSDoc says columns are inclusive AND start==end is "zero-width" (review finding 2). Inclusive or exclusive `endColumn`?                                                                                                                              | claude-fable-5  | 2026-07-05 | (a) 1-based, end-exclusive columns — SARIF-compatible, zero-width representable, `end-start` = length; (b) fully inclusive — matches some linters, but empty ranges unrepresentable                                                                     | (a) end-exclusive; TSDoc-only change today (runtime check already allows start==end), but every adapter (P1-03 tree-sitter, P10 LSP — both end-exclusive) converts against this sentence, so it must be ruled before the model freezes. |
| D-4 | `Suppression` has no project association (review finding 4). Add `projectId` to the entity, or keep suppressions config-file-scoped and let the repository port scope queries?                                                                                                                       | claude-fable-5  | 2026-07-05 | (a) keep entity as-is; `SuppressionRepositoryPort` (P1-02) takes a `ProjectId` query parameter; (b) add `projectId` field to `Suppression` now                                                                                                          | (a) — suppressions live in repo config (`reviewtool.yaml`, P1-05), so the project link is contextual, not intrinsic. Decide before P1-02 externalizes port signatures.                                                                  |

---

## Open Risks

> Currently active risks. Full register at [`risks.md`](./risks.md).

| Risk ID | Description | Impact | Mitigation |
| ------- | ----------- | ------ | ---------- |
| _—_     | _—_         | _—_    | _—_        |

---

## Metrics Snapshot

- **Test coverage:** 100% lines / 100% branches aggregate — `@argus/core` (107 tests) + `@argus/testing` (9 tests)
- **License gate:** 479 third-party packages, 3 named exceptions (as of P1-01; +neverthrow)
- **CI wall time:** ~25s per job, 8 jobs parallel (cold cache)
- **Self-scan results:** _—_
- **CI build time (cold / cached):** _—_

---

## Recent ADRs

See [`adr/`](./adr/) for full list.

- [ADR-0001 — Monorepo with pnpm workspaces + Turborepo](./adr/0001-monorepo-with-pnpm.md) — Accepted; dated & reconciled 2026-07-04 (P0-08)
- [ADR-0002 — Third-party integration & open-source licensing policy](./adr/0002-third-party-integration-and-licensing-policy.md) — Accepted 2026-06-01
- [ADR-0003 — Supply-chain hardening baseline](./adr/0003-supply-chain-hardening-baseline.md) — Accepted 2026-07-02

---

## Notes for Agents

- The phase file at the link above contains every task you need for the current phase. **Do not load other phase files** unless doing explicit cross-phase work.
- If you finish a phase, update the "Current phase" field above and the next picker will load the next phase file.
- For PR template, see [`plan/templates/PR.template.md`](./plan/templates/PR.template.md).
