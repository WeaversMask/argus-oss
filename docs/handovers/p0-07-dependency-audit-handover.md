# Handover — P0-07 → P0-12

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-03
**Phase:** P0 — Foundation
**Last task completed:** P0-07 — Lightweight dependency audit in CI (plus OPS-01 prevention micro-task)

---

## Context

Three PRs landed/opened today: P0-11 (#14, merged — notices/README/CONTRIBUTING/guardrails), OPS-01 (#15 — Node-floor hook guard + onboarding sync step, prevention follow-up the maintainer requested), and P0-07 (#16 — this task: parallel `audit` CI job). **Next: P0-12 — License-compliance guardrail (SPDX allowlist)**, which closes the licensing arc. Its spec says the `license` job sits beside P0-07's `audit` job in `ci.yml` — both P0-12 and P0-13 edit `ci.yml`, so branch only after #15/#16 merge and keep the P0-12 → P0-13 order (serialization note in phase-00).

Locked decisions still binding (P0-10 checkpoint, do not re-litigate): `license-checker` (npm) powers the P0-12 gate; allowlist = MIT, ISC, Apache-2.0, BSD-2/3-Clause, 0BSD, Unlicense, CC0-1.0 **+ BlueOak-1.0.0 + Python-2.0**; MPL-2.0 stays a named, notice-preserved exception (`lightningcss*`) that must trip the gate for anything new. ADR-0002 §G is the spec.

---

## What I Did

- **P0-07** ([#16](https://github.com/WeaversMask/argus/pull/16)): `audit` job in `ci.yml` — `pnpm audit --audit-level=high`, triggers PR + push-main + weekly cron (`0 12 * * 1`), parallel (no critical-path impact), **not** a required check (admin step pending since P0-03, documented in PR). Exit-code semantics verified **empirically** in a scratch probe (lodash 4.17.15: exit 1 at `high`, exit 0 at `critical`) — on pnpm 11 the flag is the exit threshold, so moderate-and-below never block.
- **Schedule design call:** the cron re-runs the _whole_ workflow, not just audit — deliberate (cheap ~20s jobs, weekly green canary on main, no `if:` churn ahead of P0-13's SHA-pinning). `commitlint` already skips non-PR events.
- **OPS-01** ([#15](https://github.com/WeaversMask/argus/pull/15)): pre-commit now fails fast with instructions when Node < `engines.node` floor (was: cryptic `ERR_UNKNOWN_BUILTIN_MODULE node:sqlite` from pnpm 11 under nvm-default Node 20); onboarding step 1 in the protocol + CLAUDE.md clause: **sync `main` before reading tracker/handover**. Machine-side: `~/.config/husky/init.sh` sources nvm + `nvm use --silent` before every hook (bare `git commit` verified working end-to-end; negative test under Node 20 documented in the PR).

---

## What I Did NOT Do (Deferred)

- **P0-12, P0-13, P0-06, P0-08, P0-09** — unstarted, in Up Next order.
- **Notices freshness check:** still recommended for P0-12's license job; mind the platform-variance gotcha in the [archived P0-11 handover](./handovers/p0-11-third-party-notices-handover.md) §Gotcha 3.
- **Maintainer decisions still open:** D-1 (remote cache); `LICENSE` copyright placeholder; `nvm alias default 22` — init.sh + the guard now make it low-urgency for hooks, but bare `pnpm` in fresh shells still needs `nvm use`.

---

## Gotchas & Surprises

1. **pnpm 11 `audit`: `--audit-level` is the exit threshold** (verified, not doc-faith): advisories below the level print but exit 0. A clean tree exits 0 at every level. If you need to re-probe, use a scratch dir with a pinned old dep (lodash 4.17.15) and `pnpm install --lockfile-only` — don't touch the repo tree.
2. **The weekly cron runs every job**, not only audit. If that ever gets noisy, gate non-audit jobs with `if: github.event_name != 'schedule'` — deliberately not done now.
3. **Two PRs may be open simultaneously (#15, #16) with disjoint file sets;** tracker rows for both live in #16 (single-writer rule). If you arrive and either is unmerged: sync/check per the new onboarding step 1 — that's exactly what it's for.
4. **P0-11 session gotchas remain live** (platform-dependent `pnpm licenses list`, MPL text has no © line, pnpm auto-sync before scripts): [archived handover](./handovers/p0-11-third-party-notices-handover.md).

---

## State of the System

- ✅ Tests: 9 passing, 100% line/branch (no source changes); lint/format/typecheck green; hooks enforced per commit
- ✅ `pnpm audit`: clean at all levels on the current tree (post-SEC-01)
- ⏸ PRs #15 (OPS-01) and #16 (P0-07): open, pending human merge; CI expected green on both
- ⏸ Dogfood scan: N/A until Phase 2

---

## Recommended Next Steps

Pick up **P0-12** (branch from `main` **after #15 and #16 merge** — it edits `ci.yml` like P0-07 did):

1. Sync per onboarding step 1, then read [phase-00 §P0-12](./plan/phases/phase-00-foundation.md) and [ADR-0002 §G](./adr/0002-third-party-integration-and-licensing-policy.md).
2. Add `license-checker` as devDependency: exact-pin, **verify the package name against npm** (typosquats) and pick a version ≥3 days old (ADR-0003 gate); `allowBuilds` stays `{}` unless it genuinely needs a build (it shouldn't).
3. `scripts/check-licenses` + `pnpm license-check`; new parallel `license` job beside `audit` in `ci.yml`; not a required check (document, same as P0-07).
4. Acceptance: current tree passes (allowlist + `lightningcss*` MPL exception); an out-of-allowlist license fails the check (negative test — document it in the PR).
5. Consider folding the `THIRD-PARTY-NOTICES` freshness check into the same job (platform caveat above).
6. Tracker + handover rotation, Sonnet review packet, PR.

Estimated effort: **S**.

---

## Open Questions for the Next Agent

- `license-checker` handles SPDX _expressions_ (e.g. `MIT OR Apache-2.0`) differently across forks (`license-checker` vs `license-checker-rseidelsohn`) — the locked decision says "license-checker (npm)"; verify which binary the maintainer meant if the plain one chokes on expressions, and record the call in the PR.

---

## Files Touched This Session

```
.github/workflows/ci.yml                          [modified — schedule + audit job]  (P0-07, #16)
.husky/pre-commit                                 [modified — Node floor guard]      (OPS-01, #15)
docs/plan/protocols/agentic-execution.md          [modified — onboarding step 1]     (OPS-01, #15)
CLAUDE.md                                         [modified — sync-first clause]     (OPS-01, #15)
docs/IMPLEMENTATION.md                            [modified — 11/16, P0-07+OPS-01]   (P0-07, #16)
docs/HANDOVER.md                                  [rewritten — this file]            (P0-07, #16)
docs/handovers/p0-11-third-party-notices-handover.md [created — archive]             (P0-07, #16)
.work/P0-07.md, .work/OPS-01.md                   [created — gitignored]
~/.config/husky/init.sh                           [created — machine config, not committed]
```

---

## Sign-off

Audit gate live and empirically verified; both prevention layers tested end-to-end (bare commit passes, Node-20 commit blocked with instructions); tree green; P0-12 has its recipe and both blockers listed.

— claude-fable-5
