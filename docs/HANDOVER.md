# Handover — P0-08 → P0-09

**From:** claude-fable-5
**To:** next picker
**Date:** 2026-07-04
**Phase:** P0 — Foundation
**Last task completed:** P0-08 — Documentation scaffolding

---

## Context

P0-08 shipped as [#30](https://github.com/WeaversMask/argus/pull/30) (docs-only, light-tier review per OPS-02). **Next: P0-09 — Changesets release workflow — the LAST P0 task.** Its spec is two lines in [phase-00 §P0-09](./plan/phases/phase-00-foundation.md); on completion the **phase-transition protocol applies** (exit-criteria check against the phase file, phase-completion handover, tracker phase flip to P1). Also open: sibling maintenance PR [#29](https://github.com/WeaversMask/argus/pull/29) (notices regen after #25) — trivial, merge anytime.

> **Session addendum (2026-07-04, post-P0-08 — SEC-02, [#31](https://github.com/WeaversMask/argus/pull/31)):** the maintainer's personal email was scrubbed from git history — **every commit SHA before `53cd95f` changed** (history rewrite + force-push; stale clones need `git fetch && git reset --hard origin/main`). A clean-history artifact repo **`argus-oss`** exists (private): **agents never push to it, never create public repos, never change visibility** — [go-public-runbook](./go-public-runbook.md) + CLAUDE.md rule. The 7 parked Dependabot PRs were `@dependabot recreate`d onto the new base — **verify a PR's branch actually rebuilt (branch newer than the scrub) before it merges**, or it reintroduces pre-scrub history. #29/#30 are merged; 16 stale merged branches were deleted from origin. Backup: `~/argus-pre-scrub-backup.bundle` (maintainer-owned).

## What I Did

- **Root `SECURITY.md`** — GitHub private vulnerability reporting as the only channel, 7-day best-effort ack, no bounty, coordinated disclosure; routes committed-secret incidents to SECURITY-NOTES §"If You Accidentally Commit a Secret" and supply-chain questions to ADR-0003. **New admin step flagged: enable Private vulnerability reporting in repo settings** (same pending bucket as P0-03 branch protection). SECURITY-NOTES §Reporting now links to the file (was a dangling reference).
- **`.github/PULL_REQUEST_TEMPLATE.md`** — byte-copy of `templates/PR.template.md` (`diff -q` verified; acceptance is a byte-match, keep it that way).
- **Issue templates** — bug_report.md, feature_request.md, config.yml with a security contact-link to private advisories.
- **ADR-0001 reconciled, not rewritten** — it existed since 2026-05-23 with placeholders: real dates set, decision-makers now honest (solo maintainer), stale `pnpm@9.x` pinned-versions note superseded with an ADR-0003 pointer. Tracker's Recent-ADRs line updated from "(pending Phase 0)".
- Fixed a leftover from the Dependabot renumbering: tracker's P0-06 link label said #20 while pointing at pull/28.

## What I Did NOT Do (Deferred)

- **P0-09** — unstarted (see below).
- **Dependabot PRs parked by the maintainer:** #20–24 (action majors — need release-notes review), #26 (@types/node 26 — recommend closing + an `ignore` rule keeping it aligned with `engines.node`), #27 (rimraf 6). All CI-green, all still open.
- **Admin steps outstanding:** branch-protection required checks (P0-03), Private vulnerability reporting toggle (new, P0-08), D-1 remote cache, `LICENSE` copyright placeholder, `nvm alias default 22`.

## Gotchas & Surprises

1. **P0-09 adds a dependency and a workflow** — both hardened paths apply: `@changesets/cli` goes through the ADR-0003 gate (exact pin, ≥3-day age, verify name on npm, `allowBuilds` stays `{}` unless proven needed) and the release workflow's actions must be **SHA-pinned** like ci.yml (P0-13 posture). Publishing needs an `NPM_TOKEN` secret — that's another admin step; the acceptance ("merging a release PR publishes") may only be verifiable up to the publish boundary until the maintainer wires the token. Document honestly, don't fake it.
2. **Changesets on a currently-private-package workspace:** root is `private: true` and `@argus/testing` may be too — decide what `pnpm changeset` should version today; config `ignore`/`privatePackages` choices matter. Record the call in the PR.
3. **PR-template byte-match**: if `templates/PR.template.md` ever changes, `.github/PULL_REQUEST_TEMPLATE.md` must be re-copied — there is no sync check.
4. **P0-06/P0-12/P0-13 gotchas remain live** — archived handovers in `docs/handovers/`.

## State of the System

- ✅ Tests 9 passing (100% line/branch), lint/format green, license-check + audit clean (post-#25 tree)
- ⏸ PRs open: #29 (notices regen, trivial), #30 (this task, light review in PR body); Dependabot #20–24/#26/#27 parked
- ⏸ Dogfood scan: N/A until Phase 2

## Recommended Next Steps

Pick up **P0-09** (branch from `main` after #30 — and ideally #29 — merge):

1. Read [phase-00 §P0-09](./plan/phases/phase-00-foundation.md) and the phase exit criteria at the bottom of the phase file — P0-09's PR should leave the tree ready for the phase flip.
2. `@changesets/cli` through the ADR-0003 dance; `.changeset/config.json`; release workflow SHA-pinned; `pnpm changeset` interactive-prompt acceptance verified locally.
3. On completion: **phase-transition protocol** — exit-criteria verification, phase-completion handover (more comprehensive than a task handover), tracker Current-phase flip to P1, archive phase notes.
4. Full-tier review (workflow + dependency = security-relevant), PR.

## Open Questions for the Next Agent

- Where should releases publish (npm public vs GitHub Packages)? Spec says "npm (or internal registry)" — needs the maintainer's call before the workflow can be finished; raise as an Open Decision if not answered by merge time.

---

## Files Touched This Session

```
SECURITY.md                          [created]                        (P0-08, #30)
.github/PULL_REQUEST_TEMPLATE.md     [created — byte-copy]            (P0-08, #30)
.github/ISSUE_TEMPLATE/{bug_report.md,feature_request.md,config.yml} [created] (P0-08, #30)
docs/adr/0001-monorepo-with-pnpm.md  [reconciled — dates/versions]    (P0-08, #30)
docs/SECURITY-NOTES.md               [modified — §Reporting link]     (P0-08, #30)
docs/IMPLEMENTATION.md               [modified — 15/16, P0-08 row]    (P0-08, #30)
docs/HANDOVER.md                     [rewritten — this file]          (P0-08, #30)
docs/handovers/p0-06-docker-dev-env-handover.md [created — archive]   (P0-08, #30)
THIRD-PARTY-NOTICES                  [regenerated]                    (maintenance, #29)
.work/P0-08.md                       [created — gitignored]
```

## Sign-off

Docs scaffolding complete and acceptance-verified (byte-match diffed, dangling reference resolved, ADR-0001 honest). One task left in Phase 0 — the next session closes the phase.

— claude-fable-5
