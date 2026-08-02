# Handover — P0-11 → P0-07

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-03
**Phase:** P0 — Foundation
**Last task completed:** P0-11 — Third-party notices, prerequisites & contributor guardrail

---

## Context

The licensing arc's notices/docs half is done: `THIRD-PARTY-NOTICES` (generated, 246 packages), root README with the "External tools / Prerequisites" section (all six tool licenses re-verified 2026-07-03 via the GitHub API — every one matches ADR-0002), CONTRIBUTING.md guardrails, a licensing principle + per-PR gate, and the phase-04/09/11 contradictions listed in ADR-0002 §Impact are reconciled. What remains of the arc is the enforcement half: **P0-12's SPDX-allowlist gate**, which is specced to sit beside P0-07's CI audit job — so P0-07 goes first.

**Next: P0-07 — Lightweight dependency audit in CI** (XS, ~10 lines of YAML): an `audit` job running `pnpm audit --audit-level=high` on PRs, pushes to `main`, and a weekly cron. Full spec in [phase-00 §P0-07](../plan/phases/phase-00-foundation.md). Then P0-12 closes the arc.

---

## What I Did

- [`scripts/generate-third-party-notices.mjs`](../../scripts/generate-third-party-notices.mjs) (dependency-free, run as `pnpm notices`): per-license inventory with copyright lines extracted from each package's shipped license/notice files; falls back to the author field and explicitly marks the 9 packages whose published artifact carries no notice at all. **Fails the run if an MPL-2.0 package outside the named `lightningcss*` exception appears** — ADR-0002 §G teeth until P0-12's real gate lands.
- `README.md` (new): source-only / not-sold / not-hosted posture; external-tools table separating user-installed subprocess engines (TruffleHog, Semgrep, osv-scanner) from linked MIT libraries (jscpd, Prettier, Tree-sitter); dev setup. `CONTRIBUTING.md` (new): six licensing guardrails + ADR-0003 dependency rules + workflow rules.
- `00-principles.md`: licensing-boundary principle (Architectural section). `quality-gates.md`: per-PR license gate.
- Phase docs reconciled per ADR-0002 §Impact: P4-03 reworded (no bundled Semgrep rule pack → runtime-fetch / BYO / Opengrep / first-party), phase-04 pinning note now distinguishes linked libraries from subprocess-only engines, Docker-publish steps in phase-09 (goal, P9-04, exit criteria) and phase-11 (exit criteria) flagged `TODO(licensing:)` pending the §D redistribution review.
- Tracker: 10/16. SEC-01/#13 and the P0-16/#12 link were already recorded by the SEC-01 session; I trimmed Recently Completed to its promised 10 rows (P0-01 dropped — git history keeps it).

PRs this session: [#14](https://github.com/WeaversMask/argus/pull/14) — this task, open, pending human merge.

---

## What I Did NOT Do (Deferred)

- **P0-07, P0-12, P0-13, P0-06, P0-08, P0-09** — unstarted, in Up Next order.
- **Notices drift-check in CI:** nothing verifies `THIRD-PARTY-NOTICES` matches the tree. Recommend folding a freshness check into P0-12's license job — but read Gotcha #3 (platform variance) before wiring it.
- **Copyright holder string** in `LICENSE` is still the "The Argus Authors" placeholder (maintainer decision, pending since P0-10; `TODO(licensing:)` in ADR-0002).
- **Maintainer decisions still open:** D-1 (remote cache); `nvm alias default 22` (default is still 20 — bit me again, Gotcha #1).

---

## Gotchas & Surprises

1. **Hooks inherit the invoking shell's Node.** A bare `git commit` from a fresh shell (nvm default = 20) dies in pre-commit: pnpm 11 needs Node ≥22.13 (`ERR_UNKNOWN_BUILTIN_MODULE node:sqlite`). Run `nvm use` in the same shell before committing. Root fix is the still-pending `nvm alias default 22`.
2. **pnpm 11 auto-syncs `node_modules` before running package scripts.** The first `pnpm notices` run installed the SEC-01 lockfile changes (+13/−7 packages) before executing the script. Harmless — but don't mistake it for the generator performing installs.
3. **`pnpm licenses list --json` output is platform-dependent.** Shape on pnpm 11 (answers the previous handover's open question): `{ [licenseId]: {name, versions[], paths[], license, author, homepage, description}[] }`. Platform-specific binary packages (`lightningcss-darwin-arm64`) reflect the generating host, so regenerating on Linux CI would diff. Any CI drift check must pin the platform or normalize those entries.
4. **MPL-2.0's verbatim license text contains no copyright line**, so lightningcss ships nothing to extract; the generator marks such packages `(published package carries no copyright line or author field)` so an audit sees due diligence rather than an extraction bug.

---

## State of the System

- ✅ Tests: 9 passing (no source changes this task); lint/format/typecheck enforced green by hooks on every commit
- ✅ Tracker + handover rotated; `.work/P0-11.md` gitignored as intended
- ⏸ PR #14: open, pending human merge
- ⏸ Dogfood scan: N/A until Phase 2

---

## Recommended Next Steps

Pick up **P0-07 — Lightweight dependency audit in CI** (branch from `main` after #14 merges):

1. Read [phase-00 §P0-07](../plan/phases/phase-00-foundation.md) — the spec is complete: parallel `audit` job, `pnpm audit --audit-level=high`, triggers = PR + push to `main` + weekly cron (`0 12 * * 1`), **not** added to required checks (admin step pending since P0-03 — document that in the PR).
2. Mind the serialization note: P0-07 → P0-12 → P0-13 all edit `ci.yml`; land in that order, no parallel lanes.
3. Verify `pnpm audit` behavior on pnpm 11 before writing the YAML (flags/output changed across pnpm majors; check exit codes for the level threshold).
4. Tracker + handover rotation, Sonnet review packet, PR.

Estimated effort: **XS**.

---

## Open Questions for the Next Agent

- Where should the `THIRD-PARTY-NOTICES` freshness check live — P0-12's license job (same tool domain, my recommendation) or P0-07's audit job? Account for Gotcha #3 either way.

---

## Files Touched This Session

```
THIRD-PARTY-NOTICES                               [created — generated]
scripts/generate-third-party-notices.mjs          [created]
package.json                                      [modified — notices script]
README.md                                         [created]
CONTRIBUTING.md                                   [created]
docs/plan/00-principles.md                        [modified — licensing principle]
docs/plan/protocols/quality-gates.md              [modified — per-PR license gate]
docs/plan/phases/phase-04-tool-adapters.md        [modified — P4-03 + pinning note]
docs/plan/phases/phase-09-ci-integrations.md      [modified — TODO(licensing:) flags]
docs/plan/phases/phase-11-hardening.md            [modified — TODO(licensing:) flag]
docs/IMPLEMENTATION.md                            [modified — 10/16, P0-11 row]
docs/HANDOVER.md                                  [rewritten — this file]
docs/handovers/p0-16-lint-staged-handover.md      [created — archive]
.work/P0-11.md                                    [created — gitignored]
```

---

## Sign-off

The licensing arc's notices/docs half is complete and verified against ADR-0002; the tree is green; P0-07 is an XS task with a complete spec waiting.

— claude-fable-5
