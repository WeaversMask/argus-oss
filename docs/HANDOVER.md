# Handover — P0-15 → P0-14

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-06-12
**Phase:** P0 — Foundation
**Last task completed:** P0-15 — Agent workflow codification (CLAUDE.md + protocol amendments)

---

## Context

This session ran the **supply-chain & workflow hardening arc**: a security/workflow review (maintainer-commissioned), the **B0 plan insertion** (tasks P0-13..P0-16, risks R-012/R-013, resequenced Up Next — PR #8), and **P0-15** (this handover's task). The backlog was deliberately resequenced: **P0-14 must merge before any task that adds a dependency** (P0-16, P0-12, P0-09), because pnpm 9 resolves brand-new registry versions with no age gate and runs their install scripts. The licensing arc (P0-11 → P0-12) is paused, **not** abandoned — its full context is archived at [`handovers/p0-10-license-policy-handover.md`](./handovers/p0-10-license-policy-handover.md); the P0-11 picker must read that plus ADR-0002.

There is an open **4-PR stack**, merge bottom-up: [#6](https://github.com/WeaversMask/argus/pull/6) (P0-07 plan) → [#7](https://github.com/WeaversMask/argus/pull/7) (P0-10 licensing) → [#8](https://github.com/WeaversMask/argus/pull/8) (B0 insertion) → #9 (P0-15, this task). CI only triggers on PRs whose base is `main`, so upper PRs show no checks until they retarget after the one below merges (delete each branch on merge; GitHub retargets automatically).

---

## What I Did

- **B0 / PR #8:** specs for P0-13..P0-16 in phase-00; Up Next resequenced; R-012/R-013; SECURITY.md folded into P0-08; exit criteria 12 → 16 tasks.
- **P0-15 / PR #9:** root `CLAUDE.md` (auto-loaded: onboarding pointer, 50%/70% context stop-condition, permission-prompt description policy condensed, evergreen gotchas); `agentic-execution.md` gains §Permission-Prompt Descriptions (full maintainer-approved wording), §Parallel Lanes, branch-from-`main` + plan-lands-first rules, reviewer-step checklist item, handover ~100-line budget; `quality-gates.md` gains the Open-Decisions per-PR gate.
- Pushed all stack branches; opened PRs #6/#7/#8 (previously blocked on the now-stale "gh auth broken" belief).

---

## What I Did NOT Do (Deferred)

- **P0-14 (next task) — nothing started.** Spec in [`phase-00-foundation.md`](./plan/phases/phase-00-foundation.md) §[P0-14].
- **P0-16, P0-13 — nothing started.** P0-16 hard-depends on P0-14.
- **Track A (maintainer-only, still pending):** merge the stack in order; **enable branch protection** (highest-leverage single action, now urgent since agents can push); decide D-1 (remote cache); copyright/identity decision before the repo goes public (mixed real-name/pseudonym author identities exist in git history); optionally narrow the local `Bash(gh pr *)` allowlist to create/view/diff/status.
- **Doc compaction** (IMPLEMENTATION notes, completed-task specs) — deliberately deferred to the Phase-0 exit review per B0.

---

## Gotchas & Surprises

1. **gh auth WORKS.** The "auth broken, human must push" gotcha repeated in the last three handovers is stale — git SSH push and `gh pr create` both verified 2026-06-12. Agents push branches and open PRs; **merging remains human-only**.
2. **Stack topology.** Do not base new work on `main` until the stack merges — tracker files (IMPLEMENTATION.md, phase-00) differ. Prefer waiting for the merge over deepening the stack past #9.
3. **Prettier table dance still applies** until P0-16 lands: `pnpm exec prettier --write <files>` before staging.
4. **pnpm 11 renamed the script-blocking setting:** `onlyBuiltDependencies` → `allowBuilds`, and settings moved to `pnpm-workspace.yaml` (pnpm 11 no longer reads the `pnpm` field of package.json). The P0-14 spec already says this — don't copy pre-11 blog snippets.
5. **CLAUDE.md now exists** — it is auto-loaded into every future session. If you change workflow rules, change them there AND in the protocol file; they must not drift apart.

---

## State of the System

- ✅ Tests: 9 passing (unchanged — no source code touched; docs-only session)
- ✅ Hooks green on every commit (ESLint, Prettier, gitleaks, commitlint)
- ⏸ CI: pending on #6 (base=main); upper stack gets CI as it retargets
- ⏸ Branch protection: still not enabled (Track A)
- ⏸ Dogfood scan: N/A until Phase 2

---

## Recommended Next Steps

Pick up **P0-14 — pnpm 11 upgrade, minimum release age & install-script blocking** (deps: none, but see Gotcha 2 — wait for the stack to merge, then branch from `main`):

1. Read the §[P0-14] spec in [`phase-00-foundation.md`](./plan/phases/phase-00-foundation.md) — it is complete, including acceptance and rollback.
2. Pick the pnpm version: `pnpm view pnpm time --json` → newest 11.x **published ≥3 weeks ago**; check its Node floor against `engines.node` (bump both together if needed, and note P0-13 will pin CI's Node).
3. `packageManager` bump → regenerate lockfile → full local suite.
4. `pnpm-workspace.yaml`: `minimumReleaseAge: 4320`, empty `minimumReleaseAgeExclude`, `allowBuilds` allowlist (likely empty — verify no current dep needs build scripts; root `prepare` is unaffected).
5. Negative test for the PR: attempt to resolve a <3-day-old version, show refusal.
6. New SECURITY-NOTES section (posture + urgent-patch override) + **ADR-0003** (decisions were maintainer-approved 2026-06-12 — see PR #8 body for the summary).
7. Tracker updates, handover rotation (budget ~100 lines), PR with review packet (new checklist item).

Estimated effort: **S**.

---

## Open Questions for the Next Agent

- Should P0-14 pick pnpm 11.x or the newest 10.x LTS if 11.x has a breaking wrinkle (e.g. Node floor)? Spec says 11.x; fall back only with a documented reason.
- `minimumReleaseAgeExclude`: leave empty, or pre-seed `@argus/*` for future self-published packages? (Cosmetic today — workspace deps aren't registry-resolved.)

---

## Files Touched This Session

```
docs/plan/phases/phase-00-foundation.md            [modified — PR #8]
docs/IMPLEMENTATION.md                             [modified — PR #8 + #9]
docs/risks.md                                      [modified — PR #8]
CLAUDE.md                                          [created  — PR #9]
docs/plan/protocols/agentic-execution.md           [modified — PR #9]
docs/plan/protocols/quality-gates.md               [modified — PR #9]
docs/handovers/p0-10-license-policy-handover.md    [created  — archive of prior HANDOVER]
docs/HANDOVER.md                                   [rewritten — this file]
.work/P0-15.md                                     [created  — gitignored]
```

---

## Sign-off

Docs-only session; tree green at every commit. The stack (#6→#9) is ready for maintainer review and merges cleanly bottom-up; P0-14 can start from `main` the moment it lands.

— claude-fable-5
